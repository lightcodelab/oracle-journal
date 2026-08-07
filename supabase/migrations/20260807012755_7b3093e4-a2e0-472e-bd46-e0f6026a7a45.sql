-- healing_resources: single gated read policy
DROP POLICY IF EXISTS "Public can view free published resources" ON public.healing_resources;
DROP POLICY IF EXISTS "Entitled users can view paid published resources" ON public.healing_resources;
CREATE POLICY "Entitled users can view published resources"
ON public.healing_resources FOR SELECT TO authenticated
USING (status = 'published'::resource_status AND public.has_full_temple_access(auth.uid()));

-- resource_media
DROP POLICY IF EXISTS "Public can view free media for published resources" ON public.resource_media;
DROP POLICY IF EXISTS "Entitled users can view paid media for published resources" ON public.resource_media;
CREATE POLICY "Entitled users can view media for published resources"
ON public.resource_media FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.healing_resources hr
  WHERE hr.id = resource_media.resource_id
    AND hr.status = 'published'::resource_status
    AND public.has_full_temple_access(auth.uid())
));

-- healing_resource_audio_files
DROP POLICY IF EXISTS "Public can read free audio files for published resources" ON public.healing_resource_audio_files;
DROP POLICY IF EXISTS "Entitled users can read paid audio files for published resource" ON public.healing_resource_audio_files;
CREATE POLICY "Entitled users can read audio files for published resources"
ON public.healing_resource_audio_files FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.healing_resources hr
  WHERE hr.id = healing_resource_audio_files.resource_id
    AND hr.status = 'published'::resource_status
    AND public.has_full_temple_access(auth.uid())
));

-- resource_transcripts
DROP POLICY IF EXISTS "Users can view transcripts for published resources" ON public.resource_transcripts;
CREATE POLICY "Entitled users can view transcripts for published resources"
ON public.resource_transcripts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.healing_resources hr
  WHERE hr.id = resource_transcripts.resource_id
    AND hr.status = 'published'::resource_status
    AND public.has_full_temple_access(auth.uid())
));

-- Tighten grants: no anonymous reads of resource content
REVOKE SELECT ON public.healing_resources FROM anon;
REVOKE SELECT ON public.resource_media FROM anon;
REVOKE SELECT ON public.healing_resource_audio_files FROM anon;
REVOKE SELECT ON public.resource_transcripts FROM anon;
GRANT SELECT ON public.healing_resources TO authenticated;
GRANT SELECT ON public.resource_media TO authenticated;
GRANT SELECT ON public.healing_resource_audio_files TO authenticated;
GRANT SELECT ON public.resource_transcripts TO authenticated;
GRANT ALL ON public.healing_resources TO service_role;
GRANT ALL ON public.resource_media TO service_role;
GRANT ALL ON public.healing_resource_audio_files TO service_role;
GRANT ALL ON public.resource_transcripts TO service_role;