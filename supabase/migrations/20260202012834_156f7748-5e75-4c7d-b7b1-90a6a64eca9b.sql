-- Create a helper function to check if user has valid membership (active or trialing)
CREATE OR REPLACE FUNCTION public.has_active_membership(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND subscription_status IN ('active', 'trialing')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Create a function to check card access based on membership or purchase
CREATE OR REPLACE FUNCTION public.can_view_card(_user_id uuid, _deck_id uuid)
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
    -- Active/trialing members can view all cards
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _user_id
        AND subscription_status IN ('active', 'trialing')
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

-- Create a function to check lesson access (requires active membership)
CREATE OR REPLACE FUNCTION public.can_view_lesson(_user_id uuid)
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
    -- Active/trialing members can view all lessons
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _user_id
        AND subscription_status IN ('active', 'trialing')
    )
$$;

-- Drop existing public policies on cards table
DROP POLICY IF EXISTS "Anyone can view cards" ON public.cards;

-- Create new secure policy for cards - requires authentication and access check
CREATE POLICY "Users can view accessible cards"
ON public.cards
FOR SELECT
USING (
  -- Admins can view all
  has_role(auth.uid(), 'admin')
  OR
  -- Check card access based on membership/purchase/free deck
  can_view_card(auth.uid(), deck_id)
);

-- Drop existing public policies on lessons table
DROP POLICY IF EXISTS "Anyone can view lessons" ON public.lessons;

-- Create new secure policy for lessons - requires membership
CREATE POLICY "Members can view lessons"
ON public.lessons
FOR SELECT
USING (
  -- Course must be published AND user must have membership
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lessons.course_id
      AND courses.is_published = true
  )
  AND can_view_lesson(auth.uid())
);

-- Fix deck_purchases table - ensure only service role/admin can INSERT
-- First check existing policies
DROP POLICY IF EXISTS "Users can insert deck purchases" ON public.deck_purchases;

-- Create explicit deny policy for user inserts (service role bypasses RLS)
-- Only allow admins to insert via RLS (service role bypasses RLS for system operations)
CREATE POLICY "Only admins can insert deck purchases"
ON public.deck_purchases
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Ensure users can only view their own purchases
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.deck_purchases;
CREATE POLICY "Users can view their own purchases"
ON public.deck_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all purchases
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.deck_purchases;
CREATE POLICY "Admins can view all purchases"
ON public.deck_purchases
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can manage all purchases
DROP POLICY IF EXISTS "Admins can manage deck purchases" ON public.deck_purchases;
CREATE POLICY "Admins can manage deck purchases"
ON public.deck_purchases
FOR ALL
USING (has_role(auth.uid(), 'admin'));