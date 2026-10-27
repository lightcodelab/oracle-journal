CREATE TABLE public.revelations_readings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
 card_id uuid NOT NULL REFERENCES public.cards(id),
 card_title text NOT NULL,
 image_file_name text,
 guiding_question text NOT NULL DEFAULT '' CHECK (length(guiding_question) <= 500),
 generated_reading text,
 generated_reading_model text,
 journal_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
 generation_started_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.revelations_readings TO authenticated;
GRANT UPDATE (journal_answers) ON public.revelations_readings TO authenticated;
GRANT ALL ON public.revelations_readings TO service_role;
ALTER TABLE public.revelations_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own revelation" ON public.revelations_readings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Write own evidence locker" ON public.revelations_readings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.draw_revelation(_guiding_question text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.revelations_readings; picked public.cards;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in to draw your card.'; END IF;
 IF _guiding_question IS NULL OR length(_guiding_question) > 500 THEN RAISE EXCEPTION 'Your question must be 500 characters or fewer.'; END IF;
 PERFORM id FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
 SELECT * INTO result FROM public.revelations_readings WHERE user_id = auth.uid();
 IF FOUND THEN RETURN to_jsonb(result); END IF;
 IF NOT public.has_full_temple_access(auth.uid()) AND NOT public.has_free_spread_access(auth.uid()) THEN RAISE EXCEPTION 'Your introductory reading has already been used. You can return to your saved reading.'; END IF;
 SELECT c.* INTO picked FROM public.cards c JOIN public.decks d ON c.deck_id = d.id
 WHERE d.id = '85dddf8a-cd5e-4cdd-8ccc-af034052e484' AND d.is_published = true ORDER BY random() LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'The Sacred Rewrite cards are not available right now.'; END IF;
 INSERT INTO public.revelations_readings (user_id, card_id, card_title, image_file_name, guiding_question)
 VALUES (auth.uid(), picked.id, picked.card_title, picked.image_file_name, trim(_guiding_question)) RETURNING * INTO result;
 RETURN to_jsonb(result);
END; $$;
REVOKE ALL ON FUNCTION public.draw_revelation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.draw_revelation(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.complete_revelation(_id uuid, _reading text, _model text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid;
BEGIN
 UPDATE public.revelations_readings SET generated_reading = _reading, generated_reading_model = _model, generation_started_at = NULL WHERE id = _id AND generated_reading IS NULL RETURNING user_id INTO owner_id;
 IF owner_id IS NOT NULL AND NOT public.has_full_temple_access(owner_id) THEN
 UPDATE public.profiles SET free_reading_used_at = coalesce(free_reading_used_at, now()) WHERE id = owner_id;
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.complete_revelation(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_revelation(uuid,text,text) TO service_role;