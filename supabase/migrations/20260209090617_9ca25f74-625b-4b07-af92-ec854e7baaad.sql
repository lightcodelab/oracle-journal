
-- Add a flag to mark resources that should be included in ALL protocols
ALTER TABLE public.healing_resources
ADD COLUMN applies_to_all_symptoms boolean NOT NULL DEFAULT false;

-- Add a comment for clarity
COMMENT ON COLUMN public.healing_resources.applies_to_all_symptoms IS 'When true, this resource must be included in every protocol regardless of symptom matching.';
