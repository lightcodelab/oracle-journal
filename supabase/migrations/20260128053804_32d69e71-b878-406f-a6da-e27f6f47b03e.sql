-- Make the healing-content bucket private (admin-only access)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'healing-content';

-- Drop the permissive public read policy
DROP POLICY IF EXISTS "Anyone can view healing content files" ON storage.objects;

-- Create admin-only read policy
CREATE POLICY "Admins can view healing content files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'healing-content'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);