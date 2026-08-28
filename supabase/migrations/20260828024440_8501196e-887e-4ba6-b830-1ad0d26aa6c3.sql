-- LP-D correction: anon must not execute the new owner-only RPCs, and the
-- superseded living_experiment_update overload must not linger.

DROP FUNCTION IF EXISTS public.living_experiment_update(uuid, integer, text, text, text, uuid);

REVOKE ALL ON FUNCTION public.living_moment_create(timestamptz, text, jsonb, jsonb, jsonb) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.living_moment_get(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.living_moment_update(uuid, integer, text, boolean, timestamptz, jsonb, jsonb, jsonb, boolean) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.living_moments_list(boolean, timestamptz, uuid, integer) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.living_experiment_create(uuid, text, text, text, jsonb, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.living_experiment_update(uuid, integer, text, text, text, uuid, uuid) FROM anon, PUBLIC;

-- Internal helper: callable only by the definer/owner and service_role.
REVOKE ALL ON FUNCTION public.living_moment_payload(uuid) FROM anon, authenticated, PUBLIC;

GRANT EXECUTE ON FUNCTION public.living_moment_create(timestamptz, text, jsonb, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_moment_get(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_moment_update(uuid, integer, text, boolean, timestamptz, jsonb, jsonb, jsonb, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_moments_list(boolean, timestamptz, uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_experiment_create(uuid, text, text, text, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_experiment_update(uuid, integer, text, text, text, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_moment_payload(uuid) TO service_role;
