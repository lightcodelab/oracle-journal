-- Fix: Split admin "FOR ALL" policy on deck_purchases to exclude SELECT
-- This prevents admins from directly accessing customer email addresses
-- Admins must use the deck_purchases_admin view for read operations

-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Admins can manage purchases" ON public.deck_purchases;
DROP POLICY IF EXISTS "Admins can create purchases" ON public.deck_purchases;

-- Create separate policies for admin INSERT, UPDATE, DELETE (no SELECT)
CREATE POLICY "Admins can insert purchases"
  ON public.deck_purchases
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update purchases"
  ON public.deck_purchases
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete purchases"
  ON public.deck_purchases
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Note: Admins should use the deck_purchases_admin view for read operations
-- The view excludes woocommerce_customer_email for PII protection