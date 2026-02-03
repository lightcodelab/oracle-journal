-- Add display_order column to content_categories for reordering
ALTER TABLE public.content_categories 
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Initialize display_order based on current alphabetical order within each type
WITH ordered AS (
  SELECT id, type, ROW_NUMBER() OVER (PARTITION BY type ORDER BY name) as rn
  FROM public.content_categories
)
UPDATE public.content_categories c
SET display_order = o.rn
FROM ordered o
WHERE c.id = o.id;

-- Create index for efficient ordering
CREATE INDEX idx_content_categories_display_order ON public.content_categories(type, display_order);