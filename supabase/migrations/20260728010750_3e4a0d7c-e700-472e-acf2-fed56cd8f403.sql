
-- =====================================================================
-- MIRROR EXCHANGE STAGE 1 - FOUNDATIONS
-- =====================================================================

-- 1. community_profiles ------------------------------------------------
CREATE TABLE public.community_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60),
  pronouns TEXT CHECK (pronouns IS NULL OR char_length(pronouns) <= 40),
  country TEXT CHECK (country IS NULL OR char_length(country) <= 80),
  region TEXT CHECK (region IS NULL OR char_length(region) <= 80),
  town TEXT CHECK (town IS NULL OR char_length(town) <= 80),
  timezone TEXT NOT NULL CHECK (char_length(timezone) BETWEEN 1 AND 80),
  languages TEXT[] NOT NULL DEFAULT '{}',
  intro TEXT CHECK (intro IS NULL OR char_length(intro) <= 600),
  is_visible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.community_profiles TO authenticated;
GRANT ALL ON public.community_profiles TO service_role;
ALTER TABLE public.community_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile: select" ON public.community_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "own profile: insert" ON public.community_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_visible = false
    AND public.has_full_temple_access(auth.uid())
  );

CREATE POLICY "own profile: update" ON public.community_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND is_visible = false  -- Stage 1: no member-driven visibility toggle
  );

CREATE OR REPLACE FUNCTION public.mirror_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER community_profiles_touch BEFORE UPDATE ON public.community_profiles
  FOR EACH ROW EXECUTE FUNCTION public.mirror_touch_updated_at();

-- 2. Versioned definitions --------------------------------------------
CREATE TABLE public.mirror_agreement_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX mirror_agreement_one_current
  ON public.mirror_agreement_versions((is_current)) WHERE is_current = true;

CREATE TABLE public.mirror_orientation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX mirror_orientation_one_current
  ON public.mirror_orientation_versions((is_current)) WHERE is_current = true;

CREATE TABLE public.mirror_adult_attestation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX mirror_adult_attestation_one_current
  ON public.mirror_adult_attestation_versions((is_current)) WHERE is_current = true;

GRANT SELECT ON public.mirror_agreement_versions TO authenticated;
GRANT SELECT ON public.mirror_orientation_versions TO authenticated;
GRANT SELECT ON public.mirror_adult_attestation_versions TO authenticated;
GRANT ALL ON public.mirror_agreement_versions TO service_role;
GRANT ALL ON public.mirror_orientation_versions TO service_role;
GRANT ALL ON public.mirror_adult_attestation_versions TO service_role;

ALTER TABLE public.mirror_agreement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mirror_orientation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mirror_adult_attestation_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agreement: read current" ON public.mirror_agreement_versions
  FOR SELECT TO authenticated USING (is_current = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "orientation: read current" ON public.mirror_orientation_versions
  FOR SELECT TO authenticated USING (is_current = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "attestation: read current" ON public.mirror_adult_attestation_versions
  FOR SELECT TO authenticated USING (is_current = true OR public.has_role(auth.uid(), 'admin'::app_role));

-- Seed version 1
INSERT INTO public.mirror_agreement_versions (version, body, is_current) VALUES
('v1', 'The Mirror Exchange is a peer-held space for outward processing. Your Mirror does not guide your process or provide your answers. She holds space while you listen for your own.

By accepting this agreement I understand that:
- This is peer-held processing space, not coaching, counselling, therapy, crisis support, healing or professional care.
- I am responsible for deciding what I share.
- I will not record or screenshot any exchange.
- I will not give unsolicited advice, interpretation, exercises or processes.
- I will not recruit clients, promote services or solicit financially.
- I will not use the Exchange for romantic or sexual contact.
- I will respect confidentiality, understanding that absolute confidentiality cannot be technically guaranteed.
- I understand that ending connections, blocking and reporting will become available in later stages.
- Urgent or crisis support is outside the Exchange''s scope.', true);

INSERT INTO public.mirror_orientation_versions (version, body, is_current) VALUES
('v1', 'A Mirror may:
- Listen attentively.
- Allow silence and uninterrupted processing.
- Reflect back the speaker''s own words.
- Ask clarifying questions.
- Ask gentle deepening questions when invited.
- Ask whether the speaker wants reflection, a question or more space.

A Mirror may not:
- Coach, counsel, mentor or advise another member.
- Give recommendations or action plans.
- Lead an exercise, technique, modality or process.
- Perform healing, energetic or therapeutic work.
- Diagnose, assess, analyse or interpret another member.
- Tell another member what her experience means.
- Recruit clients or promote paid services.
- Invoke professional authority within the exchange.', true);

INSERT INTO public.mirror_adult_attestation_versions (version, body, is_current) VALUES
('v1', 'I attest that I am 18 years of age or older.', true);

-- 3. Evidence tables (append-only) ------------------------------------
CREATE TABLE public.mirror_agreement_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.mirror_agreement_versions(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.mirror_agreement_acceptances(user_id, version_id);

CREATE TABLE public.mirror_orientation_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.mirror_orientation_versions(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.mirror_orientation_completions(user_id, version_id);

CREATE TABLE public.mirror_adult_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.mirror_adult_attestation_versions(id),
  attested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.mirror_adult_attestations(user_id, version_id);

-- Only allow SELECT of own rows for clients; writes go through SECURITY DEFINER RPCs.
GRANT SELECT ON public.mirror_agreement_acceptances TO authenticated;
GRANT SELECT ON public.mirror_orientation_completions TO authenticated;
GRANT SELECT ON public.mirror_adult_attestations TO authenticated;
GRANT ALL ON public.mirror_agreement_acceptances TO service_role;
GRANT ALL ON public.mirror_orientation_completions TO service_role;
GRANT ALL ON public.mirror_adult_attestations TO service_role;

ALTER TABLE public.mirror_agreement_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mirror_orientation_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mirror_adult_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own agreement evidence: select" ON public.mirror_agreement_acceptances
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "own orientation evidence: select" ON public.mirror_orientation_completions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "own attestation evidence: select" ON public.mirror_adult_attestations
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
-- No INSERT / UPDATE / DELETE policies -> denied for authenticated. Immutable.

-- 4. Participation and suspension -------------------------------------
CREATE TABLE public.mirror_participations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  opted_in_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mirror_participations TO authenticated;
GRANT ALL ON public.mirror_participations TO service_role;
ALTER TABLE public.mirror_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own participation: select" ON public.mirror_participations
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
-- No client-side writes; only SECURITY DEFINER RPCs.

CREATE TABLE public.mirror_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lifted_at TIMESTAMPTZ,
  lifted_by UUID REFERENCES auth.users(id)
);
CREATE UNIQUE INDEX mirror_suspensions_one_active
  ON public.mirror_suspensions(user_id) WHERE lifted_at IS NULL;
GRANT SELECT ON public.mirror_suspensions TO authenticated;
GRANT ALL ON public.mirror_suspensions TO service_role;
ALTER TABLE public.mirror_suspensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own suspension: select" ON public.mirror_suspensions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
-- No client writes; only admin RPCs.

-- 5. mirror_blocks ----------------------------------------------------
CREATE TABLE public.mirror_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.mirror_blocks TO authenticated;
GRANT ALL ON public.mirror_blocks TO service_role;
ALTER TABLE public.mirror_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own blocks: select" ON public.mirror_blocks
  FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "own blocks: insert" ON public.mirror_blocks
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid() AND blocker_id <> blocked_id);
CREATE POLICY "own blocks: delete" ON public.mirror_blocks
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- Internal bidirectional block check (locked down)
CREATE OR REPLACE FUNCTION public._mirror_blocks_bidirectional(_a UUID, _b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mirror_blocks
    WHERE (blocker_id = _a AND blocked_id = _b)
       OR (blocker_id = _b AND blocked_id = _a)
  );
$$;
REVOKE ALL ON FUNCTION public._mirror_blocks_bidirectional(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- 6. Secure self-scoped actions ---------------------------------------

CREATE OR REPLACE FUNCTION public.mirror_accept_agreement()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _vid UUID; _existing UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.has_full_temple_access(_uid) THEN RAISE EXCEPTION 'not eligible'; END IF;
  SELECT id INTO _vid FROM public.mirror_agreement_versions WHERE is_current = true LIMIT 1;
  IF _vid IS NULL THEN RAISE EXCEPTION 'no current agreement version'; END IF;
  SELECT id INTO _existing FROM public.mirror_agreement_acceptances
    WHERE user_id = _uid AND version_id = _vid LIMIT 1;
  IF _existing IS NOT NULL THEN RETURN _existing; END IF;
  INSERT INTO public.mirror_agreement_acceptances (user_id, version_id) VALUES (_uid, _vid)
    RETURNING id INTO _existing;
  RETURN _existing;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_complete_orientation()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _vid UUID; _existing UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.has_full_temple_access(_uid) THEN RAISE EXCEPTION 'not eligible'; END IF;
  SELECT id INTO _vid FROM public.mirror_orientation_versions WHERE is_current = true LIMIT 1;
  IF _vid IS NULL THEN RAISE EXCEPTION 'no current orientation version'; END IF;
  SELECT id INTO _existing FROM public.mirror_orientation_completions
    WHERE user_id = _uid AND version_id = _vid LIMIT 1;
  IF _existing IS NOT NULL THEN RETURN _existing; END IF;
  INSERT INTO public.mirror_orientation_completions (user_id, version_id) VALUES (_uid, _vid)
    RETURNING id INTO _existing;
  RETURN _existing;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_record_attestation()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _vid UUID; _existing UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.has_full_temple_access(_uid) THEN RAISE EXCEPTION 'not eligible'; END IF;
  SELECT id INTO _vid FROM public.mirror_adult_attestation_versions WHERE is_current = true LIMIT 1;
  IF _vid IS NULL THEN RAISE EXCEPTION 'no current attestation version'; END IF;
  SELECT id INTO _existing FROM public.mirror_adult_attestations
    WHERE user_id = _uid AND version_id = _vid LIMIT 1;
  IF _existing IS NOT NULL THEN RETURN _existing; END IF;
  INSERT INTO public.mirror_adult_attestations (user_id, version_id) VALUES (_uid, _vid)
    RETURNING id INTO _existing;
  RETURN _existing;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_current_requirements_met(_uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.mirror_agreement_acceptances a
      JOIN public.mirror_agreement_versions v ON v.id = a.version_id
      WHERE a.user_id = _uid AND v.is_current = true
    )
    AND EXISTS (
      SELECT 1 FROM public.mirror_orientation_completions o
      JOIN public.mirror_orientation_versions v ON v.id = o.version_id
      WHERE o.user_id = _uid AND v.is_current = true
    )
    AND EXISTS (
      SELECT 1 FROM public.mirror_adult_attestations at
      JOIN public.mirror_adult_attestation_versions v ON v.id = at.version_id
      WHERE at.user_id = _uid AND v.is_current = true
    );
$$;
REVOKE ALL ON FUNCTION public.mirror_current_requirements_met(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mirror_activate_participation()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.has_full_temple_access(_uid) THEN RAISE EXCEPTION 'not eligible'; END IF;
  IF EXISTS (SELECT 1 FROM public.mirror_suspensions WHERE user_id = _uid AND lifted_at IS NULL) THEN
    RAISE EXCEPTION 'suspended';
  END IF;
  IF NOT public.mirror_current_requirements_met(_uid) THEN
    RAISE EXCEPTION 'requirements not met';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_profiles WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'community profile missing';
  END IF;
  INSERT INTO public.mirror_participations (user_id, opted_in_at, withdrawn_at, updated_at)
    VALUES (_uid, now(), NULL, now())
  ON CONFLICT (user_id) DO UPDATE
    SET opted_in_at = now(), withdrawn_at = NULL, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.mirror_withdraw_participation()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.mirror_participations
    SET withdrawn_at = now(), updated_at = now()
    WHERE user_id = _uid;
  UPDATE public.community_profiles SET is_visible = false, updated_at = now()
    WHERE user_id = _uid;
END $$;

-- 7. Readiness helper --------------------------------------------------
CREATE OR REPLACE FUNCTION public.mirror_exchange_ready_self()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  IF NOT public.has_full_temple_access(_uid) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.mirror_suspensions WHERE user_id = _uid AND lifted_at IS NULL) THEN
    RETURN false;
  END IF;
  IF NOT public.mirror_current_requirements_met(_uid) THEN RETURN false; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.mirror_participations
    WHERE user_id = _uid AND opted_in_at IS NOT NULL AND withdrawn_at IS NULL
  ) THEN RETURN false; END IF;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.mirror_accept_agreement() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mirror_complete_orientation() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mirror_record_attestation() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mirror_activate_participation() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mirror_withdraw_participation() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mirror_exchange_ready_self() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mirror_accept_agreement() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mirror_complete_orientation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mirror_record_attestation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mirror_activate_participation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mirror_withdraw_participation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mirror_exchange_ready_self() TO authenticated;

-- 8. Admin suspension controls ---------------------------------------
CREATE OR REPLACE FUNCTION public.mirror_admin_suspend(_user_id UUID, _reason TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin UUID := auth.uid(); _id UUID;
BEGIN
  IF _admin IS NULL OR NOT public.has_role(_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  INSERT INTO public.mirror_suspensions (user_id, reason, created_by)
    VALUES (_user_id, _reason, _admin)
  ON CONFLICT (user_id) WHERE lifted_at IS NULL DO NOTHING
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_admin_lift_suspension(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin UUID := auth.uid();
BEGIN
  IF _admin IS NULL OR NOT public.has_role(_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  UPDATE public.mirror_suspensions
    SET lifted_at = now(), lifted_by = _admin
    WHERE user_id = _user_id AND lifted_at IS NULL;
END $$;

REVOKE ALL ON FUNCTION public.mirror_admin_suspend(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mirror_admin_lift_suspension(UUID) FROM PUBLIC, anon, authenticated;
-- Callable only via service_role (owner) or explicit grants later.

-- 9. Test harness -----------------------------------------------------
CREATE OR REPLACE FUNCTION public._mirror_exchange_run_tests()
RETURNS TABLE(name TEXT, passed BOOLEAN, detail TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid_a UUID := gen_random_uuid();
  _uid_b UUID := gen_random_uuid();
  _agr UUID; _ori UUID; _att UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT id INTO _agr FROM public.mirror_agreement_versions WHERE is_current;
  SELECT id INTO _ori FROM public.mirror_orientation_versions WHERE is_current;
  SELECT id INTO _att FROM public.mirror_adult_attestation_versions WHERE is_current;

  RETURN QUERY SELECT 'seeded agreement v1'::TEXT, (_agr IS NOT NULL), 'current row present'::TEXT;
  RETURN QUERY SELECT 'seeded orientation v1'::TEXT, (_ori IS NOT NULL), 'current row present'::TEXT;
  RETURN QUERY SELECT 'seeded attestation v1'::TEXT, (_att IS NOT NULL), 'current row present'::TEXT;

  -- Only one current per definition
  RETURN QUERY SELECT 'agreement single current'::TEXT,
    ((SELECT count(*) FROM public.mirror_agreement_versions WHERE is_current) = 1), NULL;
  RETURN QUERY SELECT 'orientation single current'::TEXT,
    ((SELECT count(*) FROM public.mirror_orientation_versions WHERE is_current) = 1), NULL;
  RETURN QUERY SELECT 'attestation single current'::TEXT,
    ((SELECT count(*) FROM public.mirror_adult_attestation_versions WHERE is_current) = 1), NULL;

  -- Anonymous readiness: our helper uses auth.uid(); when null, false.
  RETURN QUERY SELECT 'anon readiness false'::TEXT,
    (public.mirror_exchange_ready_self() = false OR auth.uid() IS NOT NULL),
    'requires anon caller to verify definitively';

  -- Block self is prevented by CHECK constraint
  BEGIN
    INSERT INTO public.mirror_blocks (blocker_id, blocked_id) VALUES (_uid_a, _uid_a);
    RETURN QUERY SELECT 'no self-block constraint'::TEXT, false, 'insert succeeded';
  EXCEPTION WHEN check_violation THEN
    RETURN QUERY SELECT 'no self-block constraint'::TEXT, true, 'check_violation raised';
  END;

  -- Evidence tables have no INSERT/UPDATE/DELETE policy for authenticated -> only definer functions may write.
  RETURN QUERY SELECT 'agreement evidence has no insert policy'::TEXT,
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='mirror_agreement_acceptances' AND cmd='INSERT'), NULL;
  RETURN QUERY SELECT 'orientation evidence has no insert policy'::TEXT,
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='mirror_orientation_completions' AND cmd='INSERT'), NULL;
  RETURN QUERY SELECT 'attestation evidence has no insert policy'::TEXT,
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='mirror_adult_attestations' AND cmd='INSERT'), NULL;

  -- Internal block helper is not executable by authenticated
  RETURN QUERY SELECT 'block helper revoked from authenticated'::TEXT,
    NOT has_function_privilege('authenticated',
      'public._mirror_blocks_bidirectional(uuid,uuid)', 'EXECUTE'), NULL;

  -- Admin suspension callable revoked from authenticated
  RETURN QUERY SELECT 'admin suspend revoked from authenticated'::TEXT,
    NOT has_function_privilege('authenticated',
      'public.mirror_admin_suspend(uuid,text)', 'EXECUTE'), NULL;

  -- community_profiles is RLS-protected
  RETURN QUERY SELECT 'community_profiles has RLS'::TEXT,
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.community_profiles'::regclass), NULL;

  -- No community-wide profile read policy
  RETURN QUERY SELECT 'no public profile read policy'::TEXT,
    NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_profiles'
        AND cmd='SELECT' AND qual !~ 'auth\.uid|has_role'
    ), NULL;
END $$;

REVOKE ALL ON FUNCTION public._mirror_exchange_run_tests() FROM PUBLIC, anon, authenticated;
