-- LP-C.1 — extend the accepted owner-only link / tag contracts to experiments
-- and field notes. Neutral association only: no efficacy is ever recorded.

CREATE OR REPLACE FUNCTION public.living_link_create(
  _source_kind text, _source_id uuid, _target_kind text, _target_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_record_links;
BEGIN
  IF _source_kind IS NULL OR _target_kind IS NULL OR _source_id IS NULL OR _target_id IS NULL
     OR _source_kind NOT IN ('state','moment','pattern','experiment')
     OR _target_kind NOT IN ('state','moment','pattern','experiment') THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;
  IF _source_kind = _target_kind AND _source_id = _target_id THEN
    RAISE EXCEPTION 'living_self_link' USING ERRCODE = '22023';
  END IF;
  IF NOT public.living_owns_record(v_uid, _source_kind, _source_id)
     OR NOT public.living_owns_record(v_uid, _target_kind, _target_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  BEGIN
    INSERT INTO public.living_record_links (user_id, source_kind, source_id, target_kind, target_id, note)
    VALUES (v_uid, _source_kind, _source_id, _target_kind, _target_id, _note)
    RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'living_duplicate_link' USING ERRCODE = '23505';
  END;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_resource_tag_add(
  _target_kind text, _target_id uuid, _resource_family text, _resource_id uuid,
  _noticed_after text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_title text; v_row public.living_resource_tags;
BEGIN
  IF _target_kind IS NULL OR _target_id IS NULL OR _resource_family IS NULL OR _resource_id IS NULL
     OR _target_kind NOT IN ('state','moment','pattern','pattern_evidence','experiment','field_note')
     OR _resource_family NOT IN ('content_resource','healing_resource','course','lesson') THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;
  IF NOT public.living_owns_record(v_uid, _target_kind, _target_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_title := public.living_resource_title(_resource_family, _resource_id);
  IF v_title IS NULL OR char_length(btrim(v_title)) = 0 THEN
    RAISE EXCEPTION 'living_resource_unavailable' USING ERRCODE = 'P0002';
  END IF;

  BEGIN
    INSERT INTO public.living_resource_tags
      (user_id, target_kind, target_id, resource_family, resource_id, title_snapshot, noticed_after)
    VALUES (v_uid, _target_kind, _target_id, _resource_family, _resource_id, left(btrim(v_title), 500), _noticed_after)
    RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'living_duplicate_tag' USING ERRCODE = '23505';
  END;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

DO $acl$
DECLARE f text;
BEGIN
  FOR f IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('living_link_create','living_resource_tag_add')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END
$acl$;