-- Add premium product ID and starter flag to decks
ALTER TABLE public.decks 
ADD COLUMN woocommerce_product_id_premium text,
ADD COLUMN is_starter boolean DEFAULT false;

-- Add premium content fields to cards
ALTER TABLE public.cards
ADD COLUMN embodiment_content text,
ADD COLUMN meditation_audio_url text;

-- Add premium flag to deck purchases
ALTER TABLE public.deck_purchases
ADD COLUMN is_premium boolean DEFAULT false;

-- Create user starter deck cards table to track each user's 8 random starter cards
CREATE TABLE public.user_starter_deck_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id uuid REFERENCES public.cards NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, card_id)
);

-- Enable RLS on user starter deck cards
ALTER TABLE public.user_starter_deck_cards ENABLE ROW LEVEL SECURITY;

-- Users can view their own starter cards
CREATE POLICY "Users can view their own starter cards"
ON public.user_starter_deck_cards
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert starter cards for users
CREATE POLICY "System can create starter cards"
ON public.user_starter_deck_cards
FOR INSERT
WITH CHECK (true);

-- Create function to check premium access
CREATE OR REPLACE FUNCTION public.user_has_premium_deck_access(_user_id uuid, _deck_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deck_purchases
    WHERE user_id = _user_id 
      AND deck_id = _deck_id 
      AND verified = true
      AND is_premium = true
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Update user_has_deck_access to handle starter deck
CREATE OR REPLACE FUNCTION public.user_has_deck_access(_user_id uuid, _deck_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    -- Check if deck is free or starter
    SELECT 1 FROM public.decks 
    WHERE id = _deck_id AND (is_free = true OR is_starter = true)
  ) OR EXISTS (
    -- Or check if user has purchased it
    SELECT 1 FROM public.deck_purchases
    WHERE user_id = _user_id 
      AND deck_id = _deck_id 
      AND verified = true
  ) OR EXISTS (
    -- Or check if user is admin
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;