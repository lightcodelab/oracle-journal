-- Phase 4c: enforce XOR target on home_recommendations
-- Verify no conflicting rows exist first (0 rows currently).
DO $$
DECLARE
  conflicting int;
BEGIN
  SELECT count(*) INTO conflicting
  FROM public.home_recommendations
  WHERE resource_id IS NOT NULL AND internal_route IS NOT NULL;
  IF conflicting > 0 THEN
    RAISE EXCEPTION 'Cannot enforce XOR target: % rows have both resource_id and internal_route', conflicting;
  END IF;
END $$;

ALTER TABLE public.home_recommendations
  DROP CONSTRAINT IF EXISTS home_recommendations_target_check;

ALTER TABLE public.home_recommendations
  ADD CONSTRAINT home_recommendations_target_xor CHECK (
    (resource_id IS NOT NULL AND internal_route IS NULL)
    OR (resource_id IS NULL AND internal_route IS NOT NULL)
  );