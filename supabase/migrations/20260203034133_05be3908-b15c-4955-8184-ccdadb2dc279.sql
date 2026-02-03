-- Add new columns to healing_resources for rich content and media
ALTER TABLE public.healing_resources 
ADD COLUMN IF NOT EXISTS vimeo_embed_url TEXT,
ADD COLUMN IF NOT EXISTS body_richtext JSONB;

-- Create junction table for symptom-resource mappings
CREATE TABLE IF NOT EXISTS public.resource_symptom_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.healing_resources(id) ON DELETE CASCADE,
  symptom_id UUID NOT NULL REFERENCES public.symptoms(id) ON DELETE CASCADE,
  severity_weight INTEGER DEFAULT 1 CHECK (severity_weight >= 1 AND severity_weight <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(resource_id, symptom_id)
);

-- Enable RLS
ALTER TABLE public.resource_symptom_mappings ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can manage symptom mappings
CREATE POLICY "Admins can manage resource symptom mappings"
ON public.resource_symptom_mappings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to read mappings (for the recommendation engine)
CREATE POLICY "Authenticated users can view resource symptom mappings"
ON public.resource_symptom_mappings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create storage bucket for healing resource images
INSERT INTO storage.buckets (id, name, public)
VALUES ('healing-resource-images', 'healing-resource-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket
CREATE POLICY "Public can view healing resource images"
ON storage.objects FOR SELECT
USING (bucket_id = 'healing-resource-images');

CREATE POLICY "Admins can upload healing resource images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'healing-resource-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update healing resource images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'healing-resource-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete healing resource images"
ON storage.objects FOR DELETE
USING (bucket_id = 'healing-resource-images' AND has_role(auth.uid(), 'admin'::app_role));