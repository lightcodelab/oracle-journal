-- Add content_sections JSONB column to cards table
ALTER TABLE public.cards 
ADD COLUMN content_sections JSONB DEFAULT '{}'::jsonb;

-- Migrate existing Sacred Rewrite data into JSON structure
UPDATE public.cards
SET content_sections = jsonb_build_object(
  'card_details', COALESCE(card_details, ''),
  'opening_invocation_heading', COALESCE(opening_invocation_heading, ''),
  'opening_invocation_content', COALESCE(opening_invocation_content, ''),
  'spiral_of_inquiry_heading', COALESCE(spiral_of_inquiry_heading, ''),
  'spiral_of_inquiry_content', COALESCE(spiral_of_inquiry_content, ''),
  'acknowledgement_heading', COALESCE(acknowledgement_heading, ''),
  'acknowledgement_content', COALESCE(acknowledgement_content, ''),
  'spiral_of_seeing_heading', COALESCE(spiral_of_seeing_heading, ''),
  'spiral_of_seeing_content', COALESCE(spiral_of_seeing_content, ''),
  'living_inquiry_heading', COALESCE(living_inquiry_heading, ''),
  'living_inquiry_content', COALESCE(living_inquiry_content, ''),
  'guided_audio_heading', COALESCE(guided_audio_heading, ''),
  'guided_audio_content', COALESCE(guided_audio_content, ''),
  'embodiment_ritual_heading', COALESCE(embodiment_ritual_heading, ''),
  'embodiment_ritual_content', COALESCE(embodiment_ritual_content, ''),
  'benediction_heading', COALESCE(benediction_heading, ''),
  'benediction_content', COALESCE(benediction_content, '')
)
WHERE deck_id IN (SELECT id FROM public.decks WHERE name = 'The Sacred Rewrite');

-- Add helpful comment
COMMENT ON COLUMN public.cards.content_sections IS 'Flexible JSON structure for deck-specific content sections. Structure varies by deck type.';