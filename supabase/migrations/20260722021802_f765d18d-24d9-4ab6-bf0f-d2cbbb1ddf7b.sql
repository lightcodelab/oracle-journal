
-- 1. Retire the kill switch. All downstream logic below no longer references it.
UPDATE public.app_settings SET value = 'null'::jsonb WHERE key = 'use_new_entitlement_model';
DELETE FROM public.app_settings WHERE key = 'use_new_entitlement_model';

-- 2. Canonical is_active_member: admin OR profiles.subscription_status active/trialing
--    OR entitlements ledger active/in_grace. No flag branches. Manual access is a
--    SEPARATE authority (not membership) — recognised by has_full_temple_access below.
CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _user_id AND subscription_status IN ('active','trialing')
    )
    OR EXISTS (
      SELECT 1 FROM public.entitlements
      WHERE user_id = _user_id
        AND product_kind = 'app_membership'
        AND COALESCE(stripe_environment,'live') <> 'test'
        AND (
          status = 'active'
          OR (status = 'in_grace' AND grace_until IS NOT NULL AND grace_until > now())
        )
        AND (ends_at IS NULL OR ends_at > now())
    );
$$;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid) TO anon, authenticated, service_role;

-- 3. Canonical full Temple access: single decision used by RLS wrappers and
--    reachable by application code. Legacy dated grants remain historical but
--    if their [starts_at, ends_at) window is currently active, they must NOT
--    deny access to any Temple area.
CREATE OR REPLACE FUNCTION public.has_full_temple_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _user_id IS NOT NULL
    AND (
      public.is_active_member(_user_id)
      OR EXISTS (
        SELECT 1 FROM public.manual_full_access_grants
        WHERE user_id = _user_id
          AND revoked_at IS NULL
          AND starts_at <= now()
          AND expires_at > now()
      )
      OR EXISTS (
        -- Active dated legacy grants (any former bucket) count as full access.
        SELECT 1 FROM public.manual_access_legacy_bucket_history
        WHERE user_id = _user_id
          AND starts_at <= now()
          AND ends_at > now()
      )
      OR EXISTS (
        -- Any still-live row on the pre-canonical grants table also counts.
        SELECT 1 FROM public.manual_access_grants
        WHERE user_id = _user_id
          AND starts_at <= now()
          AND ends_at > now()
      )
    );
$$;
GRANT EXECUTE ON FUNCTION public.has_full_temple_access(uuid) TO anon, authenticated, service_role;

-- 4. Collapse RLS wrappers onto the canonical rule. No more flag branches,
--    no more per-Door bucket rejection: legacy bucket scope never denies
--    another Temple area for an active dated user.

CREATE OR REPLACE FUNCTION public.has_active_membership(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_full_temple_access(_user_id); $$;
GRANT EXECUTE ON FUNCTION public.has_active_membership(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_view_lesson(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_full_temple_access(_user_id); $$;
GRANT EXECUTE ON FUNCTION public.can_view_lesson(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_view_lesson_by_door(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_full_temple_access(_user_id); $$;
GRANT EXECUTE ON FUNCTION public.can_view_lesson_by_door(uuid, uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_bucket_access(_user_id uuid, _bucket_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_full_temple_access(_user_id); $$;
GRANT EXECUTE ON FUNCTION public.has_bucket_access(uuid, text) TO anon, authenticated, service_role;

-- can_view_card retains its deck-purchase and starter-deck fast paths but the
-- membership branch is now the unified canonical decision.
CREATE OR REPLACE FUNCTION public.can_view_card(_user_id uuid, _deck_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.deck_purchases
      WHERE user_id = _user_id AND deck_id = _deck_id AND verified = true
    )
    OR (_user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.decks WHERE id = _deck_id AND (is_free = true OR is_starter = true)
    ))
    OR public.has_full_temple_access(_user_id);
$$;
GRANT EXECUTE ON FUNCTION public.can_view_card(uuid, uuid) TO anon, authenticated, service_role;

-- 5. get_member_state: preserve identity guard; extend manual_full_access
--    detection so an active dated LEGACY grant surfaces as manual 'active' too.
CREATE OR REPLACE FUNCTION public.get_member_state(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_now timestamptz := now();
  v_state text := 'none';
  v_starts_at timestamptz;
  v_expires_at timestamptz;
  v_r RECORD;
  v_revoked_only boolean;
BEGIN
  IF v_caller IS NULL OR (v_caller <> _user_id AND NOT public.has_role(v_caller, 'admin'::public.app_role)) THEN
    RETURN jsonb_build_object(
      'is_active_member', false,
      'is_founding_member', false,
      'founder_badge', false,
      'founding_price_status', NULL,
      'founding_member_since', NULL,
      'subscription_status', NULL,
      'current_period_end', NULL,
      'is_admin', false,
      'manual_full_access', jsonb_build_object('state','none','starts_at',NULL,'expires_at',NULL),
      'forbidden', true
    );
  END IF;

  -- Active canonical grant
  SELECT starts_at, expires_at INTO v_r
  FROM public.manual_full_access_grants
  WHERE user_id = _user_id AND revoked_at IS NULL
    AND starts_at <= v_now AND expires_at > v_now
  ORDER BY expires_at DESC LIMIT 1;
  IF FOUND THEN
    v_state := 'active'; v_starts_at := v_r.starts_at; v_expires_at := v_r.expires_at;
  ELSE
    -- Active dated LEGACY window (defensive: canonical converted all known users,
    -- but a legacy row must never be denied while its window is live).
    SELECT starts_at, ends_at INTO v_r
    FROM public.manual_access_legacy_bucket_history
    WHERE user_id = _user_id AND starts_at <= v_now AND ends_at > v_now
    ORDER BY ends_at DESC LIMIT 1;
    IF FOUND THEN
      v_state := 'active'; v_starts_at := v_r.starts_at; v_expires_at := v_r.ends_at;
    ELSE
      SELECT starts_at, expires_at INTO v_r
      FROM public.manual_full_access_grants
      WHERE user_id = _user_id AND revoked_at IS NULL AND starts_at > v_now
      ORDER BY starts_at ASC LIMIT 1;
      IF FOUND THEN
        v_state := 'scheduled'; v_starts_at := v_r.starts_at; v_expires_at := v_r.expires_at;
      ELSE
        SELECT starts_at, expires_at INTO v_r
        FROM public.manual_full_access_grants
        WHERE user_id = _user_id AND revoked_at IS NULL AND expires_at <= v_now
        ORDER BY expires_at DESC LIMIT 1;
        IF FOUND THEN
          v_state := 'expired'; v_starts_at := v_r.starts_at; v_expires_at := v_r.expires_at;
        ELSE
          SELECT EXISTS(SELECT 1 FROM public.manual_full_access_grants
                        WHERE user_id = _user_id AND revoked_at IS NOT NULL)
            INTO v_revoked_only;
          IF v_revoked_only THEN v_state := 'revoked_only'; END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_active_member', public.is_active_member(_user_id),
    'is_founding_member', COALESCE(
       (SELECT is_founding_member FROM public.founding_members
         WHERE user_id = _user_id AND stripe_environment = 'live'), false),
    'founder_badge', EXISTS(SELECT 1 FROM public.founding_members
        WHERE user_id = _user_id AND stripe_environment = 'live'),
    'founding_price_status', (SELECT founding_price_eligibility_status FROM public.founding_members
        WHERE user_id = _user_id AND stripe_environment = 'live'),
    'founding_member_since', (SELECT founding_member_since FROM public.founding_members
        WHERE user_id = _user_id AND stripe_environment = 'live'),
    'subscription_status', (SELECT subscription_status FROM public.profiles WHERE id = _user_id),
    'current_period_end', (SELECT current_period_end FROM public.profiles WHERE id = _user_id),
    'is_admin', EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'),
    'manual_full_access', jsonb_build_object('state', v_state, 'starts_at', v_starts_at, 'expires_at', v_expires_at),
    'forbidden', false
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_member_state(uuid) TO authenticated, service_role;

-- 6. Drop obsolete flag-branched test helpers and the flag function itself.
DROP FUNCTION IF EXISTS public._phase1_run_access_tests();
DROP FUNCTION IF EXISTS public._phasec_run_tests();
DROP FUNCTION IF EXISTS public.use_new_entitlement_model();

-- 7. New consolidated policy-verification helper.
CREATE OR REPLACE FUNCTION public._oracle_access_run_tests()
RETURNS TABLE(name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid; v_member uuid; v_manual uuid; v_scheduled uuid;
  v_expired uuid; v_revoked uuid; v_legacy_before uuid; v_legacy_during uuid;
  v_legacy_after uuid; v_nobody uuid;
  v_now timestamptz := now();
BEGIN
  -- Create disposable fixtures inline; roll back at end.
  v_admin        := gen_random_uuid();
  v_member       := gen_random_uuid();
  v_manual       := gen_random_uuid();
  v_scheduled    := gen_random_uuid();
  v_expired      := gen_random_uuid();
  v_revoked      := gen_random_uuid();
  v_legacy_before:= gen_random_uuid();
  v_legacy_during:= gen_random_uuid();
  v_legacy_after := gen_random_uuid();
  v_nobody       := gen_random_uuid();

  -- Fixtures are seeded ONLY in dependent tables that accept arbitrary uuids
  -- without an auth.users row. Test isolates around known rules only.
  INSERT INTO public.user_roles(user_id, role) VALUES (v_admin, 'admin');
  INSERT INTO public.profiles(id, subscription_status) VALUES
    (v_member,'active'),(v_manual,'canceled'),(v_scheduled,'canceled'),
    (v_expired,'canceled'),(v_revoked,'canceled'),
    (v_legacy_before,'canceled'),(v_legacy_during,'canceled'),
    (v_legacy_after,'canceled'),(v_nobody,'canceled');

  INSERT INTO public.manual_full_access_grants(user_id, starts_at, expires_at, granted_by)
    VALUES
      (v_manual,    v_now - interval '1 day', v_now + interval '30 days', v_admin),
      (v_scheduled, v_now + interval '10 days', v_now + interval '40 days', v_admin),
      (v_expired,   v_now - interval '30 days', v_now - interval '1 day', v_admin);
  INSERT INTO public.manual_full_access_grants(user_id, starts_at, expires_at, granted_by, revoked_at, revoked_by)
    VALUES (v_revoked, v_now - interval '10 days', v_now + interval '10 days', v_admin, v_now - interval '1 hour', v_admin);

  INSERT INTO public.manual_access_legacy_bucket_history(user_id, bucket_key, starts_at, ends_at, source)
    VALUES
      (v_legacy_before, 'devotion', v_now + interval '5 days',  v_now + interval '20 days', 'test'),
      (v_legacy_during, 'remembrance', v_now - interval '5 days',  v_now + interval '20 days', 'test'),
      (v_legacy_after,  'communion',   v_now - interval '30 days', v_now - interval '5 days',  'test');

  RETURN QUERY SELECT 'admin_has_full', public.has_full_temple_access(v_admin), 'admin unconditional';
  RETURN QUERY SELECT 'active_member_has_full', public.has_full_temple_access(v_member), 'profile subscription_status=active';
  RETURN QUERY SELECT 'active_manual_has_full', public.has_full_temple_access(v_manual), 'canonical manual active window';
  RETURN QUERY SELECT 'scheduled_denied', NOT public.has_full_temple_access(v_scheduled), 'future canonical grant does not grant early access';
  RETURN QUERY SELECT 'expired_denied', NOT public.has_full_temple_access(v_expired), 'expired canonical grant';
  RETURN QUERY SELECT 'revoked_denied', NOT public.has_full_temple_access(v_revoked), 'revoked-only history';
  RETURN QUERY SELECT 'legacy_before_denied', NOT public.has_full_temple_access(v_legacy_before), 'legacy window has not begun';
  RETURN QUERY SELECT 'legacy_during_has_full', public.has_full_temple_access(v_legacy_during), 'active dated legacy grants full temple';
  RETURN QUERY SELECT 'legacy_after_denied', NOT public.has_full_temple_access(v_legacy_after), 'legacy window closed';
  RETURN QUERY SELECT 'nobody_denied', NOT public.has_full_temple_access(v_nobody), 'no source';
  -- Cross-area proof: legacy grant on "communion" bucket must not deny devotion/remembrance/decks.
  RETURN QUERY SELECT 'legacy_bucket_does_not_deny_other_area',
    public.has_full_temple_access(v_legacy_during) AND public.can_view_lesson(v_legacy_during)
    AND public.has_bucket_access(v_legacy_during,'devotion')
    AND public.has_bucket_access(v_legacy_during,'communion')
    AND public.has_bucket_access(v_legacy_during,'remembrance'),
    'active dated legacy user reaches every Temple area regardless of former bucket';
  -- Wrapper parity across canonical/manual/legacy.
  RETURN QUERY SELECT 'wrapper_parity',
    public.can_view_lesson(v_manual) AND public.can_view_lesson(v_legacy_during)
    AND public.can_view_lesson(v_admin) AND public.can_view_lesson(v_member)
    AND NOT public.can_view_lesson(v_expired) AND NOT public.can_view_lesson(v_revoked)
    AND NOT public.can_view_lesson(v_scheduled) AND NOT public.can_view_lesson(v_nobody),
    'can_view_lesson matches has_full_temple_access for every state';

  -- Cleanup
  DELETE FROM public.manual_access_legacy_bucket_history WHERE user_id IN (v_legacy_before, v_legacy_during, v_legacy_after);
  DELETE FROM public.manual_full_access_grants WHERE user_id IN (v_manual, v_scheduled, v_expired, v_revoked);
  DELETE FROM public.user_roles WHERE user_id = v_admin;
  DELETE FROM public.profiles WHERE id IN (v_member,v_manual,v_scheduled,v_expired,v_revoked,v_legacy_before,v_legacy_during,v_legacy_after,v_nobody);
END;
$$;
REVOKE ALL ON FUNCTION public._oracle_access_run_tests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._oracle_access_run_tests() TO service_role;
