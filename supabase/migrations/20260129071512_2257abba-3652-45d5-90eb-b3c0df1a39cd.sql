-- Create saved_readings table to store user's saved card readings
CREATE TABLE public.saved_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES public.decks(id) ON DELETE CASCADE,
  card_title TEXT NOT NULL,
  deck_name TEXT,
  image_file_name TEXT,
  notes TEXT,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_readings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own saved readings" 
ON public.saved_readings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved readings" 
ON public.saved_readings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved readings" 
ON public.saved_readings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved readings" 
ON public.saved_readings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_readings_updated_at
BEFORE UPDATE ON public.saved_readings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster user queries
CREATE INDEX idx_saved_readings_user_id ON public.saved_readings(user_id);
CREATE INDEX idx_saved_readings_saved_at ON public.saved_readings(saved_at DESC);