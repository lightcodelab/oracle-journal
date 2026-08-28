-- LP-E: optional originating Pattern for the shared Field Notes experiment contract.
ALTER TABLE public.living_experiments
  ADD COLUMN IF NOT EXISTS pattern_id uuid REFERENCES public.living_patterns(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS living_experiments_pattern_idx
  ON public.living_experiments (pattern_id, created_at DESC)
  WHERE pattern_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.living_experiment_create(
  _state_id uuid DEFAULT NULL::uuid,
  _guide_key text DEFAULT NULL::text,
  _own_experiment text DEFAULT NULL::text,
  _try_body text DEFAULT NULL::text,
  _try_content jsonb DEFAULT '{}'::jsonb,
  _moment_id uuid DEFAULT NULL::uuid,
  _pattern_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_experiments;
BEGIN
  IF (_guide_key IS NULL AND (_own_experiment IS NULL OR char_length(btrim(_own_experiment)) = 0))
     OR (_guide_key IS NOT NULL AND _guide_key NOT IN (
        'make_it_smaller','meet_one_basic_need','ask_for_space','gather_one_fact',
        'borrow_steadiness','smaller_boundary','hold_second_possibility','own'))
     OR (_own_experiment IS NOT NULL AND char_length(_own_experiment) > 2000)
     OR (_try_body IS NOT NULL AND char_length(_try_body) > 10000)
     OR jsonb_typeof(coalesce(_try_content,'{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  IF _state_id IS NOT NULL AND NOT public.living_owns_record(v_uid, 'state', _state_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _moment_id IS NOT NULL AND NOT public.living_owns_record(v_uid, 'moment', _moment_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _pattern_id IS NOT NULL AND NOT public.living_owns_record(v_uid, 'pattern', _pattern_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.living_experiments (user_id, state_id, moment_id, pattern_id, guide_key, own_experiment)
  VALUES (v_uid, _state_id, _moment_id, _pattern_id, _guide_key, nullif(btrim(coalesce(_own_experiment,'')), ''))
  RETURNING * INTO v_row;

  INSERT INTO public.living_field_notes (experiment_id, phase, body, content)
  VALUES (v_row.id, 'try', coalesce(_try_body,''), coalesce(_try_content,'{}'::jsonb));

  RETURN to_jsonb(v_row) - 'user_id';
END;
$function$;

DROP FUNCTION IF EXISTS public.living_experiment_create(uuid, text, text, text, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.living_experiment_update(
  _id uuid,
  _expected_revision integer,
  _guide_key text DEFAULT NULL::text,
  _own_experiment text DEFAULT NULL::text,
  _lifecycle text DEFAULT NULL::text,
  _state_id uuid DEFAULT NULL::uuid,
  _moment_id uuid DEFAULT NULL::uuid,
  _pattern_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_experiments; v_rev integer;
BEGIN
  IF _id IS NULL OR _expected_revision IS NULL
     OR (_guide_key IS NOT NULL AND _guide_key NOT IN (
        'make_it_smaller','meet_one_basic_need','ask_for_space','gather_one_fact',
        'borrow_steadiness','smaller_boundary','hold_second_possibility','own'))
     OR (_own_experiment IS NOT NULL AND char_length(_own_experiment) > 2000)
     OR (_lifecycle IS NOT NULL AND _lifecycle NOT IN ('active','returned','changed_course','stopped')) THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT content_revision INTO v_rev
  FROM public.living_experiments WHERE id = _id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_rev <> _expected_revision THEN
    RAISE EXCEPTION 'living_conflict' USING ERRCODE = '40001';
  END IF;

  IF _state_id IS NOT NULL AND NOT public.living_owns_record(v_uid, 'state', _state_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF _moment_id IS NOT NULL AND NOT public.living_owns_record(v_uid, 'moment', _moment_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF _pattern_id IS NOT NULL AND NOT public.living_owns_record(v_uid, 'pattern', _pattern_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.living_experiments SET
    guide_key      = coalesce(_guide_key, guide_key),
    own_experiment = coalesce(nullif(btrim(coalesce(_own_experiment,'')), ''), own_experiment),
    lifecycle      = coalesce(_lifecycle, lifecycle),
    state_id       = coalesce(_state_id, state_id),
    moment_id      = coalesce(_moment_id, moment_id),
    pattern_id     = coalesce(_pattern_id, pattern_id),
    returned_at    = CASE WHEN coalesce(_lifecycle, lifecycle) = 'active' THEN returned_at
                          ELSE coalesce(returned_at, now()) END,
    content_revision = content_revision + 1,
    updated_at     = now()
  WHERE id = _id AND user_id = v_uid
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$function$;

DROP FUNCTION IF EXISTS public.living_experiment_update(uuid, integer, text, text, text, uuid, uuid);

-- Pattern-scoped list of her own experiments, owner-derived only.
CREATE OR REPLACE FUNCTION public.living_pattern_experiments_list(_pattern_id uuid, _limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := public.living_caller(); v_n integer := least(greatest(coalesce(_limit,20),1),100); v_rows jsonb;
BEGIN
  IF NOT public.living_owns_record(v_uid, 'pattern', _pattern_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  SELECT coalesce(jsonb_agg(x ORDER BY (x->>'created_at') DESC, (x->>'id') DESC), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT to_jsonb(e) - 'user_id' AS x
    FROM public.living_experiments e
    WHERE e.user_id = v_uid AND e.pattern_id = _pattern_id
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT v_n
  ) q;
  RETURN jsonb_build_object('records', v_rows);
END;
$function$;

-- Re-assert ACLs: defaults can silently re-grant execution on (re)creation.
REVOKE ALL ON FUNCTION public.living_experiment_create(uuid, text, text, text, jsonb, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.living_experiment_update(uuid, integer, text, text, text, uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.living_pattern_experiments_list(uuid, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.living_experiment_create(uuid, text, text, text, jsonb, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_experiment_update(uuid, integer, text, text, text, uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_pattern_experiments_list(uuid, integer) TO authenticated, service_role;