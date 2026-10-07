CREATE OR REPLACE FUNCTION public.saved_free_spread_count(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT count(*)::int FROM public.saved_readings WHERE user_id = _user_id AND spread_type = 'past-present-future'; $$;

DROP POLICY IF EXISTS "Users can create their own saved readings" ON public.saved_readings;
CREATE POLICY "Users can create their own saved readings" ON public.saved_readings
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    public.has_full_temple_access(auth.uid())
    OR spread_type IS DISTINCT FROM 'past-present-future'
    OR public.saved_free_spread_count(auth.uid()) < 1
  )
);