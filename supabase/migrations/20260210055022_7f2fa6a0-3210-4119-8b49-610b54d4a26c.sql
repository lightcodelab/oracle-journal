-- Rename existing "Door of Remembrance Courses" to "The Alchemy of Becoming"
UPDATE public.content_categories
SET name = 'The Alchemy of Becoming'
WHERE id = '3aa85ee2-39c5-4d3c-a7b4-01950b559e31';

-- Add new location for "The Rites of Remembrance"
INSERT INTO public.content_categories (id, name, slug, type, page, active, display_order)
VALUES (
  gen_random_uuid(),
  'The Rites of Remembrance',
  'loc-rites-of-remembrance',
  'location',
  'remembrance',
  true,
  99
);