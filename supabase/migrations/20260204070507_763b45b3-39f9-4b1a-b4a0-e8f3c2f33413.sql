-- Create conditions table for broader health conditions (e.g., Lupus, Cancer, Eczema)
CREATE TABLE public.conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on conditions
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;

-- Conditions are readable by all authenticated users
CREATE POLICY "Authenticated users can view conditions"
  ON public.conditions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can manage conditions (insert/update/delete via service role in admin context)
CREATE POLICY "Service role can manage conditions"
  ON public.conditions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create junction table for condition-resource mappings
CREATE TABLE public.condition_resource_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condition_id UUID NOT NULL REFERENCES public.conditions(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.healing_resources(id) ON DELETE CASCADE,
  priority_boost NUMERIC DEFAULT 1.5 CHECK (priority_boost >= 1.0 AND priority_boost <= 3.0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(condition_id, resource_id)
);

-- Enable RLS
ALTER TABLE public.condition_resource_mappings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view mappings
CREATE POLICY "Authenticated users can view condition mappings"
  ON public.condition_resource_mappings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Service role can manage mappings
CREATE POLICY "Service role can manage condition mappings"
  ON public.condition_resource_mappings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_condition_resource_mappings_condition_id ON public.condition_resource_mappings(condition_id);
CREATE INDEX idx_condition_resource_mappings_resource_id ON public.condition_resource_mappings(resource_id);
CREATE INDEX idx_conditions_name ON public.conditions(name);

-- Create trigger for updated_at on conditions
CREATE TRIGGER update_conditions_updated_at
  BEFORE UPDATE ON public.conditions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();