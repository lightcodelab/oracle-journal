
GRANT SELECT ON public.quizzes TO anon, authenticated;
GRANT ALL ON public.quizzes TO service_role;
GRANT SELECT ON public.quiz_questions TO anon, authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
GRANT SELECT ON public.quiz_options TO anon, authenticated;
GRANT ALL ON public.quiz_options TO service_role;
GRANT SELECT ON public.quiz_results TO anon, authenticated;
GRANT ALL ON public.quiz_results TO service_role;
GRANT INSERT ON public.quiz_responses TO anon, authenticated;
GRANT SELECT ON public.quiz_responses TO authenticated;
GRANT ALL ON public.quiz_responses TO service_role;
GRANT INSERT ON public.quiz_events TO anon, authenticated;
GRANT SELECT ON public.quiz_events TO authenticated;
GRANT ALL ON public.quiz_events TO service_role;
