-- Add card_number column to cards table
ALTER TABLE public.cards
ADD COLUMN card_number INTEGER;

-- Add index for better performance on card_number lookups
CREATE INDEX idx_cards_card_number ON public.cards(card_number);

-- Add a unique constraint to ensure each deck has unique card numbers
-- (same card number can exist across different decks, but not within the same deck)
ALTER TABLE public.cards
ADD CONSTRAINT unique_deck_card_number UNIQUE (deck_id, card_number);

-- Add a comment to document the field
COMMENT ON COLUMN public.cards.card_number IS 'Sequential card number used to map to image files (e.g., 1 maps to card-1.png)';