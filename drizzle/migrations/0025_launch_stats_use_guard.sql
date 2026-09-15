DO $mig$
DECLARE
  _def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO _def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_launch_stats';

  _def := replace(
    _def,
    'IF NOT _is_service AND NOT public.has_role(auth.uid(), ''admin'') THEN',
    'IF NOT public.admin_launch_stats_is_authorised() THEN'
  );

  EXECUTE _def;
END
$mig$;