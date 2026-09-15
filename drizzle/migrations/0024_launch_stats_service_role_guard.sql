CREATE OR REPLACE FUNCTION public.admin_launch_stats_is_authorised()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_user = 'service_role'
      OR coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), '') = 'service_role'
      OR coalesce(nullif(current_setting('role', true), ''), '') = 'service_role'
      OR coalesce((auth.jwt() ->> 'role'), '') = 'service_role'
      OR public.has_role(auth.uid(), 'admin');
$$;

REVOKE ALL ON FUNCTION public.admin_launch_stats_is_authorised() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_launch_stats_is_authorised() TO authenticated, service_role;