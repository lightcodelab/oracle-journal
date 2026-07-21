
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Legacy history
CREATE TABLE IF NOT EXISTS public.manual_access_legacy_bucket_history (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_grant_id     uuid NOT NULL,
  user_id               uuid NOT NULL,
  bucket_key            text NOT NULL,
  starts_at             timestamptz NOT NULL,
  ends_at               timestamptz NOT NULL,
  granted_by            uuid,
  notes                 text,
  original_created_at   timestamptz NOT NULL,
  archived_at           timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.manual_access_legacy_bucket_history TO authenticated;
GRANT ALL    ON public.manual_access_legacy_bucket_history TO service_role;
ALTER TABLE  public.manual_access_legacy_bucket_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read legacy history"
  ON public.manual_access_legacy_bucket_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.manual_access_legacy_history_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'manual_access_legacy_bucket_history is append-only'; END;
$$;
CREATE TRIGGER trg_manual_access_legacy_history_no_update
  BEFORE UPDATE OR DELETE ON public.manual_access_legacy_bucket_history
  FOR EACH ROW EXECUTE FUNCTION public.manual_access_legacy_history_immutable();

-- Canonical grants
CREATE TABLE IF NOT EXISTS public.manual_full_access_grants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  access_scope  text NOT NULL DEFAULT 'full' CHECK (access_scope = 'full'),
  starts_at     timestamptz NOT NULL,
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz,
  granted_by    uuid,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_full_access_window_valid CHECK (expires_at > starts_at)
);
CREATE INDEX IF NOT EXISTS manual_full_access_grants_user_idx
  ON public.manual_full_access_grants (user_id);
ALTER TABLE public.manual_full_access_grants
  ADD CONSTRAINT manual_full_access_no_overlap
  EXCLUDE USING gist (
    user_id WITH =,
    tstzrange(starts_at, expires_at, '[)') WITH &&
  ) WHERE (revoked_at IS NULL);

GRANT SELECT ON public.manual_full_access_grants TO authenticated;
GRANT ALL    ON public.manual_full_access_grants TO service_role;
ALTER TABLE  public.manual_full_access_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own manual full access"
  ON public.manual_full_access_grants FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins read manual full access"
  ON public.manual_full_access_grants FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.tg_manual_full_access_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_manual_full_access_touch
  BEFORE UPDATE ON public.manual_full_access_grants
  FOR EACH ROW EXECUTE FUNCTION public.tg_manual_full_access_touch();

-- Admin action audit
CREATE TABLE IF NOT EXISTS public.manual_access_grant_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id        uuid NOT NULL,
  user_id         uuid NOT NULL,
  action_type     text NOT NULL CHECK (action_type IN ('create','extend','revoke','convert_legacy')),
  previous_starts_at   timestamptz,
  previous_expires_at  timestamptz,
  previous_revoked_at  timestamptz,
  new_starts_at        timestamptz,
  new_expires_at       timestamptz,
  new_revoked_at       timestamptz,
  actor           uuid,
  acted_at        timestamptz NOT NULL DEFAULT now(),
  notes           text
);
CREATE INDEX IF NOT EXISTS manual_access_grant_audit_grant_idx
  ON public.manual_access_grant_audit (grant_id, acted_at DESC);
GRANT SELECT ON public.manual_access_grant_audit TO authenticated;
GRANT ALL    ON public.manual_access_grant_audit TO service_role;
ALTER TABLE  public.manual_access_grant_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read manual access audit"
  ON public.manual_access_grant_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.manual_access_grant_audit_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'manual_access_grant_audit is append-only'; END;
$$;
CREATE TRIGGER trg_manual_access_grant_audit_no_update
  BEFORE UPDATE OR DELETE ON public.manual_access_grant_audit
  FOR EACH ROW EXECUTE FUNCTION public.manual_access_grant_audit_immutable();

-- Archive legacy rows verbatim
INSERT INTO public.manual_access_legacy_bucket_history
  (original_grant_id, user_id, bucket_key, starts_at, ends_at,
   granted_by, notes, original_created_at)
SELECT g.id, g.user_id, g.bucket_key::text, g.starts_at, g.ends_at,
       g.granted_by, g.notes, g.created_at
FROM public.manual_access_grants g;

-- Consolidate to one canonical row per user
WITH per_user AS (
  SELECT DISTINCT ON (user_id)
         user_id,
         first_value(starts_at) OVER w AS starts_at_pick,
         first_value(ends_at)   OVER w AS ends_at_pick,
         granted_by,
         created_at
  FROM public.manual_access_grants
  WINDOW w AS (PARTITION BY user_id ORDER BY created_at ASC)
),
agg AS (
  SELECT p.user_id,
         MIN(g.starts_at) AS starts_at,
         MAX(g.ends_at)   AS expires_at,
         (SELECT granted_by FROM public.manual_access_grants g2
            WHERE g2.user_id = p.user_id AND g2.granted_by IS NOT NULL
            ORDER BY g2.created_at ASC LIMIT 1) AS granted_by,
         MIN(g.created_at) AS original_created_at,
         string_agg(DISTINCT g.notes, ' | ') FILTER (WHERE g.notes IS NOT NULL) AS notes
  FROM public.manual_access_grants g
  JOIN per_user p ON p.user_id = g.user_id
  GROUP BY p.user_id
),
inserted AS (
  INSERT INTO public.manual_full_access_grants
    (user_id, access_scope, starts_at, expires_at, granted_by, notes, created_at)
  SELECT user_id, 'full', starts_at, expires_at, granted_by, notes, original_created_at
  FROM agg
  RETURNING id, user_id, starts_at, expires_at
)
INSERT INTO public.manual_access_grant_audit
  (grant_id, user_id, action_type, new_starts_at, new_expires_at, actor, notes)
SELECT id, user_id, 'convert_legacy', starts_at, expires_at, NULL,
       'Consolidated from bucket-keyed manual_access_grants'
FROM inserted;

-- Authoritative lookup
CREATE OR REPLACE FUNCTION public.has_active_manual_full_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.manual_full_access_grants
    WHERE user_id = _user_id
      AND revoked_at IS NULL
      AND starts_at <= now()
      AND expires_at > now()
  )
  AND (
    auth.uid() IS NULL
    OR auth.uid() = _user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
$$;
REVOKE ALL ON FUNCTION public.has_active_manual_full_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_manual_full_access(uuid) TO authenticated, service_role;

-- Extended member state
CREATE OR REPLACE FUNCTION public.get_member_state(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_state text := 'none';
  v_starts_at timestamptz;
  v_expires_at timestamptz;
  v_r RECORD;
  v_revoked_only boolean;
BEGIN
  SELECT starts_at, expires_at INTO v_r
  FROM public.manual_full_access_grants
  WHERE user_id = _user_id AND revoked_at IS NULL
    AND starts_at <= v_now AND expires_at > v_now
  ORDER BY expires_at DESC LIMIT 1;
  IF FOUND THEN
    v_state := 'active'; v_starts_at := v_r.starts_at; v_expires_at := v_r.expires_at;
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
    'manual_full_access', jsonb_build_object(
      'state', v_state,
      'starts_at', v_starts_at,
      'expires_at', v_expires_at
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_member_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_state(uuid) TO authenticated, service_role;

-- Admin identity guard
CREATE OR REPLACE FUNCTION public.assert_caller_is_admin()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;
  RETURN v_uid;
END; $$;
REVOKE ALL ON FUNCTION public.assert_caller_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_caller_is_admin() TO authenticated, service_role;

-- Create
CREATE OR REPLACE FUNCTION public.admin_create_manual_full_access(
  _user_id uuid, _starts_at timestamptz, _expires_at timestamptz, _notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := public.assert_caller_is_admin(); v_id uuid; v_conflict boolean;
BEGIN
  IF _expires_at <= _starts_at THEN RAISE EXCEPTION 'expires_at must be strictly after starts_at'; END IF;
  PERFORM 1 FROM public.manual_full_access_grants
    WHERE user_id = _user_id AND revoked_at IS NULL FOR UPDATE;
  SELECT EXISTS(SELECT 1 FROM public.manual_full_access_grants
    WHERE user_id = _user_id AND revoked_at IS NULL
      AND tstzrange(starts_at, expires_at, '[)') && tstzrange(_starts_at, _expires_at, '[)'))
    INTO v_conflict;
  IF v_conflict THEN RAISE EXCEPTION 'Overlapping manual full-access window exists for this user'; END IF;
  INSERT INTO public.manual_full_access_grants (user_id, starts_at, expires_at, granted_by, notes)
    VALUES (_user_id, _starts_at, _expires_at, v_actor, _notes) RETURNING id INTO v_id;
  INSERT INTO public.manual_access_grant_audit
    (grant_id, user_id, action_type, new_starts_at, new_expires_at, actor, notes)
    VALUES (v_id, _user_id, 'create', _starts_at, _expires_at, v_actor, _notes);
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.admin_create_manual_full_access(uuid, timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_manual_full_access(uuid, timestamptz, timestamptz, text) TO authenticated, service_role;

-- Extend
CREATE OR REPLACE FUNCTION public.admin_extend_manual_full_access(
  _grant_id uuid, _new_expires_at timestamptz, _notes text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := public.assert_caller_is_admin(); v_row RECORD; v_conflict boolean;
BEGIN
  SELECT * INTO v_row FROM public.manual_full_access_grants WHERE id = _grant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Grant not found'; END IF;
  IF v_row.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Cannot extend a revoked grant'; END IF;
  IF _new_expires_at <= v_row.starts_at THEN RAISE EXCEPTION 'expires_at must be strictly after starts_at'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.manual_full_access_grants
    WHERE user_id = v_row.user_id AND id <> _grant_id AND revoked_at IS NULL
      AND tstzrange(starts_at, expires_at, '[)') && tstzrange(v_row.starts_at, _new_expires_at, '[)'))
    INTO v_conflict;
  IF v_conflict THEN RAISE EXCEPTION 'Overlapping manual full-access window exists for this user'; END IF;
  UPDATE public.manual_full_access_grants
    SET expires_at = _new_expires_at, notes = COALESCE(_notes, notes) WHERE id = _grant_id;
  INSERT INTO public.manual_access_grant_audit
    (grant_id, user_id, action_type, previous_starts_at, previous_expires_at,
     new_starts_at, new_expires_at, actor, notes)
    VALUES (_grant_id, v_row.user_id, 'extend', v_row.starts_at, v_row.expires_at,
      v_row.starts_at, _new_expires_at, v_actor, _notes);
END; $$;
REVOKE ALL ON FUNCTION public.admin_extend_manual_full_access(uuid, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_extend_manual_full_access(uuid, timestamptz, text) TO authenticated, service_role;

-- Revoke
CREATE OR REPLACE FUNCTION public.admin_revoke_manual_full_access(
  _grant_id uuid, _notes text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := public.assert_caller_is_admin(); v_row RECORD; v_when timestamptz := now();
BEGIN
  SELECT * INTO v_row FROM public.manual_full_access_grants WHERE id = _grant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Grant not found'; END IF;
  IF v_row.revoked_at IS NOT NULL THEN RETURN; END IF;
  UPDATE public.manual_full_access_grants SET revoked_at = v_when WHERE id = _grant_id;
  INSERT INTO public.manual_access_grant_audit
    (grant_id, user_id, action_type, previous_starts_at, previous_expires_at, previous_revoked_at,
     new_starts_at, new_expires_at, new_revoked_at, actor, notes)
    VALUES (_grant_id, v_row.user_id, 'revoke',
      v_row.starts_at, v_row.expires_at, v_row.revoked_at,
      v_row.starts_at, v_row.expires_at, v_when, v_actor, _notes);
END; $$;
REVOKE ALL ON FUNCTION public.admin_revoke_manual_full_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_manual_full_access(uuid, text) TO authenticated, service_role;

-- Deprecate bucket-scoped lookup (now always false)
CREATE OR REPLACE FUNCTION public.has_manual_access(_user_id uuid, _bucket_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT false; $$;
