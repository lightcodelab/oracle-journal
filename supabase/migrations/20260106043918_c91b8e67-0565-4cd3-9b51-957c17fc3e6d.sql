-- Create a storage bucket for healing content files
INSERT INTO storage.buckets (id, name, public)
VALUES ('healing-content', 'healing-content', true);

-- Allow admins to upload files
CREATE POLICY "Admins can upload healing content files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'healing-content' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update files
CREATE POLICY "Admins can update healing content files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'healing-content' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete files
CREATE POLICY "Admins can delete healing content files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'healing-content' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow public read access (since bucket is public)
CREATE POLICY "Anyone can view healing content files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'healing-content');