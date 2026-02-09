
-- Create table for multiple audio files per lesson
CREATE TABLE public.lesson_audio_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lesson_audio_files ENABLE ROW LEVEL SECURITY;

-- Public read for published courses
CREATE POLICY "Anyone can read lesson audio for published courses"
  ON public.lesson_audio_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_id AND c.is_published = true
    )
  );

CREATE POLICY "Admins can read all lesson audio"
  ON public.lesson_audio_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert lesson audio"
  ON public.lesson_audio_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can update lesson audio"
  ON public.lesson_audio_files
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete lesson audio"
  ON public.lesson_audio_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Migrate existing lesson audio_url data
INSERT INTO public.lesson_audio_files (lesson_id, file_url, file_name, display_order)
SELECT id, audio_url,
  CASE 
    WHEN audio_url LIKE '%/%' THEN SPLIT_PART(audio_url, '/', -1)
    ELSE audio_url
  END,
  0
FROM public.lessons
WHERE audio_url IS NOT NULL AND audio_url != '';

CREATE INDEX idx_lesson_audio_files_lesson_id ON public.lesson_audio_files(lesson_id);
