
-- =====================================================================
-- MIRROR EXCHANGE STAGE 1 - CORRECTION PASS
-- =====================================================================

-- 1. Evidence uniqueness ------------------------------------------------
-- Clean any pre-existing duplicates defensively before adding unique index.
DELETE FROM public.mirror_agreement_acceptances a
  USING public.mirror_agreement_acceptances b
  WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.version_id = b.version_id;
DELETE FROM public.mirror_orientation_completions a
  USING public.mirror_orientation_completions b
  WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.version_id = b.version_id;
DELETE FROM public.mirror_adult_attestations a
  USING public.mirror_adult_attestations b
  WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.version_id = b.version_id;

ALTER TABLE public.mirror_agreement_acceptances
  ADD CONSTRAINT mirror_agreement_acceptances_user_version_key
  UNIQUE (user_id, version_id);
ALTER TABLE public.mirror_orientation_completions
  ADD CONSTRAINT mirror_orientation_completions_user_version_key
  UNIQUE (user_id, version_id);
ALTER TABLE public.mirror_adult_attestations
  ADD CONSTRAINT mirror_adult_attestations_user_version_key
  UNIQUE (user_id, version_id);

-- 2. Idempotent evidence RPCs (ON CONFLICT DO NOTHING) -----------------
CREATE OR REPLACE FUNCTION public.mirror_accept_agreement()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE _uid UUID := auth.uid(); _vid UUID; _id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.has_full_temple_access(_uid) THEN RAISE EXCEPTION 'not eligible'; END IF;
  SELECT id INTO _vid FROM public.mirror_agreement_versions WHERE is_current = true LIMIT 1;
  IF _vid IS NULL THEN RAISE EXCEPTION 'no current agreement version'; END IF;
  INSERT INTO public.mirror_agreement_acceptances (user_id, version_id)
    VALUES (_uid, _vid)
    ON CONFLICT (user_id, version_id) DO NOTHING
    RETURNING id INTO _id;
  IF _id IS NULL THEN
    SELECT id INTO _id FROM public.mirror_agreement_acceptances
      WHERE user_id = _uid AND version_id = _vid;
  END IF;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_complete_orientation()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE _uid UUID := auth.uid(); _vid UUID; _id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.has_full_temple_access(_uid) THEN RAISE EXCEPTION 'not eligible'; END IF;
  SELECT id INTO _vid FROM public.mirror_orientation_versions WHERE is_current = true LIMIT 1;
  IF _vid IS NULL THEN RAISE EXCEPTION 'no current orientation version'; END IF;
  INSERT INTO public.mirror_orientation_completions (user_id, version_id)
    VALUES (_uid, _vid)
    ON CONFLICT (user_id, version_id) DO NOTHING
    RETURNING id INTO _id;
  IF _id IS NULL THEN
    SELECT id INTO _id FROM public.mirror_orientation_completions
      WHERE user_id = _uid AND version_id = _vid;
  END IF;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_record_attestation()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE _uid UUID := auth.uid(); _vid UUID; _id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.has_full_temple_access(_uid) THEN RAISE EXCEPTION 'not eligible'; END IF;
  SELECT id INTO _vid FROM public.mirror_adult_attestation_versions WHERE is_current = true LIMIT 1;
  IF _vid IS NULL THEN RAISE EXCEPTION 'no current attestation version'; END IF;
  INSERT INTO public.mirror_adult_attestations (user_id, version_id)
    VALUES (_uid, _vid)
    ON CONFLICT (user_id, version_id) DO NOTHING
    RETURNING id INTO _id;
  IF _id IS NULL THEN
    SELECT id INTO _id FROM public.mirror_adult_attestations
      WHERE user_id = _uid AND version_id = _vid;
  END IF;
  RETURN _id;
END $$;

-- 3. Secured self-service profile RPC ---------------------------------
CREATE OR REPLACE FUNCTION public.mirror_save_profile(
  _display_name TEXT,
  _timezone TEXT,
  _pronouns TEXT DEFAULT NULL,
  _country TEXT DEFAULT NULL,
  _region TEXT DEFAULT NULL,
  _town TEXT DEFAULT NULL,
  _languages TEXT[] DEFAULT '{}',
  _intro TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  _uid UUID := auth.uid();
  _dn TEXT;
  _tz TEXT;
  _langs TEXT[];
  _lang TEXT;
  _id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.has_full_temple_access(_uid) THEN
    RAISE EXCEPTION 'not eligible';
  END IF;

  -- display name
  _dn := btrim(coalesce(_display_name, ''));
  IF _dn = '' THEN RAISE EXCEPTION 'display_name required'; END IF;
  IF char_length(_dn) > 60 THEN RAISE EXCEPTION 'display_name too long'; END IF;

  -- timezone: validate against IANA catalog
  _tz := btrim(coalesce(_timezone, ''));
  IF _tz = '' THEN RAISE EXCEPTION 'timezone required'; END IF;
  IF char_length(_tz) > 80 THEN RAISE EXCEPTION 'timezone too long'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _tz) THEN
    RAISE EXCEPTION 'invalid timezone';
  END IF;

  -- optional field lengths
  IF _pronouns IS NOT NULL AND char_length(_pronouns) > 40 THEN
    RAISE EXCEPTION 'pronouns too long';
  END IF;
  IF _country IS NOT NULL AND char_length(_country) > 80 THEN
    RAISE EXCEPTION 'country too long';
  END IF;
  IF _region IS NOT NULL AND char_length(_region) > 80 THEN
    RAISE EXCEPTION 'region too long';
  END IF;
  IF _town IS NOT NULL AND char_length(_town) > 80 THEN
    RAISE EXCEPTION 'town too long';
  END IF;
  IF _intro IS NOT NULL AND char_length(_intro) > 600 THEN
    RAISE EXCEPTION 'intro too long';
  END IF;

  -- languages array
  _langs := coalesce(_languages, '{}');
  IF array_length(_langs, 1) IS NOT NULL AND array_length(_langs, 1) > 10 THEN
    RAISE EXCEPTION 'too many languages';
  END IF;
  IF _langs IS NOT NULL THEN
    FOREACH _lang IN ARRAY _langs LOOP
      IF _lang IS NULL OR btrim(_lang) = '' THEN
        RAISE EXCEPTION 'blank language';
      END IF;
      IF char_length(_lang) > 40 THEN
        RAISE EXCEPTION 'language too long';
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.community_profiles (
    user_id, display_name, pronouns, country, region, town, timezone, languages, intro, is_visible
  ) VALUES (
    _uid, _dn,
    NULLIF(btrim(coalesce(_pronouns, '')), ''),
    NULLIF(btrim(coalesce(_country, '')), ''),
    NULLIF(btrim(coalesce(_region, '')), ''),
    NULLIF(btrim(coalesce(_town, '')), ''),
    _tz, _langs,
    NULLIF(btrim(coalesce(_intro, '')), ''),
    false
  )
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        pronouns     = EXCLUDED.pronouns,
        country      = EXCLUDED.country,
        region       = EXCLUDED.region,
        town         = EXCLUDED.town,
        timezone     = EXCLUDED.timezone,
        languages    = EXCLUDED.languages,
        intro        = EXCLUDED.intro,
        is_visible   = false,
        updated_at   = now()
  RETURNING id INTO _id;
  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.mirror_save_profile(text,text,text,text,text,text,text[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mirror_save_profile(text,text,text,text,text,text,text[],text) TO authenticated;

-- 4. Revoke direct write privileges on community_profiles -------------
REVOKE INSERT, UPDATE, DELETE ON public.community_profiles FROM authenticated;

DROP POLICY IF EXISTS "own profile: insert" ON public.community_profiles;
DROP POLICY IF EXISTS "own profile: update" ON public.community_profiles;
-- Retain SELECT policy for owner and admin, so members can read their own
-- profile after the RPC writes it.

-- 5. Repair admin suspension grants -----------------------------------
CREATE OR REPLACE FUNCTION public.mirror_admin_suspend(_user_id UUID, _reason TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE _admin UUID := auth.uid(); _id UUID;
BEGIN
  IF _admin IS NULL OR NOT public.has_role(_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  -- Only insert if no active suspension exists (partial unique index guards)
  IF EXISTS (SELECT 1 FROM public.mirror_suspensions
             WHERE user_id = _user_id AND lifted_at IS NULL) THEN
    SELECT id INTO _id FROM public.mirror_suspensions
      WHERE user_id = _user_id AND lifted_at IS NULL LIMIT 1;
    RETURN _id;
  END IF;
  INSERT INTO public.mirror_suspensions (user_id, reason, created_by)
    VALUES (_user_id, _reason, _admin)
    RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.mirror_admin_lift_suspension(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE _admin UUID := auth.uid();
BEGIN
  IF _admin IS NULL OR NOT public.has_role(_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  UPDATE public.mirror_suspensions
    SET lifted_at = now(), lifted_by = _admin
    WHERE user_id = _user_id AND lifted_at IS NULL;
END $$;

REVOKE ALL ON FUNCTION public.mirror_admin_suspend(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mirror_admin_lift_suspension(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mirror_admin_suspend(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mirror_admin_lift_suspension(uuid) TO authenticated;

-- 6. Harden other Mirror Exchange SECURITY DEFINER functions ----------
ALTER FUNCTION public.mirror_activate_participation() SET search_path = public, pg_temp;
ALTER FUNCTION public.mirror_withdraw_participation() SET search_path = public, pg_temp;
ALTER FUNCTION public.mirror_exchange_ready_self() SET search_path = public, pg_temp;
ALTER FUNCTION public.mirror_current_requirements_met(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public._mirror_blocks_bidirectional(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.mirror_touch_updated_at() SET search_path = public, pg_temp;

-- Restrict trigger function EXECUTE (trigger firing does not require caller EXECUTE)
REVOKE ALL ON FUNCTION public.mirror_touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Keep internal helpers locked down
REVOKE ALL ON FUNCTION public._mirror_blocks_bidirectional(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mirror_current_requirements_met(uuid) FROM PUBLIC, anon, authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
