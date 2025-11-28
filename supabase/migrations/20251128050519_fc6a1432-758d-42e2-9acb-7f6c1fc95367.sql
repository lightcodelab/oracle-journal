-- Drop existing cards table and recreate with spreadsheet structure
DROP TABLE IF EXISTS public.cards CASCADE;

-- Create cards table matching the 21-column spreadsheet structure
CREATE TABLE public.cards (
  -- Essential system fields
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Spreadsheet columns (exact structure)
  deck_name TEXT,
  image_file_name TEXT,
  card_number INTEGER NOT NULL,
  card_title TEXT NOT NULL,
  card_details TEXT,
  
  -- Opening Invocation section
  opening_invocation_heading TEXT,
  opening_invocation_content TEXT,
  
  -- Spiral of Inquiry section
  spiral_of_inquiry_heading TEXT,
  spiral_of_inquiry_content TEXT,
  
  -- Acknowledgement section
  acknowledgement_heading TEXT,
  acknowledgement_content TEXT,
  
  -- Spiral of Seeing section
  spiral_of_seeing_heading TEXT,
  spiral_of_seeing_content TEXT,
  
  -- Living Inquiry section
  living_inquiry_heading TEXT,
  living_inquiry_content TEXT,
  
  -- Guided Audio section
  guided_audio_heading TEXT,
  guided_audio_content TEXT,
  
  -- Embodiment Ritual section
  embodiment_ritual_heading TEXT,
  embodiment_ritual_content TEXT,
  
  -- Benediction section
  benediction_heading TEXT,
  benediction_content TEXT,
  
  -- Ensure card numbers are unique within each deck
  UNIQUE(deck_id, card_number)
);

-- Enable RLS
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view cards" 
  ON public.cards 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage cards" 
  ON public.cards 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_cards_deck_id ON public.cards(deck_id);
CREATE INDEX idx_cards_card_number ON public.cards(card_number);