
CREATE OR REPLACE FUNCTION public.can_view_card(_user_id uuid, _deck_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    -- Admin can view all
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'admin'
    )
    OR
    -- Active/trialing members can view all cards
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _user_id
        AND subscription_status IN ('active', 'trialing')
    )
    OR
    -- Users with manual access to 'remembrance' can view all cards
    EXISTS (
      SELECT 1 FROM public.manual_access_grants
      WHERE user_id = _user_id
        AND bucket_key = 'remembrance'
        AND starts_at <= now()
        AND ends_at > now()
    )
    OR
    -- Users who purchased this specific deck can view its cards
    EXISTS (
      SELECT 1 FROM public.deck_purchases
      WHERE user_id = _user_id
        AND deck_id = _deck_id
        AND verified = true
    )
    OR
    -- Free/starter decks are always viewable by authenticated users
    (
      _user_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.decks
        WHERE id = _deck_id
          AND (is_free = true OR is_starter = true)
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.can_view_lesson_by_door(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    OR
    -- Check manual access grants for the course's door_type
    EXISTS (
      SELECT 1
      FROM public.manual_access_grants mag
      JOIN public.courses c ON c.id = _course_id
      WHERE mag.user_id = _user_id
        AND mag.bucket_key = c.door_type
        AND mag.starts_at <= now()
        AND mag.ends_at > now()
    )
$$;
