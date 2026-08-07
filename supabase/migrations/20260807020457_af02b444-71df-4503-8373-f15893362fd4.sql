-- Slice 1: Arrival registry safety metadata + suspension

CREATE OR REPLACE FUNCTION public.arrival_codes_valid(_codes text[], _vocab text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _codes <@ _vocab
     AND coalesce(array_length(_codes, 1), 0) = (
           SELECT count(DISTINCT c)::int FROM unnest(_codes) AS c
         )
$$;

ALTER TABLE public.arrival_resource_registry
  ADD COLUMN suspended_at timestamptz NULL,
  ADD COLUMN suspension_reason text NULL,
  ADD COLUMN suspended_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN duration_minutes integer NULL,
  ADD COLUMN modality_codes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN intensity_level smallint NULL,
  ADD COLUMN sequence_stage smallint NULL,
  ADD COLUMN bridge_codes text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.arrival_resource_registry
  ADD CONSTRAINT arrival_registry_suspension_reason_ck CHECK (
    (suspended_at IS NULL AND suspension_reason IS NULL)
    OR (suspended_at IS NOT NULL AND btrim(coalesce(suspension_reason, '')) <> '')
  ),
  ADD CONSTRAINT arrival_registry_duration_ck CHECK (
    duration_minutes IS NULL OR duration_minutes > 0
  ),
  ADD CONSTRAINT arrival_registry_intensity_ck CHECK (
    intensity_level IS NULL OR intensity_level BETWEEN 1 AND 3
  ),
  ADD CONSTRAINT arrival_registry_sequence_ck CHECK (
    sequence_stage IS NULL OR sequence_stage BETWEEN 1 AND 3
  ),
  ADD CONSTRAINT arrival_registry_modality_vocab_ck CHECK (
    public.arrival_codes_valid(modality_codes, ARRAY[
      'meditation','visualisation','ritual','somatic','process','recipe'
    ]::text[])
  ),
  ADD CONSTRAINT arrival_registry_bridge_vocab_ck CHECK (
    public.arrival_codes_valid(bridge_codes, ARRAY[
      'establish_safety','settle','anchor','contain','comfort','reduce_demand',
      'restore','replenish','separate','release','stabilise','orient',
      'reconnect','clarify','reveal','express','discharge','restore_agency',
      'integrate','embody','deepen'
    ]::text[])
  );

CREATE INDEX arrival_registry_not_suspended_idx
  ON public.arrival_resource_registry (id) WHERE suspended_at IS NULL;
CREATE INDEX arrival_registry_bridge_codes_idx
  ON public.arrival_resource_registry USING gin (bridge_codes);
CREATE INDEX arrival_registry_modality_codes_idx
  ON public.arrival_resource_registry USING gin (modality_codes);

-- Preserve zero client grants; service_role only
REVOKE ALL ON public.arrival_resource_registry FROM anon, authenticated;
GRANT ALL ON public.arrival_resource_registry TO service_role;

CREATE OR REPLACE FUNCTION public.arrival_admin_suspend_resource(
  _registry_id uuid,
  _reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin uuid;
BEGIN
  _admin := public.assert_caller_is_admin();

  IF btrim(coalesce(_reason, '')) = '' THEN
    RAISE EXCEPTION 'suspension reason is required';
  END IF;

  UPDATE public.arrival_resource_registry
     SET suspended_at = now(),
         suspension_reason = btrim(_reason),
         suspended_by = _admin,
         updated_at = now()
   WHERE id = _registry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'registry row % not found', _registry_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.arrival_admin_unsuspend_resource(
  _registry_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_caller_is_admin();

  UPDATE public.arrival_resource_registry
     SET suspended_at = NULL,
         suspension_reason = NULL,
         suspended_by = NULL,
         updated_at = now()
   WHERE id = _registry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'registry row % not found', _registry_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.arrival_admin_suspend_resource(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.arrival_admin_unsuspend_resource(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arrival_admin_suspend_resource(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arrival_admin_unsuspend_resource(uuid) TO authenticated, service_role;

COMMENT ON COLUMN public.arrival_resource_registry.bridge_codes IS
  'Locked controlled vocabulary of 21 bridge-movement codes. No synonyms, aliases, free text, or Search-tag derivation.';
