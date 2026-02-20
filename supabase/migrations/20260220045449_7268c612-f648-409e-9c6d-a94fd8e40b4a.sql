
-- Fix overly permissive RLS policies on conditions table
DROP POLICY "Service role can manage conditions" ON public.conditions;
CREATE POLICY "Admins can manage conditions"
ON public.conditions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix overly permissive RLS policies on condition_resource_mappings table
DROP POLICY "Service role can manage condition mappings" ON public.condition_resource_mappings;
CREATE POLICY "Admins can manage condition mappings"
ON public.condition_resource_mappings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
