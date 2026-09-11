CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_decks_name_trgm ON decks USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_decks_description_trgm ON decks USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cards_title_trgm ON cards USING GIN (card_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cards_details_trgm ON cards USING GIN (card_details gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_courses_title_trgm ON courses USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_courses_description_trgm ON courses USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lessons_title_trgm ON lessons USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lessons_description_trgm ON lessons USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_course_tags_name_trgm ON course_tags USING GIN (name gin_trgm_ops);

DROP FUNCTION IF EXISTS public.search_temple(text);

CREATE FUNCTION public.search_temple(_q text)
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
  tags text[],
  score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    patterns AS (
      SELECT '%' || btrim(coalesce(_q, '')) || '%' AS pat,
             btrim(coalesce(_q, '')) AS exact_q
    )
  SELECT * FROM (
    SELECT 'deck'::text AS kind,
           d.id AS id,
           d.name AS title,
           d.description AS subtitle,
           d.id AS deck_id,
           d.name AS deck_name,
           NULL::integer AS card_number,
           d.thumbnail_url AS image_url,
           'remembrance'::text AS door,
           COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                       FROM deck_tag_assignments dta
                       JOIN course_tags t ON t.id = dta.tag_id
                      WHERE dta.deck_id = d.id), '{}') AS tags,
           100.0::real AS score
      FROM decks d, patterns p
     WHERE length(p.exact_q) >= 2
       AND (d.name ILIKE p.pat
         OR coalesce(d.description, '') ILIKE p.pat
         OR coalesce(d.theme, '') ILIKE p.pat
         OR EXISTS (SELECT 1 FROM deck_tag_assignments dta
                      JOIN course_tags t ON t.id = dta.tag_id
                     WHERE dta.deck_id = d.id AND t.name ILIKE p.pat))
     UNION ALL
    SELECT 'card'::text AS kind,
           c.id AS id,
           COALESCE(NULLIF(btrim(c.card_title), ''), 'Card ' || c.card_number) AS title,
           left(regexp_replace(coalesce(NULLIF(btrim(c.card_details), ''), ''), '\s+', ' ', 'g'), 200) AS subtitle,
           c.deck_id AS deck_id,
           dk.name AS deck_name,
           c.card_number AS card_number,
           dk.thumbnail_url AS image_url,
           'remembrance'::text AS door,
           COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                       FROM card_tag_assignments cta
                       JOIN course_tags t ON t.id = cta.tag_id
                      WHERE cta.card_id = c.id), '{}') AS tags,
           90.0::real AS score
      FROM cards c
      JOIN decks dk ON dk.id = c.deck_id, patterns p
     WHERE length(p.exact_q) >= 2
       AND (coalesce(c.card_title, '') ILIKE p.pat
         OR coalesce(c.card_details, '') ILIKE p.pat
         OR coalesce(c.content_sections::text, '') ILIKE p.pat
         OR EXISTS (SELECT 1 FROM card_tag_assignments cta
                      JOIN course_tags t ON t.id = cta.tag_id
                     WHERE cta.card_id = c.id AND t.name ILIKE p.pat))
     UNION ALL
    SELECT 'course'::text AS kind,
           co.id AS id,
           co.title AS title,
           co.description AS subtitle,
           NULL::uuid AS deck_id,
           NULL::text AS deck_name,
           NULL::integer AS card_number,
           co.image_url AS image_url,
           COALESCE(cc.page, co.door_type) AS door,
           COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                       FROM course_tag_assignments a
                       JOIN course_tags t ON t.id = a.tag_id
                      WHERE a.course_id = co.id), '{}') AS tags,
           80.0::real AS score
      FROM courses co
      LEFT JOIN content_categories cc ON cc.id = co.location_id, patterns p
     WHERE length(p.exact_q) >= 2
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
     UNION ALL
    SELECT 'deck'::text AS kind,
           d.id AS id,
           d.name AS title,
           d.description AS subtitle,
           d.id AS deck_id,
           d.name AS deck_name,
           NULL::integer AS card_number,
           d.thumbnail_url AS image_url,
           'remembrance'::text AS door,
           COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                       FROM deck_tag_assignments dta
                       JOIN course_tags t ON t.id = dta.tag_id
                      WHERE dta.deck_id = d.id), '{}') AS tags,
           greatest(similarity(lower(d.name), lower(p.exact_q)),
                    similarity(lower(coalesce(d.description, '')), lower(p.exact_q)),
                    (SELECT max(similarity(lower(t.name), lower(p.exact_q)))
                       FROM deck_tag_assignments dta
                       JOIN course_tags t ON t.id = dta.tag_id
                      WHERE dta.deck_id = d.id))::real AS score
      FROM decks d, patterns p
     WHERE length(p.exact_q) >= 3
       AND greatest(similarity(lower(d.name), lower(p.exact_q)),
                    similarity(lower(coalesce(d.description, '')), lower(p.exact_q)),
                    coalesce((SELECT max(similarity(lower(t.name), lower(p.exact_q)))
                                FROM deck_tag_assignments dta
                                JOIN course_tags t ON t.id = dta.tag_id
                               WHERE dta.deck_id = d.id), 0)) >= 0.25
       AND NOT (d.name ILIKE p.pat
                OR coalesce(d.description, '') ILIKE p.pat
                OR coalesce(d.theme, '') ILIKE p.pat
                OR EXISTS (SELECT 1 FROM deck_tag_assignments dta
                             JOIN course_tags t ON t.id = dta.tag_id
                            WHERE dta.deck_id = d.id AND t.name ILIKE p.pat))
     UNION ALL
    SELECT 'card'::text AS kind,
           c.id AS id,
           COALESCE(NULLIF(btrim(c.card_title), ''), 'Card ' || c.card_number) AS title,
           left(regexp_replace(coalesce(NULLIF(btrim(c.card_details), ''), ''), '\s+', ' ', 'g'), 200) AS subtitle,
           c.deck_id AS deck_id,
           dk.name AS deck_name,
           c.card_number AS card_number,
           dk.thumbnail_url AS image_url,
           'remembrance'::text AS door,
           COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                       FROM card_tag_assignments cta
                       JOIN course_tags t ON t.id = cta.tag_id
                      WHERE cta.card_id = c.id), '{}') AS tags,
           greatest(similarity(lower(coalesce(c.card_title, '')), lower(p.exact_q)),
                    similarity(lower(coalesce(c.card_details, '')), lower(p.exact_q)),
                    similarity(lower(coalesce(c.content_sections::text, '')), lower(p.exact_q)),
                    (SELECT max(similarity(lower(t.name), lower(p.exact_q)))
                       FROM card_tag_assignments cta
                       JOIN course_tags t ON t.id = cta.tag_id
                      WHERE cta.card_id = c.id))::real AS score
      FROM cards c
      JOIN decks dk ON dk.id = c.deck_id, patterns p
     WHERE length(p.exact_q) >= 3
       AND greatest(similarity(lower(coalesce(c.card_title, '')), lower(p.exact_q)),
                    similarity(lower(coalesce(c.card_details, '')), lower(p.exact_q)),
                    similarity(lower(coalesce(c.content_sections::text, '')), lower(p.exact_q)),
                    coalesce((SELECT max(similarity(lower(t.name), lower(p.exact_q)))
                                FROM card_tag_assignments cta
                                JOIN course_tags t ON t.id = cta.tag_id
                               WHERE cta.card_id = c.id), 0)) >= 0.25
       AND NOT (coalesce(c.card_title, '') ILIKE p.pat
                OR coalesce(c.card_details, '') ILIKE p.pat
                OR coalesce(c.content_sections::text, '') ILIKE p.pat
                OR EXISTS (SELECT 1 FROM card_tag_assignments cta
                             JOIN course_tags t ON t.id = cta.tag_id
                            WHERE cta.card_id = c.id AND t.name ILIKE p.pat))
     UNION ALL
    SELECT 'course'::text AS kind,
           co.id AS id,
           co.title AS title,
           co.description AS subtitle,
           NULL::uuid AS deck_id,
           NULL::text AS deck_name,
           NULL::integer AS card_number,
           co.image_url AS image_url,
           COALESCE(cc.page, co.door_type) AS door,
           COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                       FROM course_tag_assignments a
                       JOIN course_tags t ON t.id = a.tag_id
                      WHERE a.course_id = co.id), '{}') AS tags,
           greatest(similarity(lower(co.title), lower(p.exact_q)),
                    similarity(lower(coalesce(co.description, '')), lower(p.exact_q)),
                    (SELECT max(similarity(lower(t.name), lower(p.exact_q)))
                       FROM course_tag_assignments a
                       JOIN course_tags t ON t.id = a.tag_id
                      WHERE a.course_id = co.id),
                    (SELECT max(greatest(similarity(lower(coalesce(l.title, '')), lower(p.exact_q)),
                                         similarity(lower(coalesce(l.description, '')), lower(p.exact_q)),
                                         similarity(lower(coalesce(l.content, '')), lower(p.exact_q))))
                       FROM lessons l
                      WHERE l.course_id = co.id))::real AS score
      FROM courses co
      LEFT JOIN content_categories cc ON cc.id = co.location_id, patterns p
     WHERE length(p.exact_q) >= 3
       AND co.is_published
       AND greatest(similarity(lower(co.title), lower(p.exact_q)),
                    similarity(lower(coalesce(co.description, '')), lower(p.exact_q)),
                    coalesce((SELECT max(similarity(lower(t.name), lower(p.exact_q)))
                                FROM course_tag_assignments a
                                JOIN course_tags t ON t.id = a.tag_id
                               WHERE a.course_id = co.id), 0),
                    coalesce((SELECT max(greatest(similarity(lower(coalesce(l.title, '')), lower(p.exact_q)),
                                                similarity(lower(coalesce(l.description, '')), lower(p.exact_q)),
                                                similarity(lower(coalesce(l.content, '')), lower(p.exact_q))))
                                FROM lessons l
                               WHERE l.course_id = co.id), 0)) >= 0.25
       AND NOT (co.title ILIKE p.pat
                OR coalesce(co.description, '') ILIKE p.pat
                OR EXISTS (SELECT 1 FROM course_tag_assignments a
                             JOIN course_tags t ON t.id = a.tag_id
                            WHERE a.course_id = co.id AND t.name ILIKE p.pat)
                OR EXISTS (SELECT 1 FROM lessons l
                            WHERE l.course_id = co.id
                              AND (coalesce(l.title, '') ILIKE p.pat
                                OR coalesce(l.description, '') ILIKE p.pat
                                OR coalesce(l.content, '') ILIKE p.pat)))
  ) results
  ORDER BY results.score DESC
  LIMIT 300;
$$;

GRANT EXECUTE ON FUNCTION public.search_temple(text) TO anon, authenticated, service_role;