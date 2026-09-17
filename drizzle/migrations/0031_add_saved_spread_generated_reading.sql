ALTER TABLE public.saved_readings
  ADD COLUMN generated_reading text,
  ADD COLUMN generated_reading_model text;