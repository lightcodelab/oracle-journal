-- Add new columns to session_replays for enhanced content
ALTER TABLE public.session_replays
ADD COLUMN IF NOT EXISTS content_richtext jsonb,
ADD COLUMN IF NOT EXISTS original_session_date timestamp with time zone;