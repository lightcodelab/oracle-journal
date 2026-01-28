-- Fix 1: user_starter_deck_cards - Replace permissive INSERT with user-scoped policy
DROP POLICY IF EXISTS "System can create starter cards" ON public.user_starter_deck_cards;

CREATE POLICY "Users can create their own starter cards"
ON public.user_starter_deck_cards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Fix 2: deck_purchases - Replace permissive INSERT with authenticated service/admin only
-- The verify-woocommerce-purchase edge function uses service role, so we restrict client-side inserts
DROP POLICY IF EXISTS "System can create purchases" ON public.deck_purchases;

-- Only allow admins to directly insert purchases (edge function uses service role which bypasses RLS)
CREATE POLICY "Admins can create purchases"
ON public.deck_purchases
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));