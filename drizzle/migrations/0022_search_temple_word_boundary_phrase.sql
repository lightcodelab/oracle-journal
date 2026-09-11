DO $do$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE proname = 'search_temple' AND pronamespace = 'public'::regnamespace;
  -- add a word-boundary regex for the raw phrase to the pats CTE
  def := replace(def,
    'CASE WHEN COALESCE(array_length(w.ws, 1), 0) > 0
                THEN w.ws ELSE ARRAY[lower(w.raw)] END AS fz',
    'CASE WHEN COALESCE(array_length(w.ws, 1), 0) > 0
                THEN w.ws ELSE ARRAY[lower(w.raw)] END AS fz,
           ''\\m'' || regexp_replace(lower(w.raw), ''([^a-z0-9 ])'', ''\\\1'', ''g'') || ''\\M'' AS rp');
  -- replace raw substring ILIKE checks with the word-boundary regex
  def := replace(def, 'ILIKE ''%'' || p.raw || ''%''', '~* p.rp');
  EXECUTE def;
END
$do$;