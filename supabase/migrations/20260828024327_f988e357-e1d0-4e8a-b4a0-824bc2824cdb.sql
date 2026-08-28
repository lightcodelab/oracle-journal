-- LP-D: Presence / Moments of Meaning. Additive, owner-only, RPC-only.

ALTER TABLE public.temple_moments
  ADD COLUMN IF NOT EXISTS content_revision integer NOT NULL DEFAULT 0;

ALTER TABLE public.temple_moments
  DROP CONSTRAINT IF EXISTS temple_moments_content_revision_chk;
ALTER TABLE public.temple_moments
  ADD CONSTRAINT temple_moments_content_revision_chk CHECK (content_revision >= 0);

ALTER TABLE public.living_experiments
  ADD COLUMN IF NOT EXISTS moment_id uuid REFERENCES public.temple_moments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS living_experiments_moment_idx
  ON public.living_experiments (user_id, moment_id);

CREATE INDEX IF NOT EXISTS temple_moments_owner_occurred_idx
  ON public.temple_moments (user_id, occurred_at DESC, id DESC);

-- Service role only. No PUBLIC / anon / authenticated table privileges.
REVOKE ALL ON public.temple_moments FROM PUBLIC;
REVOKE ALL ON public.temple_moment_movements FROM PUBLIC;
GRANT ALL ON public.temple_moments TO service_role;
GRANT ALL ON public.temple_moment_movements TO service_role;

-- ---------------------------------------------------------------- helpers

CREATE OR REPLACE FUNCTION public.living_moment_payload(_moment_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'moment', to_jsonb(m) - 'user_id',
    'movements', coalesce((
      SELECT jsonb_object_agg(mv.movement_code, jsonb_build_object(
        'content', mv.content,
        'content_revision', mv.content_revision,
        'updated_at', mv.updated_at))
      FROM public.temple_moment_movements mv
      WHERE mv.moment_id = m.id), '{}'::jsonb)
  )
  FROM public.temple_moments m
  WHERE m.id = _moment_id;
$$;

-- ---------------------------------------------------------------- create

CREATE OR REPLACE FUNCTION public.living_moment_create(
  _occurred_at timestamptz DEFAULT NULL,
  _label text DEFAULT NULL,
  _register jsonb DEFAULT '{}'::jsonb,
  _recognise jsonb DEFAULT '{}'::jsonb,
  _recalibrate jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_id uuid;
BEGIN
  IF jsonb_typeof(coalesce(_register,'{}'::jsonb)) <> 'object'
     OR jsonb_typeof(coalesce(_recognise,'{}'::jsonb)) <> 'object'
     OR jsonb_typeof(coalesce(_recalibrate,'{}'::jsonb)) <> 'object'
     OR char_length(coalesce(_register,'{}'::jsonb)::text) > 40000
     OR char_length(coalesce(_recognise,'{}'::jsonb)::text) > 40000
     OR char_length(coalesce(_recalibrate,'{}'::jsonb)::text) > 40000 THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.temple_moments (user_id, label, occurred_at)
  VALUES (v_uid, nullif(btrim(coalesce(_label,'')), ''), coalesce(_occurred_at, now()))
  RETURNING id INTO v_id;

  INSERT INTO public.temple_moment_movements (moment_id, movement_code, content)
  VALUES (v_id, 'register',    coalesce(_register,'{}'::jsonb)),
         (v_id, 'recognise',   coalesce(_recognise,'{}'::jsonb)),
         (v_id, 'recalibrate', coalesce(_recalibrate,'{}'::jsonb));

  RETURN public.living_moment_payload(v_id);
END;
$$;

-- ---------------------------------------------------------------- get

CREATE OR REPLACE FUNCTION public.living_moment_get(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller();
BEGIN
  IF NOT public.living_owns_record(v_uid, 'moment', _id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN public.living_moment_payload(_id);
END;
$$;

-- ---------------------------------------------------------------- update

CREATE OR REPLACE FUNCTION public.living_moment_update(
  _id uuid,
  _expected_revision integer,
  _label text DEFAULT NULL,
  _clear_label boolean DEFAULT false,
  _occurred_at timestamptz DEFAULT NULL,
  _register jsonb DEFAULT NULL,
  _recognise jsonb DEFAULT NULL,
  _recalibrate jsonb DEFAULT NULL,
  _archive boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_rev integer;
BEGIN
  IF _id IS NULL OR _expected_revision IS NULL THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  IF (_register IS NOT NULL AND (jsonb_typeof(_register) <> 'object' OR char_length(_register::text) > 40000))
     OR (_recognise IS NOT NULL AND (jsonb_typeof(_recognise) <> 'object' OR char_length(_recognise::text) > 40000))
     OR (_recalibrate IS NOT NULL AND (jsonb_typeof(_recalibrate) <> 'object' OR char_length(_recalibrate::text) > 40000)) THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT content_revision INTO v_rev
  FROM public.temple_moments
  WHERE id = _id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_rev <> _expected_revision THEN
    RAISE EXCEPTION 'living_conflict' USING ERRCODE = '40001';
  END IF;

  UPDATE public.temple_moments SET
    label = CASE WHEN _clear_label THEN NULL
                 WHEN _label IS NOT NULL THEN nullif(btrim(_label), '')
                 ELSE label END,
    occurred_at = coalesce(_occurred_at, occurred_at),
    archived_at = CASE WHEN _archive IS TRUE THEN coalesce(archived_at, now())
                       WHEN _archive IS FALSE THEN NULL
                       ELSE archived_at END,
    content_revision = content_revision + 1,
    updated_at = now()
  WHERE id = _id AND user_id = v_uid;

  UPDATE public.temple_moment_movements mv SET
    content = CASE mv.movement_code
                WHEN 'register'    THEN coalesce(_register, mv.content)
                WHEN 'recognise'   THEN coalesce(_recognise, mv.content)
                WHEN 'recalibrate' THEN coalesce(_recalibrate, mv.content)
                ELSE mv.content END,
    content_revision = mv.content_revision + CASE
      WHEN (mv.movement_code = 'register'    AND _register    IS NOT NULL)
        OR (mv.movement_code = 'recognise'   AND _recognise   IS NOT NULL)
        OR (mv.movement_code = 'recalibrate' AND _recalibrate IS NOT NULL) THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE mv.moment_id = _id;

  RETURN public.living_moment_payload(_id);
END;
$$;

-- ---------------------------------------------------------------- list

CREATE OR REPLACE FUNCTION public.living_moments_list(
  _include_archived boolean DEFAULT false,
  _cursor_occurred_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL,
  _limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller();
        v_n integer := least(greatest(coalesce(_limit,20),1),100);
        v_rows jsonb;
BEGIN
  IF (_cursor_occurred_at IS NULL) <> (_cursor_id IS NULL) THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(q.x ORDER BY (q.x->>'occurred_at') DESC, (q.x->>'id') DESC), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT jsonb_build_object(
             'id', m.id,
             'label', m.label,
             'occurred_at', m.occurred_at,
             'created_at', m.created_at,
             'updated_at', m.updated_at,
             'archived_at', m.archived_at,
             'content_revision', m.content_revision,
             'register', coalesce((SELECT mv.content FROM public.temple_moment_movements mv
                                    WHERE mv.moment_id = m.id AND mv.movement_code = 'register'), '{}'::jsonb),
             'experiment_count', (SELECT count(*) FROM public.living_experiments x
                                   WHERE x.moment_id = m.id AND x.user_id = v_uid)
           ) AS x
    FROM public.temple_moments m
    WHERE m.user_id = v_uid
      AND (_include_archived OR m.archived_at IS NULL)
      AND (_cursor_occurred_at IS NULL OR (m.occurred_at, m.id) < (_cursor_occurred_at, _cursor_id))
    ORDER BY m.occurred_at DESC, m.id DESC
    LIMIT v_n
  ) q;

  RETURN jsonb_build_object('records', v_rows);
END;
$$;

-- ------------------------------------- experiment may originate from a Moment

DROP FUNCTION IF EXISTS public.living_experiment_create(uuid, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.living_experiment_create(
  _state_id uuid DEFAULT NULL,
  _guide_key text DEFAULT NULL,
  _own_experiment text DEFAULT NULL,
  _try_body text DEFAULT NULL,
  _try_content jsonb DEFAULT '{}'::jsonb,
  _moment_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  INSERT INTO public.living_experiments (user_id, state_id, moment_id, guide_key, own_experiment)
  VALUES (v_uid, _state_id, _moment_id, _guide_key, nullif(btrim(coalesce(_own_experiment,'')), ''))
  RETURNING * INTO v_row;

  INSERT INTO public.living_field_notes (experiment_id, phase, body, content)
  VALUES (v_row.id, 'try', coalesce(_try_body,''), coalesce(_try_content,'{}'::jsonb));

  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_experiment_update(
  _id uuid,
  _expected_revision integer,
  _guide_key text DEFAULT NULL,
  _own_experiment text DEFAULT NULL,
  _lifecycle text DEFAULT NULL,
  _state_id uuid DEFAULT NULL,
  _moment_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  UPDATE public.living_experiments SET
    guide_key      = coalesce(_guide_key, guide_key),
    own_experiment = coalesce(nullif(btrim(coalesce(_own_experiment,'')), ''), own_experiment),
    lifecycle      = coalesce(_lifecycle, lifecycle),
    state_id       = coalesce(_state_id, state_id),
    moment_id      = coalesce(_moment_id, moment_id),
    returned_at    = CASE WHEN coalesce(_lifecycle, lifecycle) = 'active' THEN returned_at
                          ELSE coalesce(returned_at, now()) END,
    content_revision = content_revision + 1,
    updated_at     = now()
  WHERE id = _id AND user_id = v_uid
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

-- ---------------------------------------------------------------- ACLs

REVOKE ALL ON FUNCTION public.living_moment_payload(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_moment_create(timestamptz, text, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_moment_get(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_moment_update(uuid, integer, text, boolean, timestamptz, jsonb, jsonb, jsonb, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_moments_list(boolean, timestamptz, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_experiment_create(uuid, text, text, text, jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_experiment_update(uuid, integer, text, text, text, uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.living_moment_create(timestamptz, text, jsonb, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_moment_get(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_moment_update(uuid, integer, text, boolean, timestamptz, jsonb, jsonb, jsonb, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_moments_list(boolean, timestamptz, uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_experiment_create(uuid, text, text, text, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.living_experiment_update(uuid, integer, text, text, text, uuid, uuid) TO authenticated, service_role;
