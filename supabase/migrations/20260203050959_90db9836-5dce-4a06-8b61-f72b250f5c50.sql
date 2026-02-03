-- Add a column to store the user's stated feelings/symptoms for the personalized disclaimer
ALTER TABLE public.areekeera_protocols
ADD COLUMN stated_feelings TEXT[] DEFAULT '{}'::TEXT[];