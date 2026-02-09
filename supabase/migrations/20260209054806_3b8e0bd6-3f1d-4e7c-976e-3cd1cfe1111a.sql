
-- Add module grouping fields to lessons table
-- Lessons with the same module_title within a course are grouped together
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS module_title TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS module_order INTEGER DEFAULT 0;
