-- 1. New location: Deepening Courses (Remembrance door)
INSERT INTO public.content_categories (type, name, slug, active, page, display_order)
SELECT 'location', 'Deepening Courses', 'loc-deepening-courses', true, 'remembrance', 90
WHERE NOT EXISTS (
  SELECT 1 FROM public.content_categories WHERE slug = 'loc-deepening-courses'
);

-- 2. Move the Sacred Rewrite companion course into that location
UPDATE public.courses
SET location_id = (SELECT id FROM public.content_categories WHERE slug = 'loc-deepening-courses' AND type = 'location')
WHERE id = '26575f67-5d5d-410d-9766-00fb6d2a1d16';

-- 3. Helper: convert a single line of card text into a TipTap paragraph node,
--    honouring **bold** markdown segments.
CREATE OR REPLACE FUNCTION public.tsr_line_to_paragraph(_line text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'type', 'paragraph',
    'content', COALESCE((
      SELECT jsonb_agg(
        CASE WHEN p.i % 2 = 0
          THEN jsonb_build_object('type','text','text',p.part,'marks',jsonb_build_array(jsonb_build_object('type','bold')))
          ELSE jsonb_build_object('type','text','text',p.part)
        END ORDER BY p.i)
      FROM regexp_split_to_table(_line, '\*\*') WITH ORDINALITY AS p(part, i)
      WHERE p.part <> ''
    ), jsonb_build_array(jsonb_build_object('type','text','text',_line)))
  );
$$;

-- 4. Helper: convert a card's content_sections into a TipTap document,
--    in the same section order the card draw screen uses.
CREATE OR REPLACE FUNCTION public.tsr_card_to_richtext(_cs jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
WITH sections(ord, content_key, heading_key, label) AS (
  VALUES
    (1, 'card_details', NULL, 'The Card'),
    (2, 'opening_invocation_content', 'opening_invocation_heading', 'Opening Invocation'),
    (3, 'spiral_of_inquiry_content', 'spiral_of_inquiry_heading', 'Spiral of Inquiry'),
    (4, 'acknowledgement_content', 'acknowledgement_heading', 'Acknowledgement'),
    (5, 'spiral_of_seeing_content', 'spiral_of_seeing_heading', 'Spiral of Seeing'),
    (6, 'living_inquiry_content', 'living_inquiry_heading', 'Living Inquiry'),
    (7, 'guided_audio_content', 'guided_audio_heading', 'Guided Audio'),
    (8, 'embodiment_ritual_content', 'embodiment_ritual_heading', 'Embodiment Ritual'),
    (9, 'benediction_content', 'benediction_heading', 'Benediction')
),
present AS (
  SELECT s.ord, s.label, s.heading_key, NULLIF(btrim(_cs->>s.content_key), '') AS body
  FROM sections s
),
nodes AS (
  SELECT p.ord, 0 AS sub, 0 AS idx,
    jsonb_build_object(
      'type','heading',
      'attrs', jsonb_build_object('level', 3),
      'content', jsonb_build_array(jsonb_build_object(
        'type','text',
        'text', COALESCE(NULLIF(btrim(_cs->>p.heading_key), ''), p.label)))
    ) AS node
  FROM present p
  WHERE p.body IS NOT NULL
  UNION ALL
  SELECT p.ord, 1, l.idx::int, public.tsr_line_to_paragraph(btrim(l.line))
  FROM present p
  CROSS JOIN LATERAL regexp_split_to_table(p.body, E'\n') WITH ORDINALITY AS l(line, idx)
  WHERE p.body IS NOT NULL AND btrim(l.line) <> ''
)
SELECT jsonb_build_object(
  'type','doc',
  'content', COALESCE((SELECT jsonb_agg(node ORDER BY ord, sub, idx) FROM nodes), '[]'::jsonb)
);
$$;

-- 5. Replace the manual test lesson with one lesson per card
DELETE FROM public.lessons WHERE course_id = '26575f67-5d5d-410d-9766-00fb6d2a1d16';

CREATE OR REPLACE FUNCTION public.tsr_card_to_text(_cs jsonb)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
WITH sections(ord, content_key, heading_key, label) AS (
  VALUES
    (1, 'card_details', NULL, 'The Card'),
    (2, 'opening_invocation_content', 'opening_invocation_heading', 'Opening Invocation'),
    (3, 'spiral_of_inquiry_content', 'spiral_of_inquiry_heading', 'Spiral of Inquiry'),
    (4, 'acknowledgement_content', 'acknowledgement_heading', 'Acknowledgement'),
    (5, 'spiral_of_seeing_content', 'spiral_of_seeing_heading', 'Spiral of Seeing'),
    (6, 'living_inquiry_content', 'living_inquiry_heading', 'Living Inquiry'),
    (7, 'guided_audio_content', 'guided_audio_heading', 'Guided Audio'),
    (8, 'embodiment_ritual_content', 'embodiment_ritual_heading', 'Embodiment Ritual'),
    (9, 'benediction_content', 'benediction_heading', 'Benediction')
)
SELECT COALESCE(string_agg(
  '**' || COALESCE(NULLIF(btrim(_cs->>s.heading_key), ''), s.label) || '**' || E'\n' || btrim(_cs->>s.content_key),
  E'\n\n' ORDER BY s.ord), '')
FROM sections s
WHERE NULLIF(btrim(_cs->>s.content_key), '') IS NOT NULL;
$$;

INSERT INTO public.lessons (course_id, lesson_number, title, content, body_richtext, module_title, module_order, main_media_kind)
SELECT
  '26575f67-5d5d-410d-9766-00fb6d2a1d16'::uuid,
  c.card_number,
  c.card_number || '. ' || c.card_title,
  public.tsr_card_to_text(c.content_sections),
  public.tsr_card_to_richtext(c.content_sections),
  'Movement ' || (ARRAY['One','Two','Three','Four','Five','Six','Seven','Eight'])[((c.card_number - 1) / 9) + 1],
  ((c.card_number - 1) / 9) + 1,
  'none'
FROM public.cards c
JOIN public.decks d ON d.id = c.deck_id
WHERE d.name = 'The Sacred Rewrite'
ORDER BY c.card_number;