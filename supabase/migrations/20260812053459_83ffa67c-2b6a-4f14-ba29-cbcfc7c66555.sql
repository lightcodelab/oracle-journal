CREATE OR REPLACE FUNCTION public.tsr_inline(_line text, _italic boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT COALESCE((
    SELECT jsonb_agg(
      CASE WHEN marks = '[]'::jsonb
        THEN jsonb_build_object('type','text','text',part)
        ELSE jsonb_build_object('type','text','text',part,'marks',marks)
      END ORDER BY i)
    FROM (
      SELECT p.part, p.i,
        (CASE WHEN p.i % 2 = 0 THEN jsonb_build_array(jsonb_build_object('type','bold')) ELSE '[]'::jsonb END)
        || (CASE WHEN _italic THEN jsonb_build_array(jsonb_build_object('type','italic')) ELSE '[]'::jsonb END) AS marks
      FROM regexp_split_to_table(_line, '\*\*') WITH ORDINALITY AS p(part, i)
      WHERE p.part <> ''
    ) q
  ), jsonb_build_array(jsonb_build_object('type','text','text',_line)));
$$;

CREATE OR REPLACE FUNCTION public.tsr_mythic_block(_line text)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT jsonb_build_object('type','blockquote','content', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('type','paragraph','content', public.tsr_inline(btrim(t.mm[1]), true)) ORDER BY t.i)
    FROM regexp_matches(_line, '[^.!?]+[.!?]*', 'g') WITH ORDINALITY AS t(mm, i)
    WHERE btrim(t.mm[1]) <> ''
  ), jsonb_build_array(jsonb_build_object('type','paragraph','content', public.tsr_inline(_line, true)))));
$$;

CREATE OR REPLACE FUNCTION public.tsr_body_to_nodes(_body text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE
  lines text[];
  ln text;
  nodes jsonb := '[]'::jsonb;
  bullets jsonb := '[]'::jsonb;
  in_mythic boolean := false;
  m text[];
  heading text;
  rest text;
  clean text;
BEGIN
  IF _body IS NULL OR btrim(_body) = '' THEN RETURN nodes; END IF;
  clean := regexp_replace(replace(_body, '—', ','), '\s+,', ',', 'g');
  lines := regexp_split_to_array(clean, E'\n');

  FOREACH ln IN ARRAY lines LOOP
    ln := btrim(ln);
    CONTINUE WHEN ln = '';

    IF ln ~ '^[-•]\s+' OR (ln ~ '^\*\s+') THEN
      bullets := bullets || jsonb_build_array(jsonb_build_object(
        'type','listItem',
        'content', jsonb_build_array(jsonb_build_object(
          'type','paragraph',
          'content', public.tsr_inline(regexp_replace(ln, '^[-•*]\s+', ''))))));
      CONTINUE;
    END IF;

    IF jsonb_array_length(bullets) > 0 THEN
      nodes := nodes || jsonb_build_array(jsonb_build_object('type','bulletList','content',bullets));
      bullets := '[]'::jsonb;
    END IF;

    IF ln ~ '^\d+\.\s+' THEN
      in_mythic := false;
      nodes := nodes || jsonb_build_array(jsonb_build_object(
        'type','paragraph',
        'content', jsonb_build_array(jsonb_build_object(
            'type','text',
            'text', (regexp_match(ln, '^(\d+\.)'))[1] || ' ',
            'marks', jsonb_build_array(jsonb_build_object('type','bold'))))
          || public.tsr_inline(regexp_replace(ln, '^\d+\.\s+', ''))));
      CONTINUE;
    END IF;

    IF ln ~ '^\*\*[^*]+\*\*$' THEN
      in_mythic := false;
      nodes := nodes || jsonb_build_array(public.tsr_line_to_paragraph(ln));
      CONTINUE;
    END IF;

    m := regexp_match(ln, '^([^:]+):\s*(.*)$');
    IF m IS NOT NULL AND btrim(m[1]) ~ '^[A-Z][A-Za-z\s]+$' THEN
      heading := btrim(m[1]);
      rest := btrim(COALESCE(m[2], ''));
      nodes := nodes || jsonb_build_array(jsonb_build_object(
        'type','paragraph',
        'content', jsonb_build_array(jsonb_build_object(
          'type','text','text', heading || ':',
          'marks', jsonb_build_array(jsonb_build_object('type','bold'))))));
      IF heading ILIKE '%Mythic Moment%' THEN
        in_mythic := true;
        IF rest <> '' THEN nodes := nodes || jsonb_build_array(public.tsr_mythic_block(rest)); END IF;
      ELSE
        in_mythic := false;
        IF rest <> '' THEN nodes := nodes || jsonb_build_array(public.tsr_line_to_paragraph(rest)); END IF;
      END IF;
      CONTINUE;
    END IF;

    IF in_mythic THEN
      nodes := nodes || jsonb_build_array(public.tsr_mythic_block(ln));
      CONTINUE;
    END IF;

    nodes := nodes || jsonb_build_array(public.tsr_line_to_paragraph(ln));
  END LOOP;

  IF jsonb_array_length(bullets) > 0 THEN
    nodes := nodes || jsonb_build_array(jsonb_build_object('type','bulletList','content',bullets));
  END IF;

  RETURN nodes;
END;
$$;

CREATE OR REPLACE FUNCTION public.tsr_card_to_richtext(_cs jsonb)
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public' AS $$
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
blocks AS (
  SELECT p.ord,
    jsonb_build_array(jsonb_build_object(
      'type','heading',
      'attrs', jsonb_build_object('level', 3),
      'content', jsonb_build_array(jsonb_build_object(
        'type','text',
        'text', COALESCE(NULLIF(btrim(_cs->>p.heading_key), ''), p.label)))
    )) || public.tsr_body_to_nodes(p.body) AS nodes
  FROM present p
  WHERE p.body IS NOT NULL
)
SELECT jsonb_build_object(
  'type','doc',
  'content', COALESCE((SELECT jsonb_agg(n ORDER BY ord, i) FROM blocks b, jsonb_array_elements(b.nodes) WITH ORDINALITY AS e(n, i)), '[]'::jsonb)
);
$$;