DROP POLICY IF EXISTS "Users can view published resources" ON public.healing_resources;

CREATE POLICY "Public can view free published resources"
ON public.healing_resources
FOR SELECT
USING (
  status = 'published'::resource_status
  AND (tier IS NULL OR tier = 'free')
);

CREATE POLICY "Entitled users can view paid published resources"
ON public.healing_resources
FOR SELECT
TO authenticated
USING (
  status = 'published'::resource_status
  AND tier = 'paid'
  AND public.has_full_temple_access(auth.uid())
);