CREATE OR REPLACE FUNCTION public.get_feature_suggestions_board()
 RETURNS TABLE(id uuid, title text, description text, status text, created_at timestamp with time zone, vote_count bigint, user_voted boolean, is_mine boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT s.id, s.title, s.description, s.status::text, s.created_at,
    (SELECT count(*) FROM public.suggestion_votes v WHERE v.suggestion_id = s.id),
    EXISTS (SELECT 1 FROM public.suggestion_votes v WHERE v.suggestion_id = s.id AND v.user_id = auth.uid()),
    s.user_id = auth.uid()
  FROM public.feature_suggestions s
  WHERE auth.uid() IS NOT NULL
    AND (public.is_active_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  ORDER BY s.created_at DESC
$function$;
REVOKE EXECUTE ON FUNCTION public.get_feature_suggestions_board() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feature_suggestions_board() TO authenticated;