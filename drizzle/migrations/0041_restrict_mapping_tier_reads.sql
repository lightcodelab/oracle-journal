DROP POLICY IF EXISTS "Anyone can view symptom resource mappings" ON public.symptom_resource_mappings;
CREATE POLICY "Signed-in users can view symptom resource mappings" ON public.symptom_resource_mappings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anyone can view tier bucket access" ON public.tier_bucket_access;
CREATE POLICY "Signed-in users can view tier bucket access" ON public.tier_bucket_access FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.symptom_resource_mappings FROM anon;
REVOKE SELECT ON public.tier_bucket_access FROM anon;
GRANT SELECT ON public.symptom_resource_mappings TO authenticated;
GRANT SELECT ON public.tier_bucket_access TO authenticated;