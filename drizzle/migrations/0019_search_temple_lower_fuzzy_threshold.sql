DO $do$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE proname = 'search_temple' AND pronamespace = 'public'::regnamespace;
  def := replace(def, 's.sc >= 0.35', 's.sc >= 0.30');
  EXECUTE def;
END
$do$;
