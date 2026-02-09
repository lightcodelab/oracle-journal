
-- Add location_id to courses so we can place courses in different doors/sections
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.content_categories(id);

-- Add rich text body and media fields to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS body_richtext JSONB;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS main_media_embed_url TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS main_media_kind TEXT DEFAULT 'none';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS main_media_file_url TEXT;
