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
  WITH p AS (
    SELECT '%' || btrim(coalesce(_q, '')) || '%' AS pat,
           length(btrim(coalesce(_q, ''))) AS len
  ),
  terms AS (
    -- Meaningful words from the query: lowercase alphanumerics, 3+ chars,
    -- with common filler words removed so "I feel stuck" matches tag "Stuck".
    SELECT w AS term
    FROM regexp_split_to_table(lower(coalesce(_q, '')), '[^a-z0-9]+') AS w
    WHERE length(w) >= 3
      AND w NOT IN (
        'the','and','for','are','was','were','been','being','have','has','had',
        'having','does','doing','did','will','would','shall','should','can','could',
        'may','might','must','not','but','with','from','that','this','these','those',
        'there','here','what','when','where','which','who','whom','why','how','all',
        'any','each','few','more','most','other','some','such','only','own','same',
        'than','too','very','just','about','into','over','under','again','once',
        'out','off','then','now','she','her','him','his','you','your','yours',
        'they','them','their','our','ours','its','itself','myself','yourself',
        'feel','feels','feeling','felt','am','is','im','ive','me','my','it','in',
        'on','of','to','as','at','be','by','do','if','or','so','up','us','we',
        'am','dont','cant','wont','really','like','want','need','get','got','make',
        'seem','seems','because','when','while','always','never','every','thing',
        'something','anything','everything','nothing','much','many','lot','lots'
      )
  ),
  has_terms AS (SELECT EXISTS (SELECT 1 FROM terms) AS ok)
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
     AND (
       d.name ILIKE p.pat
       OR coalesce(d.description, '') ILIKE p.pat
       OR coalesce(d.theme, '') ILIKE p.pat
       OR EXISTS (SELECT 1 FROM deck_tag_assignments dta
                    JOIN course_tags t ON t.id = dta.tag_id
                   WHERE dta.deck_id = d.id AND t.name ILIKE p.pat)
       OR ((SELECT ok FROM has_terms) AND EXISTS (
             SELECT 1 FROM terms tm
             WHERE d.name ILIKE '%' || tm.term || '%'
                OR coalesce(d.description, '') ILIKE '%' || tm.term || '%'
                OR coalesce(d.theme, '') ILIKE '%' || tm.term || '%'
                OR EXISTS (SELECT 1 FROM deck_tag_assignments dta
                             JOIN course_tags t ON t.id = dta.tag_id
                            WHERE dta.deck_id = d.id
                              AND t.name ILIKE '%' || tm.term || '%')))
     )
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
     AND (
       coalesce(c.card_title, '') ILIKE p.pat
       OR coalesce(c.card_details, '') ILIKE p.pat
       OR coalesce(c.content_sections::text, '') ILIKE p.pat
       OR EXISTS (SELECT 1 FROM card_tag_assignments cta
                    JOIN course_tags t ON t.id = cta.tag_id
                   WHERE cta.card_id = c.id AND t.name ILIKE p.pat)
       OR ((SELECT ok FROM has_terms) AND EXISTS (
             SELECT 1 FROM terms tm
             WHERE coalesce(c.card_title, '') ILIKE '%' || tm.term || '%'
                OR coalesce(c.card_details, '') ILIKE '%' || tm.term || '%'
                OR coalesce(c.content_sections::text, '') ILIKE '%' || tm.term || '%'
                OR EXISTS (SELECT 1 FROM card_tag_assignments cta
                             JOIN course_tags t ON t.id = cta.tag_id
                            WHERE cta.card_id = c.id
                              AND t.name ILIKE '%' || tm.term || '%')))
     )
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
     AND (
       co.title ILIKE p.pat
       OR coalesce(co.description, '') ILIKE p.pat
       OR EXISTS (SELECT 1 FROM course_tag_assignments a
                    JOIN course_tags t ON t.id = a.tag_id
                   WHERE a.course_id = co.id AND t.name ILIKE p.pat)
       OR EXISTS (SELECT 1 FROM lessons l
                   WHERE l.course_id = co.id
                     AND (coalesce(l.title, '') ILIKE p.pat
                       OR coalesce(l.description, '') ILIKE p.pat
                       OR coalesce(l.content, '') ILIKE p.pat))
       OR ((SELECT ok FROM has_terms) AND EXISTS (
             SELECT 1 FROM terms tm
             WHERE co.title ILIKE '%' || tm.term || '%'
                OR coalesce(co.description, '') ILIKE '%' || tm.term || '%'
                OR EXISTS (SELECT 1 FROM course_tag_assignments a
                             JOIN course_tags t ON t.id = a.tag_id
                            WHERE a.course_id = co.id
                              AND t.name ILIKE '%' || tm.term || '%')
                OR EXISTS (SELECT 1 FROM lessons l
                            WHERE l.course_id = co.id
                              AND (coalesce(l.title, '') ILIKE '%' || tm.term || '%'
                                OR coalesce(l.description, '') ILIKE '%' || tm.term || '%'
                                OR coalesce(l.content, '') ILIKE '%' || tm.term || '%'))))
     )
  LIMIT 300;
$$;

GRANT EXECUTE ON FUNCTION public.search_temple(text) TO anon, authenticated, service_role;