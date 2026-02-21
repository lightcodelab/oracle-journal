
-- Feature suggestions table
CREATE TABLE public.feature_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view suggestions"
  ON public.feature_suggestions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create suggestions"
  ON public.feature_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions"
  ON public.feature_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suggestions"
  ON public.feature_suggestions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all suggestions"
  ON public.feature_suggestions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Votes table
CREATE TABLE public.suggestion_votes (
  suggestion_id uuid NOT NULL REFERENCES public.feature_suggestions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (suggestion_id, user_id)
);

ALTER TABLE public.suggestion_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view votes"
  ON public.suggestion_votes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can add their vote"
  ON public.suggestion_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their vote"
  ON public.suggestion_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_feature_suggestions_updated_at
  BEFORE UPDATE ON public.feature_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
