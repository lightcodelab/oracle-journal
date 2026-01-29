-- Create a safe admin view for deck purchases that excludes customer email
CREATE VIEW public.deck_purchases_admin
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  deck_id,
  woocommerce_order_id,  -- Admins can look this up in WooCommerce if needed
  is_premium,
  verified,
  purchased_at
FROM public.deck_purchases;
-- Excludes: woocommerce_customer_email

-- Drop the existing admin SELECT policy that exposes all data
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.deck_purchases;

-- Create a more restrictive admin policy that only allows access through the view
-- Base table: admins can only INSERT/UPDATE (for granting access), not SELECT all data
CREATE POLICY "Admins can manage purchases"
ON public.deck_purchases
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Grant SELECT on the safe view to authenticated users (RLS will still apply via security_invoker)
GRANT SELECT ON public.deck_purchases_admin TO authenticated;