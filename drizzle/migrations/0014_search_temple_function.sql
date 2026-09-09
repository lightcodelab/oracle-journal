CREATE OR REPLACE FUNCTION public.search_temple(_q text)
RETURNS TABLE (
  kind text,
  id uuid,
  title text,
  subtitle text,
  deck_id uuid,
  deck_name text,
  card_number integer,
  image_url text,
  door text,
  tags text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH p AS (SELECT '%' || btrim(coalesce(_q, '')) || '%' AS pat, length(btrim(coalesce(_q, ''))) AS len)
  SELECT 'deck'::text,
         d.id,
         d.name,
         d.description,
         d.id,
         d.name,
         NULL::integer,
         d.thumbnail_url,
         'remembrance'::text,
         COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                     FROM deck_tag_assignments dta
                     JOIN course_tags t ON t.id = dta.tag_id
                    WHERE dta.deck_id = d.id), '{}')
    FROM decks d, p
   WHERE p.len >= 2
     AND (d.name ILIKE p.pat
       OR coalesce(d.description, '') ILIKE p.pat
       OR coalesce(d.theme, '') ILIKE p.pat
       OR EXISTS (SELECT 1 FROM deck_tag_assignments dta
                    JOIN course_tags t ON t.id = dta.tag_id
                   WHERE dta.deck_id = d.id AND t.name ILIKE p.pat))
  UNION ALL
  SELECT 'card'::text,
         c.id,
         COALESCE(NULLIF(btrim(c.card_title), ''), 'Card ' || c.card_number),
         left(regexp_replace(coalesce(NULLIF(btrim(c.card_details), ''), ''), '\s+', ' ', 'g'), 200),
         c.deck_id,
         dk.name,
         c.card_number,
         dk.thumbnail_url,
         'remembrance'::text,
         COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                     FROM card_tag_assignments cta
                     JOIN course_tags t ON t.id = cta.tag_id
                    WHERE cta.card_id = c.id), '{}')
    FROM cards c
    JOIN decks dk ON dk.id = c.deck_id, p
   WHERE p.len >= 2
     AND (coalesce(c.card_title, '') ILIKE p.pat
       OR coalesce(c.card_details, '') ILIKE p.pat
       OR coalesce(c.content_sections::text, '') ILIKE p.pat
       OR EXISTS (SELECT 1 FROM card_tag_assignments cta
                    JOIN course_tags t ON t.id = cta.tag_id
                   WHERE cta.card_id = c.id AND t.name ILIKE p.pat))
  UNION ALL
  SELECT 'course'::text,
         co.id,
         co.title,
         co.description,
         NULL::uuid,
         NULL::text,
         NULL::integer,
         co.image_url,
         COALESCE(cc.page, co.door_type),
         COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                     FROM course_tag_assignments a
                     JOIN course_tags t ON t.id = a.tag_id
                    WHERE a.course_id = co.id), '{}')
    FROM courses co
    LEFT JOIN content_categories cc ON cc.id = co.location_id, p
   WHERE p.len >= 2
     AND co.is_published
     AND (co.title ILIKE p.pat
       OR coalesce(co.description, '') ILIKE p.pat
       OR EXISTS (SELECT 1 FROM course_tag_assignments a
                    JOIN course_tags t ON t.id = a.tag_id
                   WHERE a.course_id = co.id AND t.name ILIKE p.pat)
       OR EXISTS (SELECT 1 FROM lessons l
                   WHERE l.course_id = co.id
                     AND (coalesce(l.title, '') ILIKE p.pat
                       OR coalesce(l.description, '') ILIKE p.pat
                       OR coalesce(l.content, '') ILIKE p.pat)))
  LIMIT 300;
$$;

GRANT EXECUTE ON FUNCTION public.search_temple(text) TO anon, authenticated, service_role;