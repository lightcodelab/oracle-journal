WITH src AS (
  SELECT c.card_number,
         COALESCE(c.content_sections, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'card_details', c.card_details,
           'opening_invocation_heading', c.opening_invocation_heading,
           'opening_invocation_content', c.opening_invocation_content,
           'spiral_of_inquiry_heading', c.spiral_of_inquiry_heading,
           'spiral_of_inquiry_content', c.spiral_of_inquiry_content,
           'acknowledgement_heading', c.acknowledgement_heading,
           'acknowledgement_content', c.acknowledgement_content,
           'spiral_of_seeing_heading', c.spiral_of_seeing_heading,
           'spiral_of_seeing_content', c.spiral_of_seeing_content,
           'living_inquiry_heading', c.living_inquiry_heading,
           'living_inquiry_content', c.living_inquiry_content,
           'guided_audio_heading', c.guided_audio_heading,
           'guided_audio_content', c.guided_audio_content,
           'embodiment_ritual_heading', c.embodiment_ritual_heading,
           'embodiment_ritual_content', c.embodiment_ritual_content,
           'benediction_heading', c.benediction_heading,
           'benediction_content', c.benediction_content
         )) AS cs
  FROM public.cards c
  WHERE c.deck_id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484'
)
UPDATE public.lessons l
SET body_richtext = public.tsr_card_to_richtext(src.cs),
    content = public.tsr_card_to_text(src.cs),
    updated_at = now()
FROM src
WHERE l.course_id = '26575f67-5d5d-410d-9766-00fb6d2a1d16'
  AND l.lesson_number = src.card_number
  AND COALESCE(btrim(l.content), '') = '';