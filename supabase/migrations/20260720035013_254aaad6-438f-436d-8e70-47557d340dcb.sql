
-- ============================================================
-- Phase 1 remediation — additive, non-destructive
-- ============================================================
-- 1) Reset founding window (data)
UPDATE public.app_settings SET value = 'null'::jsonb, updated_at = now()
 WHERE key IN ('founding_beta_starts_at','founding_beta_ends_at');

-- 2) Flip kill switch to legacy semantics
UPDATE public.app_settings SET value = 'false'::jsonb, updated_at = now()
 WHERE key = 'use_new_entitlement_model';

-- 3) Enforce in_grace invariant on entitlements
CREATE OR REPLACE FUNCTION public.entitlements_enforce_grace_invariant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'in_grace' AND NEW.grace_until IS NULL THEN
    RAISE EXCEPTION 'entitlements.status=in_grace requires grace_until (user_id=%)', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS entitlements_grace_invariant ON public.entitlements;
CREATE TRIGGER entitlements_grace_invariant
BEFORE INSERT OR UPDATE ON public.entitlements
FOR EACH ROW EXECUTE FUNCTION public.entitlements_enforce_grace_invariant();

-- 4) Kill switch reader
CREATE OR REPLACE FUNCTION public.use_new_entitlement_model()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (value #>> '{}')::boolean FROM public.app_settings WHERE key = 'use_new_entitlement_model'),
    false
  );
$$;
GRANT EXECUTE ON FUNCTION public.use_new_entitlement_model() TO anon, authenticated, service_role;

-- 5) New-model canonical membership check (hardened in_grace, no bucket-manual expansion)
CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR (
      public.use_new_entitlement_model()
      AND EXISTS (
        SELECT 1 FROM public.entitlements
        WHERE user_id = _user_id
          AND product_kind = 'app_membership'
          AND (
            status = 'active'
            OR (status = 'in_grace' AND grace_until IS NOT NULL AND grace_until > now())
          )
          AND (ends_at IS NULL OR ends_at > now())
      )
    )
    OR (
      NOT public.use_new_entitlement_model()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _user_id
          AND subscription_status IN ('active','trialing')
      )
    );
$$;

-- 6) Restore pre-Phase-1 legacy semantics for wrappers, gated by kill switch
CREATE OR REPLACE FUNCTION public.has_bucket_access(bucket_key_param character varying)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR (
      public.use_new_entitlement_model() AND public.is_active_member(auth.uid())
    )
    OR (
      NOT public.use_new_entitlement_model() AND (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.tier_bucket_access tba ON tba.tier_code = p.member_tier_code
          WHERE p.id = auth.uid()
            AND tba.bucket_key = bucket_key_param
            AND tba.is_granted = true
            AND p.subscription_status IN ('active','trialing')
        )
        OR EXISTS (
          SELECT 1 FROM public.manual_access_grants
          WHERE user_id = auth.uid()
            AND bucket_key = bucket_key_param
            AND starts_at <= now() AND ends_at > now()
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_lesson(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR (
      public.use_new_entitlement_model() AND public.is_active_member(_user_id)
    )
    OR (
      NOT public.use_new_entitlement_model()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _user_id AND subscription_status IN ('active','trialing')
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_lesson_by_door(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR (
      public.use_new_entitlement_model() AND public.is_active_member(_user_id)
    )
    OR (
      NOT public.use_new_entitlement_model() AND (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.courses c ON c.id = _course_id
          JOIN public.tier_bucket_access tba ON tba.tier_code = p.member_tier_code
          WHERE p.id = _user_id
            AND p.subscription_status IN ('active','trialing')
            AND tba.bucket_key = c.door_type
            AND tba.is_granted = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.manual_access_grants mag
          JOIN public.courses c ON c.id = _course_id
          WHERE mag.user_id = _user_id
            AND mag.bucket_key = c.door_type
            AND mag.starts_at <= now() AND mag.ends_at > now()
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_card(_user_id uuid, _deck_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
    OR (
      public.use_new_entitlement_model() AND public.is_active_member(_user_id)
    )
    OR (
      NOT public.use_new_entitlement_model() AND (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = _user_id AND subscription_status IN ('active','trialing')
        )
        OR EXISTS (
          SELECT 1 FROM public.manual_access_grants
          WHERE user_id = _user_id
            AND bucket_key = 'remembrance'
            AND starts_at <= now() AND ends_at > now()
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.has_active_membership(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR (
      public.use_new_entitlement_model() AND public.is_active_member(_user_id)
    )
    OR (
      NOT public.use_new_entitlement_model()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _user_id AND subscription_status IN ('active','trialing')
      )
    );
$$;

-- 7) Canonical foundation: denorm mirror trigger + upsert RPC
-- Recompute mirror from entitlements only (NOT from bucket manual grants).
CREATE OR REPLACE FUNCTION public.recompute_profile_active_member(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active boolean;
  v_since timestamptz;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE user_id = _user_id
      AND product_kind = 'app_membership'
      AND (
        status = 'active'
        OR (status = 'in_grace' AND grace_until IS NOT NULL AND grace_until > now())
      )
      AND (ends_at IS NULL OR ends_at > now())
  ) INTO v_active;

  IF v_active THEN
    SELECT MIN(COALESCE(starts_at, created_at)) INTO v_since
      FROM public.entitlements
     WHERE user_id = _user_id AND product_kind = 'app_membership';
    UPDATE public.profiles
       SET is_active_member = true,
           active_member_since = COALESCE(active_member_since, v_since, now())
     WHERE id = _user_id;
  ELSE
    UPDATE public.profiles
       SET is_active_member = false
     WHERE id = _user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.entitlements_mirror_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_profile_active_member(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_profile_active_member(NEW.user_id);
    IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      PERFORM public.recompute_profile_active_member(OLD.user_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS entitlements_mirror ON public.entitlements;
CREATE TRIGGER entitlements_mirror
AFTER INSERT OR UPDATE OR DELETE ON public.entitlements
FOR EACH ROW EXECUTE FUNCTION public.entitlements_mirror_trigger();

-- Canonical write path (idempotent). Callable by service_role only.
CREATE OR REPLACE FUNCTION public.upsert_entitlement(
  _user_id uuid,
  _source text,
  _source_ref text,
  _product_kind text,
  _status text,
  _starts_at timestamptz,
  _ends_at timestamptz,
  _grace_until timestamptz,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.entitlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.entitlements;
BEGIN
  INSERT INTO public.entitlements
    (user_id, source, source_ref, product_kind, status, starts_at, ends_at, grace_until, metadata)
  VALUES
    (_user_id, _source, _source_ref, COALESCE(_product_kind,'app_membership'),
     _status, _starts_at, _ends_at, _grace_until, COALESCE(_metadata,'{}'::jsonb))
  ON CONFLICT (source, source_ref) DO UPDATE
    SET user_id     = EXCLUDED.user_id,
        product_kind= EXCLUDED.product_kind,
        status      = EXCLUDED.status,
        starts_at   = EXCLUDED.starts_at,
        ends_at     = EXCLUDED.ends_at,
        grace_until = EXCLUDED.grace_until,
        metadata    = public.entitlements.metadata || EXCLUDED.metadata,
        updated_at  = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_entitlement(uuid,text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_entitlement(uuid,text,text,text,text,timestamptz,timestamptz,timestamptz,jsonb) TO service_role;

-- 8) Rebuild profiles.is_active_member mirror to canonical state
UPDATE public.profiles SET is_active_member = false;
UPDATE public.profiles p
   SET is_active_member = true,
       active_member_since = COALESCE(active_member_since, now())
 WHERE EXISTS (
   SELECT 1 FROM public.entitlements e
    WHERE e.user_id = p.id
      AND e.product_kind = 'app_membership'
      AND (
        e.status = 'active'
        OR (e.status = 'in_grace' AND e.grace_until IS NOT NULL AND e.grace_until > now())
      )
      AND (e.ends_at IS NULL OR e.ends_at > now())
 );
