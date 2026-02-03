-- Add page column to content_categories to distinguish between Door of Devotion and Door of Remembrance locations
ALTER TABLE public.content_categories 
ADD COLUMN page text DEFAULT 'devotion' CHECK (page IN ('devotion', 'remembrance'));

-- Update existing locations to be for Door of Devotion
UPDATE public.content_categories 
SET page = 'devotion' 
WHERE type = 'location';

-- Add a Door of Remembrance Courses location
INSERT INTO public.content_categories (type, name, slug, active, display_order, page)
VALUES ('location', 'Door of Remembrance Courses', 'loc-remembrance-courses', true, 100, 'remembrance');