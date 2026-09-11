CREATE OR REPLACE FUNCTION public.search_temple(_q text)
 RETURNS TABLE(kind text, id uuid, title text, subtitle text, deck_id uuid, deck_name text, card_number integer, image_url text, door text, tags text[], score real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT btrim(coalesce(_q, '')) AS raw
  ),
  words AS (
    SELECT q.raw,
           (SELECT array_agg(DISTINCT s.w)
              FROM (SELECT unnest(regexp_split_to_array(lower(q.raw), '[^a-z0-9]+')) AS w) s
             WHERE length(s.w) >= 3
               AND s.w NOT IN ('the','and','for','with','that','this','was','are','you','your','yours','from','have','has','had','feel','feels','feeling','felt','but','not','all','any','when','what','why','how','can','get','got','just','like','really','very','been','being','about','into','out','over','keep','keeps','kept','always','still','they','them','their','she','her','его','and','who','because','than','then','there','here','some','much','more','most','also','only','even','ever','never','make','makes','made','want','wants','wanted','need','needs','needed')
           ) AS ws
      FROM q
  ),
  pats AS (
    SELECT w.raw,
           COALESCE(w.ws, ARRAY[]::text[]) AS ws,
           (SELECT array_agg('%' || u.x || '%')
              FROM (SELECT unnest(COALESCE(w.ws, ARRAY[]::text[])) AS x
                    UNION SELECT lower(w.raw)) u
             WHERE length(u.x) >= 2) AS pl,
           CASE WHEN COALESCE(array_length(w.ws, 1), 0) > 0
                THEN w.ws ELSE ARRAY[lower(w.raw)] END AS fz
      FROM words w
  )
  SELECT * FROM (
    -- exact / substring / tag matches on any term
    SELECT 'deck'::text AS kind, d.id, d.name AS title, d.description AS subtitle,
           d.id AS deck_id, d.name AS deck_name, NULL::integer AS card_number,
           d.thumbnail_url AS image_url, 'remembrance'::text AS door,
           COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                       FROM deck_tag_assignments dta JOIN course_tags t ON t.id = dta.tag_id
                      WHERE dta.deck_id = d.id), '{}') AS tags,
           100.0::real AS score
      FROM decks d, pats p
     WHERE length(p.raw) >= 2 AND p.pl IS NOT NULL
       AND (d.name ILIKE ANY (p.pl)
         OR coalesce(d.description, '') ILIKE ANY (p.pl)
         OR coalesce(d.theme, '') ILIKE ANY (p.pl)
         OR EXISTS (SELECT 1 FROM deck_tag_assignments dta JOIN course_tags t ON t.id = dta.tag_id
                     WHERE dta.deck_id = d.id AND t.name ILIKE ANY (p.pl)))
     UNION ALL
    SELECT 'card'::text, c.id,
           COALESCE(NULLIF(btrim(c.card_title), ''), 'Card ' || c.card_number),
           left(regexp_replace(coalesce(NULLIF(btrim(c.card_details), ''), ''), '\s+', ' ', 'g'), 200),
           c.deck_id, dk.name, c.card_number, dk.thumbnail_url, 'remembrance'::text,
           COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                       FROM card_tag_assignments cta JOIN course_tags t ON t.id = cta.tag_id
                      WHERE cta.card_id = c.id), '{}'),
           90.0::real
      FROM cards c JOIN decks dk ON dk.id = c.deck_id, pats p
     WHERE length(p.raw) >= 2 AND p.pl IS NOT NULL
       AND (coalesce(c.card_title, '') ILIKE ANY (p.pl)
         OR coalesce(c.card_details, '') ILIKE ANY (p.pl)
         OR coalesce(c.content_sections::text, '') ILIKE ANY (p.pl)
         OR EXISTS (SELECT 1 FROM card_tag_assignments cta JOIN course_tags t ON t.id = cta.tag_id
                     WHERE cta.card_id = c.id AND t.name ILIKE ANY (p.pl)))
     UNION ALL
    SELECT 'course'::text, co.id, co.title, co.description,
           NULL::uuid, NULL::text, NULL::integer, co.image_url,
           COALESCE(cc.page, co.door_type),
           COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                       FROM course_tag_assignments a JOIN course_tags t ON t.id = a.tag_id
                      WHERE a.course_id = co.id), '{}'),
           80.0::real
      FROM courses co
      LEFT JOIN content_categories cc ON cc.id = co.location_id, pats p
     WHERE length(p.raw) >= 2 AND p.pl IS NOT NULL AND co.is_published
       AND (co.title ILIKE ANY (p.pl)
         OR coalesce(co.description, '') ILIKE ANY (p.pl)
         OR EXISTS (SELECT 1 FROM course_tag_assignments a JOIN course_tags t ON t.id = a.tag_id
                     WHERE a.course_id = co.id AND t.name ILIKE ANY (p.pl))
         OR EXISTS (SELECT 1 FROM lessons l WHERE l.course_id = co.id
                      AND (coalesce(l.title, '') ILIKE ANY (p.pl)
                        OR coalesce(l.description, '') ILIKE ANY (p.pl)
                        OR coalesce(l.content, '') ILIKE ANY (p.pl))))
     UNION ALL
    -- fuzzy (typo tolerant) matches per term, excluding rows already matched above
    SELECT 'deck'::text, d.id, d.name, d.description, d.id, d.name, NULL::integer,
           d.thumbnail_url, 'remembrance'::text,
           COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                       FROM deck_tag_assignments dta JOIN course_tags t ON t.id = dta.tag_id
                      WHERE dta.deck_id = d.id), '{}'),
           s.sc
      FROM decks d, pats p,
           LATERAL (SELECT max(greatest(
                      similarity(lower(d.name), w),
                      COALESCE((SELECT max(similarity(lower(t.name), w))
                                  FROM deck_tag_assignments dta JOIN course_tags t ON t.id = dta.tag_id
                                 WHERE dta.deck_id = d.id), 0))) AS sc
                      FROM unnest(p.fz) w) s
     WHERE length(p.raw) >= 3 AND p.pl IS NOT NULL AND s.sc >= 0.35
       AND NOT (d.name ILIKE ANY (p.pl)
             OR coalesce(d.description, '') ILIKE ANY (p.pl)
             OR coalesce(d.theme, '') ILIKE ANY (p.pl)
             OR EXISTS (SELECT 1 FROM deck_tag_assignments dta JOIN course_tags t ON t.id = dta.tag_id
                         WHERE dta.deck_id = d.id AND t.name ILIKE ANY (p.pl)))
     UNION ALL
    SELECT 'card'::text, c.id,
           COALESCE(NULLIF(btrim(c.card_title), ''), 'Card ' || c.card_number),
           left(regexp_replace(coalesce(NULLIF(btrim(c.card_details), ''), ''), '\s+', ' ', 'g'), 200),
           c.deck_id, dk.name, c.card_number, dk.thumbnail_url, 'remembrance'::text,
           COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                       FROM card_tag_assignments cta JOIN course_tags t ON t.id = cta.tag_id
                      WHERE cta.card_id = c.id), '{}'),
           s.sc
      FROM cards c JOIN decks dk ON dk.id = c.deck_id, pats p,
           LATERAL (SELECT max(greatest(
                      similarity(lower(coalesce(c.card_title, '')), w),
                      COALESCE((SELECT max(similarity(lower(t.name), w))
                                  FROM card_tag_assignments cta JOIN course_tags t ON t.id = cta.tag_id
                                 WHERE cta.card_id = c.id), 0))) AS sc
                      FROM unnest(p.fz) w) s
     WHERE length(p.raw) >= 3 AND p.pl IS NOT NULL AND s.sc >= 0.35
       AND NOT (coalesce(c.card_title, '') ILIKE ANY (p.pl)
             OR coalesce(c.card_details, '') ILIKE ANY (p.pl)
             OR coalesce(c.content_sections::text, '') ILIKE ANY (p.pl)
             OR EXISTS (SELECT 1 FROM card_tag_assignments cta JOIN course_tags t ON t.id = cta.tag_id
                         WHERE cta.card_id = c.id AND t.name ILIKE ANY (p.pl)))
     UNION ALL
    SELECT 'course'::text, co.id, co.title, co.description, NULL::uuid, NULL::text,
           NULL::integer, co.image_url, COALESCE(cc.page, co.door_type),
           COALESCE((SELECT array_agg(t.name ORDER BY t.name)
                       FROM course_tag_assignments a JOIN course_tags t ON t.id = a.tag_id
                      WHERE a.course_id = co.id), '{}'),
           s.sc
      FROM courses co
      LEFT JOIN content_categories cc ON cc.id = co.location_id, pats p,
           LATERAL (SELECT max(greatest(
                      similarity(lower(co.title), w),
                      COALESCE((SELECT max(similarity(lower(t.name), w))
                                  FROM course_tag_assignments a JOIN course_tags t ON t.id = a.tag_id
                                 WHERE a.course_id = co.id), 0),
                      COALESCE((SELECT max(similarity(lower(coalesce(l.title, '')), w))
                                  FROM lessons l WHERE l.course_id = co.id), 0))) AS sc
                      FROM unnest(p.fz) w) s
     WHERE length(p.raw) >= 3 AND p.pl IS NOT NULL AND co.is_published AND s.sc >= 0.35
       AND NOT (co.title ILIKE ANY (p.pl)
             OR coalesce(co.description, '') ILIKE ANY (p.pl)
             OR EXISTS (SELECT 1 FROM course_tag_assignments a JOIN course_tags t ON t.id = a.tag_id
                         WHERE a.course_id = co.id AND t.name ILIKE ANY (p.pl))
             OR EXISTS (SELECT 1 FROM lessons l WHERE l.course_id = co.id
                          AND (coalesce(l.title, '') ILIKE ANY (p.pl)
                            OR coalesce(l.description, '') ILIKE ANY (p.pl)
                            OR coalesce(l.content, '') ILIKE ANY (p.pl))))
  ) results
  ORDER BY results.score DESC
  LIMIT 300;
$function$;
