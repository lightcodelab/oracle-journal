REVOKE ALL ON public.revelations_readings FROM anon, authenticated;
GRANT SELECT ON public.revelations_readings TO authenticated;
GRANT UPDATE (journal_answers) ON public.revelations_readings TO authenticated;
GRANT ALL ON public.revelations_readings TO service_role;
REVOKE ALL ON FUNCTION public.draw_revelation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.draw_revelation(text) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_revelation(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_revelation(uuid,text,text) TO service_role;