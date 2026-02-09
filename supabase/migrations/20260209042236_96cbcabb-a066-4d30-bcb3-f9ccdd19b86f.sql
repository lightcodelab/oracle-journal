
-- Make resource_id nullable so we can store lesson-based tracks too
ALTER TABLE public.playlist_tracks ALTER COLUMN resource_id DROP NOT NULL;

-- Add lesson_id as an alternative reference
ALTER TABLE public.playlist_tracks ADD COLUMN lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE;

-- Add a check constraint: at least one of resource_id or lesson_id must be set
ALTER TABLE public.playlist_tracks ADD CONSTRAINT playlist_tracks_has_source
  CHECK (resource_id IS NOT NULL OR lesson_id IS NOT NULL);

-- Update the unique constraint to cover both sources
-- First drop the existing unique constraint if any
DO $$
BEGIN
  -- Drop existing unique constraint on (playlist_id, resource_id) if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'playlist_tracks' AND constraint_type = 'UNIQUE'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.playlist_tracks DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints 
      WHERE table_name = 'playlist_tracks' AND constraint_type = 'UNIQUE'
      LIMIT 1
    );
  END IF;
END $$;

-- Add unique constraints for both types
CREATE UNIQUE INDEX IF NOT EXISTS playlist_tracks_resource_unique ON public.playlist_tracks (playlist_id, resource_id) WHERE resource_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS playlist_tracks_lesson_unique ON public.playlist_tracks (playlist_id, lesson_id) WHERE lesson_id IS NOT NULL;
