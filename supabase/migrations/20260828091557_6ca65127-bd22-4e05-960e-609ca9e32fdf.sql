REVOKE ALL ON public.living_media_attachments FROM anon, authenticated;
REVOKE ALL ON public.living_media_deletions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.living_media_owns_path(_uid uuid, _path text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _uid IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.living_media_attachments a
    WHERE a.object_path = _path AND a.user_id = _uid
  );
$$;

REVOKE ALL ON FUNCTION public.living_media_owns_path(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.living_media_owns_path(uuid, text) TO authenticated;

DROP POLICY "Owner reads her own Field Note media" ON storage.objects;
DROP POLICY "Owner uploads her own Field Note media" ON storage.objects;
DROP POLICY "Owner deletes her own Field Note media" ON storage.objects;

CREATE POLICY "Owner reads her own Field Note media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'living-field-note-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.has_full_temple_access(auth.uid())
  AND public.living_media_owns_path(auth.uid(), name)
);

CREATE POLICY "Owner uploads her own Field Note media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'living-field-note-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.has_full_temple_access(auth.uid())
  AND public.living_media_owns_path(auth.uid(), name)
);

CREATE POLICY "Owner deletes her own Field Note media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'living-field-note-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.has_full_temple_access(auth.uid())
);