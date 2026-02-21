
-- Add spread support to saved_readings
ALTER TABLE public.saved_readings
  ADD COLUMN spread_type text DEFAULT NULL,
  ADD COLUMN spread_name text DEFAULT NULL,
  ADD COLUMN spread_cards jsonb DEFAULT NULL;

-- spread_type: e.g. 'past-present-future', 'mind-body-spirit', null for single card readings
-- spread_name: human-readable name e.g. 'Past, Present, Future'
-- spread_cards: JSON array of card objects with position info:
-- [{"position": "Past", "card_id": "...", "card_title": "...", "deck_name": "...", "image_file_name": "...", "card_number": 1}]
