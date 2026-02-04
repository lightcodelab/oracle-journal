-- Add summary and slug columns to healing_resources
ALTER TABLE public.healing_resources
ADD COLUMN IF NOT EXISTS summary text,
ADD COLUMN IF NOT EXISTS slug text;

-- Create unique index on slug (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS healing_resources_slug_unique 
ON public.healing_resources (slug) 
WHERE slug IS NOT NULL;