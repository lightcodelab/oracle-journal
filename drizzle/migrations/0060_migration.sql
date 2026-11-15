-- Catalogue tables: require a signed-in caller instead of USING (true)
DROP POLICY IF EXISTS "Signed-in users can view teachers" ON public.teachers;
CREATE POLICY "Signed-in users can view teachers" ON public.teachers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Signed-in users can view symptoms" ON public.symptoms;
CREATE POLICY "Signed-in users can view symptoms" ON public.symptoms FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Signed-in users can view severity thresholds" ON public.severity_thresholds;
CREATE POLICY "Signed-in users can view severity thresholds" ON public.severity_thresholds FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Signed-in users can read settings" ON public.affiliate_settings;
CREATE POLICY "Signed-in users can read settings" ON public.affiliate_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- Protocols: track creator and require it to be the caller
ALTER TABLE public.areekeera_protocols ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
DROP POLICY IF EXISTS "Members can create protocols" ON public.areekeera_protocols;
CREATE POLICY "Members can create protocols" ON public.areekeera_protocols FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators can view their protocols" ON public.areekeera_protocols FOR SELECT TO authenticated USING (created_by = auth.uid());

-- Suggestions & votes: own rows or admin only; shared board served by a safe function
DROP POLICY IF EXISTS "Anyone authenticated can view suggestions" ON public.feature_suggestions;
CREATE POLICY "Users can view own suggestions" ON public.feature_suggestions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Anyone authenticated can view votes" ON public.suggestion_votes;
CREATE POLICY "Users can view own votes" ON public.suggestion_votes FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_feature_suggestions_board()
RETURNS TABLE(id uuid, title text, description text, status text, created_at timestamptz, vote_count bigint, user_voted boolean, is_mine boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.title, s.description, s.status::text, s.created_at,
    (SELECT count(*) FROM public.suggestion_votes v WHERE v.suggestion_id = s.id),
    EXISTS (SELECT 1 FROM public.suggestion_votes v WHERE v.suggestion_id = s.id AND v.user_id = auth.uid()),
    s.user_id = auth.uid()
  FROM public.feature_suggestions s
  WHERE auth.uid() IS NOT NULL
  ORDER BY s.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.get_feature_suggestions_board() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feature_suggestions_board() TO authenticated;