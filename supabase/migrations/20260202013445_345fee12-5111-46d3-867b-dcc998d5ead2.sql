-- Drop the existing lesson policy
DROP POLICY IF EXISTS "Members can view lessons" ON public.lessons;

-- Create a helper function that checks if user has access to a specific door/bucket
CREATE OR REPLACE FUNCTION public.can_view_lesson_by_door(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admin can view all
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'admin'
    )
    OR
    -- Check if user's tier has access to the course's door_type (bucket)
    EXISTS (
      SELECT 1 
      FROM public.profiles p
      JOIN public.courses c ON c.id = _course_id
      JOIN public.tier_bucket_access tba ON tba.tier_code = p.member_tier_code
      WHERE p.id = _user_id
        AND p.subscription_status IN ('active', 'trialing')
        AND tba.bucket_key = c.door_type
        AND tba.is_granted = true
    )
$$;

-- Create new secure policy for lessons - requires membership AND tier access to the door
CREATE POLICY "Members can view lessons in their tier"
ON public.lessons
FOR SELECT
USING (
  -- Course must be published
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lessons.course_id
      AND courses.is_published = true
  )
  AND
  -- User must have tier access to view lessons in this door
  can_view_lesson_by_door(auth.uid(), course_id)
);