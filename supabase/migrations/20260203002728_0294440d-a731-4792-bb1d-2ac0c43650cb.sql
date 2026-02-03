-- Make content-main-media bucket public for displaying audio/video files
UPDATE storage.buckets SET public = true WHERE id = 'content-main-media';

-- Add RLS policy for public read access to content-main-media
CREATE POLICY "Anyone can view content main media"
ON storage.objects FOR SELECT
USING (bucket_id = 'content-main-media');

-- Keep upload/delete restricted to admins
CREATE POLICY "Admins can upload content main media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'content-main-media' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete content main media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'content-main-media' 
  AND public.has_role(auth.uid(), 'admin')
);