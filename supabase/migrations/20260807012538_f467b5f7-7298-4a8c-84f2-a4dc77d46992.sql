-- Security fix: close tier-bypass holes in child media/audio tables
-- so that paid/member-only content cannot be read directly without
-- the same entitlement checks enforced on the parent tables.

-- 1. healing_resource_audio_files: mirror healing_resources tier rules
DROP POLICY IF EXISTS "Anyone can read audio files for published resources" ON public.healing_resource_audio_files;

CREATE POLICY "Public can read free audio files for published resources"
ON public.healing_resource_audio_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.healing_resources hr
    WHERE hr.id = resource_id
      AND hr.status = 'published'::resource_status
      AND (hr.tier IS NULL OR hr.tier = 'free')
  )
);

CREATE POLICY "Entitled users can read paid audio files for published resources"
ON public.healing_resource_audio_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.healing_resources hr
    WHERE hr.id = resource_id
      AND hr.status = 'published'::resource_status
      AND hr.tier = 'paid'
      AND public.has_full_temple_access(auth.uid())
  )
);

-- 2. resource_media: mirror healing_resources tier rules
DROP POLICY IF EXISTS "Users can view media for published resources" ON public.resource_media;

CREATE POLICY "Public can view free media for published resources"
ON public.resource_media
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.healing_resources hr
    WHERE hr.id = resource_id
      AND hr.status = 'published'::resource_status
      AND (hr.tier IS NULL OR hr.tier = 'free')
  )
);

CREATE POLICY "Entitled users can view paid media for published resources"
ON public.resource_media
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.healing_resources hr
    WHERE hr.id = resource_id
      AND hr.status = 'published'::resource_status
      AND hr.tier = 'paid'
      AND public.has_full_temple_access(auth.uid())
  )
);

-- 3. lesson_audio_files: require the same door/membership check as lessons
DROP POLICY IF EXISTS "Anyone can read lesson audio for published courses" ON public.lesson_audio_files;

CREATE POLICY "Entitled users can read lesson audio for published courses"
ON public.lesson_audio_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_id
      AND c.is_published = true
      AND (
        public.can_view_lesson_by_door(auth.uid(), l.course_id)
        OR public.has_full_temple_access(auth.uid())
      )
  )
);