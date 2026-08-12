DROP POLICY "Anyone can view published resources" ON public.content_resources;
CREATE POLICY "Members can view published resources" ON public.content_resources
FOR SELECT TO authenticated
USING (status = 'published'::content_status AND (public.has_full_temple_access(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY "Anyone can view published courses" ON public.content_courses;
CREATE POLICY "Members can view published courses" ON public.content_courses
FOR SELECT TO authenticated
USING (status = 'published'::content_status AND (public.has_full_temple_access(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY "Anyone can view published modules" ON public.content_modules;
CREATE POLICY "Members can view published modules" ON public.content_modules
FOR SELECT TO authenticated
USING (status = 'published'::content_status AND (public.has_full_temple_access(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY "Anyone can view published lessons" ON public.content_lessons;
CREATE POLICY "Members can view published lessons" ON public.content_lessons
FOR SELECT TO authenticated
USING (status = 'published'::content_status AND (public.has_full_temple_access(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY "Anyone can view attachments of published lessons" ON public.content_lesson_attachments;
CREATE POLICY "Members can view attachments of published lessons" ON public.content_lesson_attachments
FOR SELECT TO authenticated
USING (
  (public.has_full_temple_access(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  AND EXISTS (SELECT 1 FROM public.content_lessons l WHERE l.id = content_lesson_attachments.lesson_id AND l.status = 'published'::content_status)
);

DROP POLICY "Anyone can view attachments of published resources" ON public.content_resource_attachments;
CREATE POLICY "Members can view attachments of published resources" ON public.content_resource_attachments
FOR SELECT TO authenticated
USING (
  (public.has_full_temple_access(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  AND EXISTS (SELECT 1 FROM public.content_resources r WHERE r.id = content_resource_attachments.resource_id AND r.status = 'published'::content_status)
);

DROP POLICY "Anyone can view tags for published resources" ON public.content_resource_tag_assignments;
CREATE POLICY "Members can view tags for published resources" ON public.content_resource_tag_assignments
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_full_temple_access(auth.uid())
    AND EXISTS (SELECT 1 FROM public.content_resources r WHERE r.id = content_resource_tag_assignments.resource_id AND r.status = 'published'::content_status)
  )
);

REVOKE SELECT ON public.content_resources, public.content_courses, public.content_modules, public.content_lessons,
  public.content_resource_attachments, public.content_lesson_attachments, public.content_resource_tag_assignments FROM anon;