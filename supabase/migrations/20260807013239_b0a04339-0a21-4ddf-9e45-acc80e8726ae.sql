-- resource_tag_assignments
DROP POLICY IF EXISTS "Users can view tags for published resources" ON public.resource_tag_assignments;
CREATE POLICY "Entitled users can view tags for published resources"
ON public.resource_tag_assignments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.healing_resources hr
  WHERE hr.id = resource_tag_assignments.resource_id
    AND hr.status = 'published'::resource_status
    AND public.has_full_temple_access(auth.uid())
));

-- resource_teachers
DROP POLICY IF EXISTS "Users can view teachers for published resources" ON public.resource_teachers;
CREATE POLICY "Entitled users can view teachers for published resources"
ON public.resource_teachers FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.healing_resources hr
  WHERE hr.id = resource_teachers.resource_id
    AND hr.status = 'published'::resource_status
    AND public.has_full_temple_access(auth.uid())
));

-- session_replays
DROP POLICY IF EXISTS "Anyone can view published replays" ON public.session_replays;
CREATE POLICY "Entitled users can view published replays"
ON public.session_replays FOR SELECT TO authenticated
USING (is_published = true AND public.has_full_temple_access(auth.uid()));

-- Storage: replace Tier-3 gate on replay videos with full Temple access
DROP POLICY IF EXISTS "Tier 3 members can view replay videos" ON storage.objects;
CREATE POLICY "Entitled members can view replay videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'session-replays' AND public.has_full_temple_access(auth.uid()));

-- Tighten grants
REVOKE SELECT ON public.resource_tag_assignments FROM anon;
REVOKE SELECT ON public.resource_teachers FROM anon;
REVOKE SELECT ON public.session_replays FROM anon;
GRANT SELECT ON public.resource_tag_assignments TO authenticated;
GRANT SELECT ON public.resource_teachers TO authenticated;
GRANT SELECT ON public.session_replays TO authenticated;
GRANT ALL ON public.resource_tag_assignments TO service_role;
GRANT ALL ON public.resource_teachers TO service_role;
GRANT ALL ON public.session_replays TO service_role;