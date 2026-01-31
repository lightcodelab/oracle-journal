-- Fix 1: Protect Zoom credentials in live_sessions
-- Create a public view that excludes sensitive Zoom fields
CREATE VIEW public.live_sessions_public 
WITH (security_invoker = on) AS
SELECT 
  id, title, description, scheduled_at, 
  duration_minutes, capacity, session_type, status,
  created_at, updated_at, host_user_id, created_by
FROM public.live_sessions
WHERE status IN ('scheduled', 'live');

-- Grant access to the safe public view
GRANT SELECT ON public.live_sessions_public TO anon, authenticated;

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view scheduled sessions" ON public.live_sessions;

-- Create restrictive policy: only registered users or admins can see full session details
CREATE POLICY "Registered users can view session details"
  ON public.live_sessions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    (
      EXISTS (
        SELECT 1 FROM session_registrations 
        WHERE session_id = live_sessions.id 
        AND user_id = auth.uid()
        AND status = 'registered'
      ) 
      OR has_role(auth.uid(), 'admin')
    )
  );

-- Fix 2: Restrict deck_purchases_admin view to admins only
-- Revoke public access to the admin view
REVOKE SELECT ON public.deck_purchases_admin FROM anon;
REVOKE SELECT ON public.deck_purchases_admin FROM authenticated;

-- Grant only to authenticated (will be filtered by underlying RLS)
-- But the base table deck_purchases already has RLS, so security_invoker will apply it
-- We need to ensure only admins can query this view
-- Create a function-based approach since views can't have RLS directly

-- Drop the existing view and recreate with proper access
DROP VIEW IF EXISTS public.deck_purchases_admin;

-- Create a secure function instead that only admins can call
CREATE OR REPLACE FUNCTION public.get_deck_purchases_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  deck_id uuid,
  woocommerce_order_id text,
  is_premium boolean,
  verified boolean,
  purchased_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, user_id, deck_id, woocommerce_order_id,
    is_premium, verified, purchased_at
  FROM public.deck_purchases
  WHERE has_role(auth.uid(), 'admin')
$$;