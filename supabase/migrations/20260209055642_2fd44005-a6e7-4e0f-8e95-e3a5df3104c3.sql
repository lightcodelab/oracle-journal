
-- Create table for multiple audio files per healing resource
CREATE TABLE public.healing_resource_audio_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.healing_resources(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.healing_resource_audio_files ENABLE ROW LEVEL SECURITY;

-- Admin-only write, public read for published resources
CREATE POLICY "Anyone can read audio files for published resources"
  ON public.healing_resource_audio_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.healing_resources hr
      WHERE hr.id = resource_id AND hr.status = 'published'
    )
  );

CREATE POLICY "Admins can read all audio files"
  ON public.healing_resource_audio_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert audio files"
  ON public.healing_resource_audio_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can update audio files"
  ON public.healing_resource_audio_files
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete audio files"
  ON public.healing_resource_audio_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Migrate existing audio_file_url data into the new table
INSERT INTO public.healing_resource_audio_files (resource_id, file_url, file_name, display_order)
SELECT id, audio_file_url, 
  CASE 
    WHEN audio_file_url LIKE '%/%' THEN SPLIT_PART(audio_file_url, '/', -1)
    ELSE audio_file_url
  END,
  0
FROM public.healing_resources
WHERE audio_file_url IS NOT NULL AND audio_file_url != '';

-- Create index for efficient lookups
CREATE INDEX idx_healing_resource_audio_files_resource_id 
  ON public.healing_resource_audio_files(resource_id);
