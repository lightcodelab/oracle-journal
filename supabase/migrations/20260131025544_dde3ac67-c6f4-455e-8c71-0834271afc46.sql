-- Add display_order column to tiers table
ALTER TABLE public.tiers ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Set display order for existing tiers
UPDATE public.tiers SET display_order = 1 WHERE code = 'T1';
UPDATE public.tiers SET display_order = 2 WHERE code = 'T2';
UPDATE public.tiers SET display_order = 3 WHERE code = 'T3';