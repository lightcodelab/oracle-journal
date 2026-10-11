CREATE TABLE public.experience_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  used_or_explored text,
  experience text,
  helpful text,
  unclear_or_missing text,
  more_useful text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.experience_feedback TO authenticated;
GRANT ALL ON public.experience_feedback TO service_role;
ALTER TABLE public.experience_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members add own experience" ON public.experience_feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members read own, admins read all" ON public.experience_feedback FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));