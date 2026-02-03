-- Add location_id column to healing_resources table
-- This allows healing resources to optionally appear in Door of Devotion section grids

ALTER TABLE public.healing_resources 
ADD COLUMN location_id UUID REFERENCES public.content_categories(id) ON DELETE SET NULL;

-- Add index for efficient querying by location
CREATE INDEX idx_healing_resources_location_id ON public.healing_resources(location_id);

-- Add comment explaining the column's purpose
COMMENT ON COLUMN public.healing_resources.location_id IS 'Optional reference to a Door of Devotion location. When set, the resource appears in that section grid in addition to being available for protocols.';