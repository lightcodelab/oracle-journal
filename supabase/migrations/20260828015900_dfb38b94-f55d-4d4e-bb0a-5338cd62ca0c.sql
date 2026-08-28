-- =====================================================================
-- LP-C.1 — Field Notes for Your Experiments (text only)
-- Private, owner-only. No media, no admin bypass, no Arrival coupling.
-- =====================================================================

CREATE TABLE public.living_experiments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_id         uuid REFERENCES public.living_states(id) ON DELETE SET NULL,
  guide_key        text,
  own_experiment   text,
  lifecycle        text NOT NULL DEFAULT 'active',
  schema_version   integer NOT NULL DEFAULT 1,
  content_revision integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  returned_at      timestamptz,
  CONSTRAINT living_experiments_lifecycle_chk CHECK (lifecycle IN ('active','returned','changed_course','stopped')),
  CONSTRAINT living_experiments_guide_chk CHECK (guide_key IS NULL OR guide_key IN (
    'make_it_smaller','meet_one_basic_need','ask_for_space','gather_one_fact',
    'borrow_steadiness','smaller_boundary','own')),
  CONSTRAINT living_experiments_own_len_chk CHECK (own_experiment IS NULL OR char_length(own_experiment) <= 2000),
  CONSTRAINT living_experiments_intent_chk CHECK (
    guide_key IS NOT NULL OR (own_experiment IS NOT NULL AND char_length(btrim(own_experiment)) > 0)),
  CONSTRAINT living_experiments_schema_version_chk CHECK (schema_version > 0),
  CONSTRAINT living_experiments_revision_chk CHECK (content_revision >= 0)
);
CREATE INDEX living_experiments_owner_time_idx ON public.living_experiments (user_id, created_at DESC, id DESC);
CREATE INDEX living_experiments_state_idx ON public.living_experiments (state_id);

COMMENT ON TABLE public.living_experiments IS
  'Field Notes for Your Experiments: owner-only voluntary experiment record (LP-C.1). No efficacy, score, or completion field exists by design.';

CREATE TABLE public.living_field_notes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id    uuid NOT NULL REFERENCES public.living_experiments(id) ON DELETE CASCADE,
  phase            text NOT NULL,
  body             text NOT NULL DEFAULT '',
  content          jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome          text,
  schema_version   integer NOT NULL DEFAULT 1,
  content_revision integer NOT NULL DEFAULT 0,
  recorded_at      timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT living_field_notes_phase_chk CHECK (phase IN ('try','notice','return')),
  CONSTRAINT living_field_notes_body_len_chk CHECK (char_length(body) <= 10000),
  CONSTRAINT living_field_notes_content_obj_chk CHECK (jsonb_typeof(content) = 'object'),
  CONSTRAINT living_field_notes_outcome_chk CHECK (outcome IS NULL OR outcome IN (
    'supported_prediction','complicated_prediction','contradicted_prediction',
    'insufficient_information','changed_course')),
  CONSTRAINT living_field_notes_outcome_phase_chk CHECK (outcome IS NULL OR phase = 'return'),
  CONSTRAINT living_field_notes_schema_version_chk CHECK (schema_version > 0),
  CONSTRAINT living_field_notes_revision_chk CHECK (content_revision >= 0)
);
CREATE UNIQUE INDEX living_field_notes_one_try_idx
  ON public.living_field_notes (experiment_id) WHERE phase = 'try';
CREATE UNIQUE INDEX living_field_notes_one_return_idx
  ON public.living_field_notes (experiment_id) WHERE phase = 'return';
CREATE INDEX living_field_notes_experiment_time_idx
  ON public.living_field_notes (experiment_id, recorded_at ASC, id ASC);

COMMENT ON TABLE public.living_field_notes IS
  'Field Notes: text-only Try / Notice / Return evidence for one experiment (LP-C.1). Ownership derives through living_experiments. No media, no analysis, no admin read.';

-- ---------------------------------------------------------------------
-- Privilege posture: service_role only.
-- ---------------------------------------------------------------------
REVOKE ALL ON public.living_experiments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.living_field_notes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.living_experiments TO service_role;
GRANT ALL ON public.living_field_notes TO service_role;

ALTER TABLE public.living_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_experiments FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.living_field_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_field_notes FORCE  ROW LEVEL SECURITY;

CREATE POLICY living_experiments_owner_only ON public.living_experiments
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY living_field_notes_owner_only ON public.living_field_notes
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.living_experiments e
    WHERE e.id = living_field_notes.experiment_id AND e.user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Extend accepted owner-only link / tag / ownership contracts
-- ---------------------------------------------------------------------
ALTER TABLE public.living_record_links DROP CONSTRAINT living_links_source_kind_chk;
ALTER TABLE public.living_record_links DROP CONSTRAINT living_links_target_kind_chk;
ALTER TABLE public.living_record_links
  ADD CONSTRAINT living_links_source_kind_chk CHECK (source_kind IN ('state','moment','pattern','experiment')),
  ADD CONSTRAINT living_links_target_kind_chk CHECK (target_kind IN ('state','moment','pattern','experiment'));

ALTER TABLE public.living_resource_tags DROP CONSTRAINT living_tags_target_kind_chk;
ALTER TABLE public.living_resource_tags
  ADD CONSTRAINT living_tags_target_kind_chk CHECK (target_kind IN ('state','moment','pattern','pattern_evidence','experiment','field_note'));

CREATE OR REPLACE FUNCTION public.living_owns_record(_uid uuid, _kind text, _id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE _kind
    WHEN 'state'   THEN EXISTS (SELECT 1 FROM public.living_states s   WHERE s.id = _id AND s.user_id = _uid)
    WHEN 'moment'  THEN EXISTS (SELECT 1 FROM public.temple_moments m  WHERE m.id = _id AND m.user_id = _uid)
    WHEN 'pattern' THEN EXISTS (SELECT 1 FROM public.living_patterns p WHERE p.id = _id AND p.user_id = _uid)
    WHEN 'pattern_evidence' THEN EXISTS (
      SELECT 1 FROM public.living_pattern_evidence e
      JOIN public.living_patterns p ON p.id = e.pattern_id
      WHERE e.id = _id AND p.user_id = _uid)
    WHEN 'experiment' THEN EXISTS (
      SELECT 1 FROM public.living_experiments x WHERE x.id = _id AND x.user_id = _uid)
    WHEN 'field_note' THEN EXISTS (
      SELECT 1 FROM public.living_field_notes fn
      JOIN public.living_experiments x2 ON x2.id = fn.experiment_id
      WHERE fn.id = _id AND x2.user_id = _uid)
    ELSE false
  END;
$$;
REVOKE ALL ON FUNCTION public.living_owns_record(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

-- =====================================================================
-- Experiment RPCs
-- =====================================================================
CREATE OR REPLACE FUNCTION public.living_experiment_create(
  _state_id uuid DEFAULT NULL,
  _guide_key text DEFAULT NULL,
  _own_experiment text DEFAULT NULL,
  _try_body text DEFAULT NULL,
  _try_content jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_experiments;
BEGIN
  IF (_guide_key IS NULL AND (_own_experiment IS NULL OR char_length(btrim(_own_experiment)) = 0))
     OR (_guide_key IS NOT NULL AND _guide_key NOT IN (
        'make_it_smaller','meet_one_basic_need','ask_for_space','gather_one_fact',
        'borrow_steadiness','smaller_boundary','own'))
     OR (_own_experiment IS NOT NULL AND char_length(_own_experiment) > 2000)
     OR (_try_body IS NOT NULL AND char_length(_try_body) > 10000)
     OR jsonb_typeof(coalesce(_try_content,'{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  IF _state_id IS NOT NULL AND NOT public.living_owns_record(v_uid, 'state', _state_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.living_experiments (user_id, state_id, guide_key, own_experiment)
  VALUES (v_uid, _state_id, _guide_key, nullif(btrim(coalesce(_own_experiment,'')), ''))
  RETURNING * INTO v_row;

  INSERT INTO public.living_field_notes (experiment_id, phase, body, content)
  VALUES (v_row.id, 'try', coalesce(_try_body,''), coalesce(_try_content,'{}'::jsonb));

  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_experiment_get(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_experiments; v_notes jsonb;
BEGIN
  SELECT * INTO v_row FROM public.living_experiments WHERE id = _id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(fn) ORDER BY fn.recorded_at ASC, fn.id ASC), '[]'::jsonb)
    INTO v_notes
  FROM public.living_field_notes fn
  WHERE fn.experiment_id = v_row.id;

  RETURN jsonb_build_object('experiment', to_jsonb(v_row) - 'user_id', 'field_notes', v_notes);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_experiments_list(
  _include_closed boolean DEFAULT true,
  _cursor_created_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL,
  _limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_n integer := least(greatest(coalesce(_limit,20),1),100); v_rows jsonb;
BEGIN
  IF (_cursor_created_at IS NULL) <> (_cursor_id IS NULL) THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(x ORDER BY (x->>'created_at') DESC, (x->>'id') DESC), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT (to_jsonb(e) - 'user_id') || jsonb_build_object(
             'notice_count', (SELECT count(*) FROM public.living_field_notes fn
                               WHERE fn.experiment_id = e.id AND fn.phase = 'notice'),
             'has_return', EXISTS (SELECT 1 FROM public.living_field_notes fr
                               WHERE fr.experiment_id = e.id AND fr.phase = 'return')) AS x
    FROM public.living_experiments e
    WHERE e.user_id = v_uid
      AND (_include_closed OR e.lifecycle = 'active')
      AND (_cursor_created_at IS NULL OR (e.created_at, e.id) < (_cursor_created_at, _cursor_id))
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT v_n
  ) q;
  RETURN jsonb_build_object('records', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_experiment_update(
  _id uuid,
  _expected_revision integer,
  _guide_key text DEFAULT NULL,
  _own_experiment text DEFAULT NULL,
  _lifecycle text DEFAULT NULL,
  _state_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_experiments;
BEGIN
  IF _id IS NULL OR _expected_revision IS NULL
     OR (_guide_key IS NOT NULL AND _guide_key NOT IN (
        'make_it_smaller','meet_one_basic_need','ask_for_space','gather_one_fact',
        'borrow_steadiness','smaller_boundary','own'))
     OR (_own_experiment IS NOT NULL AND char_length(_own_experiment) > 2000)
     OR (_lifecycle IS NOT NULL AND _lifecycle NOT IN ('active','returned','changed_course','stopped')) THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.living_experiments WHERE id = _id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.content_revision <> _expected_revision THEN
    RAISE EXCEPTION 'living_revision_conflict' USING ERRCODE = '55000';
  END IF;

  IF _state_id IS NOT NULL AND NOT public.living_owns_record(v_uid, 'state', _state_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.living_experiments SET
    guide_key        = coalesce(_guide_key, guide_key),
    own_experiment   = coalesce(nullif(btrim(coalesce(_own_experiment,'')), ''), own_experiment),
    lifecycle        = coalesce(_lifecycle, lifecycle),
    state_id         = coalesce(_state_id, state_id),
    content_revision = content_revision + 1,
    updated_at       = now()
  WHERE id = _id AND user_id = v_uid
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

-- =====================================================================
-- Field Note RPCs
-- =====================================================================
CREATE OR REPLACE FUNCTION public.living_field_note_create(
  _experiment_id uuid,
  _phase text,
  _body text DEFAULT NULL,
  _content jsonb DEFAULT '{}'::jsonb,
  _outcome text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_field_notes;
BEGIN
  IF _experiment_id IS NULL
     OR _phase IS NULL OR _phase NOT IN ('try','notice','return')
     OR (_body IS NOT NULL AND char_length(_body) > 10000)
     OR jsonb_typeof(coalesce(_content,'{}'::jsonb)) <> 'object'
     OR (_outcome IS NOT NULL AND (_phase <> 'return' OR _outcome NOT IN (
        'supported_prediction','complicated_prediction','contradicted_prediction',
        'insufficient_information','changed_course'))) THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  IF NOT public.living_owns_record(v_uid, 'experiment', _experiment_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _phase IN ('try','return') AND EXISTS (
      SELECT 1 FROM public.living_field_notes fn
      WHERE fn.experiment_id = _experiment_id AND fn.phase = _phase) THEN
    RAISE EXCEPTION 'living_conflict' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.living_field_notes (experiment_id, phase, body, content, outcome)
  VALUES (_experiment_id, _phase, coalesce(_body,''), coalesce(_content,'{}'::jsonb), _outcome)
  RETURNING * INTO v_row;

  IF _phase = 'return' THEN
    UPDATE public.living_experiments SET
      lifecycle   = CASE WHEN lifecycle = 'active' THEN 'returned' ELSE lifecycle END,
      returned_at = coalesce(returned_at, now()),
      updated_at  = now()
    WHERE id = _experiment_id AND user_id = v_uid;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_field_note_update(
  _id uuid,
  _expected_revision integer,
  _body text DEFAULT NULL,
  _content jsonb DEFAULT NULL,
  _outcome text DEFAULT NULL,
  _clear_outcome boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_field_notes;
BEGIN
  IF _id IS NULL OR _expected_revision IS NULL
     OR (_body IS NOT NULL AND char_length(_body) > 10000)
     OR (_content IS NOT NULL AND jsonb_typeof(_content) <> 'object')
     OR (_outcome IS NOT NULL AND _outcome NOT IN (
        'supported_prediction','complicated_prediction','contradicted_prediction',
        'insufficient_information','changed_course')) THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  IF NOT public.living_owns_record(v_uid, 'field_note', _id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_row FROM public.living_field_notes WHERE id = _id FOR UPDATE;
  IF v_row.content_revision <> _expected_revision THEN
    RAISE EXCEPTION 'living_revision_conflict' USING ERRCODE = '55000';
  END IF;
  IF _outcome IS NOT NULL AND v_row.phase <> 'return' THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  UPDATE public.living_field_notes SET
    body             = coalesce(_body, body),
    content          = coalesce(_content, content),
    outcome          = CASE WHEN _clear_outcome THEN NULL ELSE coalesce(_outcome, outcome) END,
    content_revision = content_revision + 1,
    updated_at       = now()
  WHERE id = _id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

-- =====================================================================
-- Owner-only chronological read model: include experiments and field notes
-- =====================================================================
CREATE OR REPLACE FUNCTION public.living_thread_page(
  _cursor_occurred_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid  uuid := public.living_caller();
  v_rows jsonb;
  v_last_at timestamptz;
  v_last_id uuid;
  v_count integer;
BEGIN
  IF (_cursor_occurred_at IS NULL) <> (_cursor_id IS NULL) THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  WITH u AS (
    SELECT 'state'::text AS kind, s.id AS rid, s.occurred_at AS oat, NULL::uuid AS parent_id,
           NULL::text AS label, s.content_revision AS rev, s.created_at AS cat, s.updated_at AS uat
      FROM public.living_states s WHERE s.user_id = v_uid
    UNION ALL
    SELECT 'moment', m.id, m.occurred_at, NULL::uuid,
           m.label, 0, m.created_at, m.updated_at
      FROM public.temple_moments m WHERE m.user_id = v_uid AND m.archived_at IS NULL
    UNION ALL
    SELECT 'pattern', p.id, p.chosen_at, NULL::uuid,
           p.label, p.content_revision, p.created_at, p.updated_at
      FROM public.living_patterns p WHERE p.user_id = v_uid
    UNION ALL
    SELECT 'pattern_evidence', e.id, e.occurred_at, e.pattern_id,
           NULL::text, e.content_revision, e.created_at, e.updated_at
      FROM public.living_pattern_evidence e
      JOIN public.living_patterns p2 ON p2.id = e.pattern_id
     WHERE p2.user_id = v_uid
    UNION ALL
    SELECT 'experiment', x.id, x.created_at, x.state_id,
           coalesce(x.guide_key, 'own'), x.content_revision, x.created_at, x.updated_at
      FROM public.living_experiments x WHERE x.user_id = v_uid
    UNION ALL
    SELECT 'field_note', fn.id, fn.recorded_at, fn.experiment_id,
           fn.phase, fn.content_revision, fn.created_at, fn.updated_at
      FROM public.living_field_notes fn
      JOIN public.living_experiments x2 ON x2.id = fn.experiment_id
     WHERE x2.user_id = v_uid
  ), page AS (
    SELECT * FROM u
     WHERE (_cursor_occurred_at IS NULL OR (u.oat, u.rid) < (_cursor_occurred_at, _cursor_id))
     ORDER BY u.oat DESC, u.rid DESC
     LIMIT 20
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
      'kind', page.kind, 'id', page.rid, 'occurred_at', page.oat,
      'parent_id', page.parent_id, 'label', page.label,
      'content_revision', page.rev, 'created_at', page.cat, 'updated_at', page.uat
    ) ORDER BY page.oat DESC, page.rid DESC), '[]'::jsonb),
    count(*)::integer
  INTO v_rows, v_count
  FROM page;

  IF v_count = 20 THEN
    v_last_at := (v_rows -> 19 ->> 'occurred_at')::timestamptz;
    v_last_id := (v_rows -> 19 ->> 'id')::uuid;
  END IF;

  RETURN jsonb_build_object(
    'records', v_rows,
    'next_cursor', CASE WHEN v_count = 20
      THEN jsonb_build_object('occurred_at', v_last_at, 'id', v_last_id)
      ELSE NULL END
  );
END;
$$;

-- =====================================================================
-- Function ACLs
-- =====================================================================
DO $acl$
DECLARE f text;
BEGIN
  FOR f IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN (
         'living_experiment_create','living_experiment_get','living_experiments_list',
         'living_experiment_update','living_field_note_create','living_field_note_update',
         'living_thread_page')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END
$acl$;