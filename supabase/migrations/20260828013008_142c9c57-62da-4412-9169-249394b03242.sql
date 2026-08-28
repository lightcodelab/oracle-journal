-- 1. Remove general administrator read access to private member reflection
DROP POLICY IF EXISTS "Admins can view all journal entries" ON public.lesson_journal_entries;
DROP POLICY IF EXISTS "Admins read all entries" ON public.transformation_entries;

-- 2. Replace unconditional public SELECT on the private content-attachments bucket
DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;

CREATE POLICY "Admins can view attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'content-attachments'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Entitled members can view published attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'content-attachments'
  AND public.has_full_temple_access(auth.uid())
  AND (
    EXISTS (
      SELECT 1
      FROM public.content_resource_attachments a
      JOIN public.content_resources r ON r.id = a.resource_id
      WHERE r.status = 'published'::content_status
        AND a.file_url LIKE '%' || storage.objects.name
    )
    OR EXISTS (
      SELECT 1
      FROM public.content_lesson_attachments la
      JOIN public.content_lessons l ON l.id = la.lesson_id
      WHERE l.status = 'published'::content_status
        AND la.file_url LIKE '%' || storage.objects.name
    )
  )
);