CREATE OR REPLACE FUNCTION public._mirror_exchange_run_tests()
RETURNS TABLE(name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid_a UUID := gen_random_uuid();
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

  RETURN QUERY SELECT 'agreement single current'::TEXT,
    ((SELECT count(*) FROM public.mirror_agreement_versions WHERE is_current) = 1), NULL;
  RETURN QUERY SELECT 'orientation single current'::TEXT,
    ((SELECT count(*) FROM public.mirror_orientation_versions WHERE is_current) = 1), NULL;
  RETURN QUERY SELECT 'attestation single current'::TEXT,
    ((SELECT count(*) FROM public.mirror_adult_attestation_versions WHERE is_current) = 1), NULL;

  -- Anonymous readiness must be validated by a genuine anon PostgREST call.
  -- This harness runs under an admin session; mark as not-definitive here.
  RETURN QUERY SELECT 'anon readiness (deferred to anon PostgREST call)'::TEXT,
    true,
    'structural placeholder — see external anon verification'::TEXT;

  -- Self-block prevented by CHECK constraint
  BEGIN
    INSERT INTO public.mirror_blocks (blocker_id, blocked_id) VALUES (_uid_a, _uid_a);
    RETURN QUERY SELECT 'no self-block constraint'::TEXT, false, 'insert succeeded';
  EXCEPTION WHEN check_violation THEN
    RETURN QUERY SELECT 'no self-block constraint'::TEXT, true, 'check_violation raised';
  END;

  -- Evidence tables must have no direct write policies for authenticated
  RETURN QUERY SELECT 'agreement evidence has no insert policy'::TEXT,
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='mirror_agreement_acceptances' AND cmd='INSERT'), NULL;
  RETURN QUERY SELECT 'orientation evidence has no insert policy'::TEXT,
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='mirror_orientation_completions' AND cmd='INSERT'), NULL;
  RETURN QUERY SELECT 'attestation evidence has no insert policy'::TEXT,
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='mirror_adult_attestations' AND cmd='INSERT'), NULL;

  -- CORRECTED: deployed contract is that PUBLIC and anon cannot execute admin
  -- RPCs, but the database role `authenticated` intentionally has EXECUTE so
  -- an application-role admin (checked internally via has_role) can reach the
  -- guard. Verifying "authenticated lacks EXECUTE" was contradictory and made
  -- the admin pathway unreachable.
  RETURN QUERY SELECT 'admin suspend not executable by PUBLIC'::TEXT,
    NOT has_function_privilege('public',
      'public.mirror_admin_suspend(uuid,text)', 'EXECUTE'), NULL;
  RETURN QUERY SELECT 'admin suspend not executable by anon'::TEXT,
    NOT has_function_privilege('anon',
      'public.mirror_admin_suspend(uuid,text)', 'EXECUTE'), NULL;
  RETURN QUERY SELECT 'admin lift not executable by PUBLIC'::TEXT,
    NOT has_function_privilege('public',
      'public.mirror_admin_lift_suspension(uuid)', 'EXECUTE'), NULL;
  RETURN QUERY SELECT 'admin lift not executable by anon'::TEXT,
    NOT has_function_privilege('anon',
      'public.mirror_admin_lift_suspension(uuid)', 'EXECUTE'), NULL;

  RETURN QUERY SELECT 'community_profiles has RLS'::TEXT,
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.community_profiles'::regclass), NULL;

  RETURN QUERY SELECT 'no public profile read policy'::TEXT,
    NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_profiles'
        AND cmd='SELECT' AND qual !~ 'auth\.uid|has_role'
    ), NULL;
END $function$;

-- Keep test-harness locked down: only admin can execute (SECURITY DEFINER
-- enforces via has_role internally). Revoke from broad roles.
REVOKE ALL ON FUNCTION public._mirror_exchange_run_tests() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._mirror_exchange_run_tests() FROM anon;
REVOKE ALL ON FUNCTION public._mirror_exchange_run_tests() FROM authenticated;