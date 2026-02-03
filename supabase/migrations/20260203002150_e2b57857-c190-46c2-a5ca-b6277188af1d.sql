-- Make content-thumbnails bucket public for displaying images
UPDATE storage.buckets SET public = true WHERE id = 'content-thumbnails';

-- Add RLS policy for public read access to content-thumbnails
CREATE POLICY "Anyone can view content thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'content-thumbnails');

-- Keep upload/delete restricted to admins
CREATE POLICY "Admins can upload content thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'content-thumbnails' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete content thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'content-thumbnails' 
  AND public.has_role(auth.uid(), 'admin')
);