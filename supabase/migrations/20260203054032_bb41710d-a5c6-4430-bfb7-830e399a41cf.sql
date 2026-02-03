-- Add audio file URL column to healing_resources table
ALTER TABLE public.healing_resources 
ADD COLUMN audio_file_url TEXT;