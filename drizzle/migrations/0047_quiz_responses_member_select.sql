GRANT SELECT ON public.quiz_responses TO authenticated;
CREATE POLICY "Members view own quiz responses" ON public.quiz_responses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS quiz_responses_user_idx ON public.quiz_responses(user_id, created_at DESC);