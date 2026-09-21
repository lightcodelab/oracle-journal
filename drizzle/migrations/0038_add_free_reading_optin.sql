-- Free account opt-in: one Past, Present, Future reading per free account.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_reading_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS free_signup_source text;

COMMENT ON COLUMN public.profiles.free_reading_used_at IS 'Set the first time a non-member successfully generates their free Past, Present, Future reading.';
COMMENT ON COLUMN public.profiles.free_signup_source IS 'Where a free account signed up from (e.g. free-reading-landing, membership-page).';

-- Shared rule used by both the app and the reading function.
CREATE OR REPLACE FUNCTION public.has_free_spread_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND NOT public.has_full_temple_access(_user_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _user_id
        AND free_reading_used_at IS NULL
    );
$$;

REVOKE ALL ON FUNCTION public.has_free_spread_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_free_spread_access(uuid) TO authenticated, service_role;

-- Counts a member's saved readings without re-entering row level security.
CREATE OR REPLACE FUNCTION public.saved_readings_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.saved_readings WHERE user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.saved_readings_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saved_readings_count(uuid) TO authenticated, service_role;

-- Free accounts may keep exactly one saved reading; members are unchanged.
DROP POLICY IF EXISTS "Users can create their own saved readings" ON public.saved_readings;
CREATE POLICY "Users can create their own saved readings"
ON public.saved_readings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.has_full_temple_access(auth.uid())
    OR public.saved_readings_count(auth.uid()) < 1
  )
);
