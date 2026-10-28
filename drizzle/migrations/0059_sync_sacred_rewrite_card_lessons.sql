CREATE OR REPLACE FUNCTION public.sync_sacred_rewrite_card_lesson()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  section_key text;
  next_sections jsonb := COALESCE(NEW.content_sections, '{}'::jsonb);
  old_number integer := NEW.card_number;
  lesson_count integer;
BEGIN
  IF NEW.deck_id <> '85dddf8a-cd5e-4cdd-8ccc-af034052e484'::uuid THEN RETURN NEW; END IF;
  FOR section_key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
    IF section_key = 'card_details' OR section_key LIKE '%\_heading' ESCAPE '\' OR section_key LIKE '%\_content' ESCAPE '\' THEN
      IF TG_OP = 'INSERT' THEN
        IF to_jsonb(NEW)->>section_key IS NOT NULL THEN
          next_sections := next_sections || jsonb_build_object(section_key, to_jsonb(NEW)->section_key);
        END IF;
      ELSIF (to_jsonb(NEW)->section_key) IS DISTINCT FROM (to_jsonb(OLD)->section_key) THEN
        next_sections := next_sections || jsonb_build_object(section_key, to_jsonb(NEW)->section_key);
      END IF;
    END IF;
  END LOOP;
  NEW.content_sections := next_sections;
  IF TG_OP = 'UPDATE' THEN old_number := OLD.card_number; END IF;
  SELECT count(*) INTO lesson_count FROM public.lessons
    WHERE course_id = '26575f67-5d5d-410d-9766-00fb6d2a1d16'::uuid AND lesson_number = old_number;
  IF lesson_count > 1 THEN RAISE EXCEPTION 'Multiple deepening lessons exist for this card. Card changes were not saved.'; END IF;
  IF EXISTS (SELECT 1 FROM public.cards WHERE deck_id = NEW.deck_id AND card_number = NEW.card_number AND id <> NEW.id) THEN
    RAISE EXCEPTION 'Another Sacred Rewrite card already uses this number. Card changes were not saved.';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.card_number IS DISTINCT FROM OLD.card_number AND EXISTS (
    SELECT 1 FROM public.lessons WHERE course_id = '26575f67-5d5d-410d-9766-00fb6d2a1d16'::uuid AND lesson_number = NEW.card_number
  ) THEN RAISE EXCEPTION 'Another deepening lesson already uses this number. Card changes were not saved.'; END IF;
  IF lesson_count = 0 THEN
    INSERT INTO public.lessons (course_id, lesson_number, title, content, body_richtext, module_title, module_order, main_media_kind)
    VALUES ('26575f67-5d5d-410d-9766-00fb6d2a1d16', NEW.card_number, NEW.card_number || '. ' || NEW.card_title,
      public.tsr_card_to_text(next_sections), public.tsr_card_to_richtext(next_sections),
      'Movement ' || COALESCE((ARRAY['One','Two','Three','Four','Five','Six','Seven'])[((NEW.card_number-1)/9)+1], (((NEW.card_number-1)/9)+1)::text),
      ((NEW.card_number-1)/9)+1, 'none');
  ELSE
    UPDATE public.lessons SET lesson_number = NEW.card_number,
      title = NEW.card_number || '. ' || NEW.card_title,
      content = public.tsr_card_to_text(next_sections), body_richtext = public.tsr_card_to_richtext(next_sections), updated_at = now()
    WHERE course_id = '26575f67-5d5d-410d-9766-00fb6d2a1d16'::uuid AND lesson_number = old_number;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_sacred_rewrite_card_lesson() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_sacred_rewrite_card_lesson() TO service_role;
CREATE TRIGGER sync_sacred_rewrite_card_lesson BEFORE INSERT OR UPDATE OF card_number, card_title, card_details, content_sections,
opening_invocation_heading, opening_invocation_content, spiral_of_inquiry_heading, spiral_of_inquiry_content,
acknowledgement_heading, acknowledgement_content, spiral_of_seeing_heading, spiral_of_seeing_content,
living_inquiry_heading, living_inquiry_content, guided_audio_heading, guided_audio_content,
embodiment_ritual_heading, embodiment_ritual_content, benediction_heading, benediction_content
ON public.cards FOR EACH ROW EXECUTE FUNCTION public.sync_sacred_rewrite_card_lesson();