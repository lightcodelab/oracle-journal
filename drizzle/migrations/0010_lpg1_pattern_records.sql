-- LP-G.1 — one guided Pattern Record (Pause / Perceive / Practise) with a later Return.
-- Owner-only: forced RLS, no grants to anon/authenticated, all access through
-- SECURITY DEFINER functions that derive user_id from the session via living_caller().

CREATE TABLE public.pattern_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  schema_version integer NOT NULL DEFAULT 1,
  content_revision integer NOT NULL DEFAULT 0,

  -- Pause
  moment_text text NOT NULL,
  state_words text[] NOT NULL DEFAULT '{}',
  body_text text NOT NULL,
  body_cues text[] NOT NULL DEFAULT '{}',
  capacity text NOT NULL,

  -- Perceive
  meaning_text text NOT NULL,
  prediction_text text NOT NULL,
  familiarity text NOT NULL,
  protection_text text,

  -- Practise
  action_text text NOT NULL,
  identity_text text NOT NULL,
  continue_identity text NOT NULL,
  experiment_text text NOT NULL,

  initial_completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pattern_records_capacity_chk
    CHECK (capacity IN ('very_little','some_carefully','ordinary','more_than_usual')),
  CONSTRAINT pattern_records_familiarity_chk
    CHECK (familiarity IN ('very_familiar','a_little_familiar','new','not_sure_yet')),
  CONSTRAINT pattern_records_continue_chk
    CHECK (continue_identity IN ('yes','not_this_time','not_sure_yet')),
  -- Every initial answer must carry content; "I'm not sure yet" is a valid answer.
  CONSTRAINT pattern_records_required_text_chk CHECK (
    length(btrim(moment_text)) > 0
    AND length(btrim(body_text)) > 0
    AND length(btrim(meaning_text)) > 0
    AND length(btrim(prediction_text)) > 0
    AND length(btrim(action_text)) > 0
    AND length(btrim(identity_text)) > 0
    AND length(btrim(experiment_text)) > 0
  ),
  -- The protection question is asked, and required, only when the moment felt familiar.
  CONSTRAINT pattern_records_protection_chk CHECK (
    (familiarity IN ('very_familiar','a_little_familiar')
      AND protection_text IS NOT NULL AND length(btrim(protection_text)) > 0)
    OR (familiarity IN ('new','not_sure_yet') AND protection_text IS NULL)
  )
);

CREATE INDEX pattern_records_owner_time_idx
  ON public.pattern_records (user_id, occurred_at DESC, id DESC);

CREATE TABLE public.pattern_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.pattern_records(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1,
  content_revision integer NOT NULL DEFAULT 0,
  tried_text text NOT NULL,
  happened_text text NOT NULL,
  noticed_text text NOT NULL,
  prediction_outcome text NOT NULL,
  support_text text,
  carry_forward_text text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pattern_returns_outcome_chk
    CHECK (prediction_outcome IN ('came_true','partly_came_true','not_as_expected','not_sure_yet')),
  CONSTRAINT pattern_returns_required_text_chk CHECK (
    length(btrim(tried_text)) > 0
    AND length(btrim(happened_text)) > 0
    AND length(btrim(noticed_text)) > 0
    AND length(btrim(carry_forward_text)) > 0
  )
);

CREATE INDEX pattern_returns_record_idx
  ON public.pattern_returns (record_id, recorded_at DESC);

-- No GRANTs: `authenticated` and `anon` reach these tables only through the
-- owner-scoped SECURITY DEFINER functions below. service_role is intentionally
-- omitted so no edge function or admin path can read a member's records.
ALTER TABLE public.pattern_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_returns FORCE ROW LEVEL SECURITY;

CREATE POLICY pattern_records_owner_only ON public.pattern_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY pattern_returns_owner_only ON public.pattern_returns
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.pattern_records r
    WHERE r.id = pattern_returns.record_id AND r.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.pattern_records_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pattern_records_touch
  BEFORE UPDATE ON public.pattern_records
  FOR EACH ROW EXECUTE FUNCTION public.pattern_records_touch_updated_at();

CREATE TRIGGER pattern_returns_touch
  BEFORE UPDATE ON public.pattern_returns
  FOR EACH ROW EXECUTE FUNCTION public.pattern_records_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Owner-scoped access. user_id is always derived from the session, never passed in.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pattern_record_payload(_record_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'record', to_jsonb(r) - 'user_id',
    'returns', coalesce((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.recorded_at DESC)
      FROM public.pattern_returns t WHERE t.record_id = r.id
    ), '[]'::jsonb)
  )
  FROM public.pattern_records r
  WHERE r.id = _record_id;
$$;

CREATE OR REPLACE FUNCTION public.pattern_record_create(
  _moment_text text,
  _state_words text[],
  _body_text text,
  _body_cues text[],
  _capacity text,
  _meaning_text text,
  _prediction_text text,
  _familiarity text,
  _protection_text text DEFAULT NULL,
  _action_text text DEFAULT NULL,
  _identity_text text DEFAULT NULL,
  _continue_identity text DEFAULT NULL,
  _experiment_text text DEFAULT NULL,
  _occurred_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := public.living_caller();
  v_id uuid;
  v_protection text := nullif(btrim(coalesce(_protection_text, '')), '');
BEGIN
  IF _familiarity IN ('new','not_sure_yet') THEN
    v_protection := NULL;
  END IF;

  INSERT INTO public.pattern_records (
    user_id, occurred_at,
    moment_text, state_words, body_text, body_cues, capacity,
    meaning_text, prediction_text, familiarity, protection_text,
    action_text, identity_text, continue_identity, experiment_text
  ) VALUES (
    v_uid, coalesce(_occurred_at, now()),
    btrim(_moment_text), coalesce(_state_words, '{}'), btrim(_body_text),
    coalesce(_body_cues, '{}'), _capacity,
    btrim(_meaning_text), btrim(_prediction_text), _familiarity, v_protection,
    btrim(_action_text), btrim(_identity_text), _continue_identity, btrim(_experiment_text)
  ) RETURNING id INTO v_id;

  RETURN public.pattern_record_payload(v_id);
EXCEPTION
  WHEN check_violation THEN
    RAISE EXCEPTION 'living_incomplete_record' USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.pattern_record_get(_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.pattern_records WHERE id = _id;
  IF v_owner IS NULL OR v_owner <> v_uid THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN public.pattern_record_payload(_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.pattern_records_list(
  _cursor_occurred_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL,
  _limit integer DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := public.living_caller();
  v_limit integer := least(greatest(coalesce(_limit, 20), 1), 50);
  v_rows jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(x), '[]'::jsonb) INTO v_rows FROM (
    SELECT jsonb_build_object(
             'id', r.id,
             'occurred_at', r.occurred_at,
             'moment_text', r.moment_text,
             'state_words', r.state_words,
             'capacity', r.capacity,
             'familiarity', r.familiarity,
             'experiment_text', r.experiment_text,
             'content_revision', r.content_revision,
             'return_count', (SELECT count(*) FROM public.pattern_returns t WHERE t.record_id = r.id)
           ) AS x
    FROM public.pattern_records r
    WHERE r.user_id = v_uid
      AND (_cursor_occurred_at IS NULL
           OR (r.occurred_at, r.id) < (_cursor_occurred_at, coalesce(_cursor_id, r.id)))
    ORDER BY r.occurred_at DESC, r.id DESC
    LIMIT v_limit
  ) s;
  RETURN jsonb_build_object('records', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.pattern_record_update(
  _id uuid,
  _expected_revision integer,
  _moment_text text DEFAULT NULL,
  _state_words text[] DEFAULT NULL,
  _body_text text DEFAULT NULL,
  _body_cues text[] DEFAULT NULL,
  _capacity text DEFAULT NULL,
  _meaning_text text DEFAULT NULL,
  _prediction_text text DEFAULT NULL,
  _familiarity text DEFAULT NULL,
  _protection_text text DEFAULT NULL,
  _action_text text DEFAULT NULL,
  _identity_text text DEFAULT NULL,
  _continue_identity text DEFAULT NULL,
  _experiment_text text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.pattern_records;
BEGIN
  SELECT * INTO v_row FROM public.pattern_records WHERE id = _id AND user_id = v_uid;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.content_revision <> _expected_revision THEN
    RAISE EXCEPTION 'living_revision_conflict' USING ERRCODE = '40001';
  END IF;

  UPDATE public.pattern_records SET
    moment_text = coalesce(nullif(btrim(_moment_text), ''), moment_text),
    state_words = coalesce(_state_words, state_words),
    body_text = coalesce(nullif(btrim(_body_text), ''), body_text),
    body_cues = coalesce(_body_cues, body_cues),
    capacity = coalesce(_capacity, capacity),
    meaning_text = coalesce(nullif(btrim(_meaning_text), ''), meaning_text),
    prediction_text = coalesce(nullif(btrim(_prediction_text), ''), prediction_text),
    familiarity = coalesce(_familiarity, familiarity),
    protection_text = CASE
      WHEN coalesce(_familiarity, familiarity) IN ('new','not_sure_yet') THEN NULL
      ELSE coalesce(nullif(btrim(_protection_text), ''), protection_text)
    END,
    action_text = coalesce(nullif(btrim(_action_text), ''), action_text),
    identity_text = coalesce(nullif(btrim(_identity_text), ''), identity_text),
    continue_identity = coalesce(_continue_identity, continue_identity),
    experiment_text = coalesce(nullif(btrim(_experiment_text), ''), experiment_text),
    content_revision = content_revision + 1
  WHERE id = _id;

  RETURN public.pattern_record_payload(_id);
EXCEPTION
  WHEN check_violation THEN
    RAISE EXCEPTION 'living_incomplete_record' USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.pattern_return_create(
  _record_id uuid,
  _tried_text text,
  _happened_text text,
  _noticed_text text,
  _prediction_outcome text,
  _carry_forward_text text,
  _support_text text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.pattern_records WHERE id = _record_id;
  IF v_owner IS NULL OR v_owner <> v_uid THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.pattern_returns (
    record_id, tried_text, happened_text, noticed_text,
    prediction_outcome, support_text, carry_forward_text
  ) VALUES (
    _record_id, btrim(_tried_text), btrim(_happened_text), btrim(_noticed_text),
    _prediction_outcome, nullif(btrim(coalesce(_support_text, '')), ''), btrim(_carry_forward_text)
  );

  RETURN public.pattern_record_payload(_record_id);
EXCEPTION
  WHEN check_violation THEN
    RAISE EXCEPTION 'living_incomplete_record' USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.pattern_return_update(
  _id uuid,
  _expected_revision integer,
  _tried_text text DEFAULT NULL,
  _happened_text text DEFAULT NULL,
  _noticed_text text DEFAULT NULL,
  _prediction_outcome text DEFAULT NULL,
  _carry_forward_text text DEFAULT NULL,
  _support_text text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := public.living_caller();
  v_row public.pattern_returns;
  v_record uuid;
BEGIN
  SELECT t.* INTO v_row FROM public.pattern_returns t
  JOIN public.pattern_records r ON r.id = t.record_id
  WHERE t.id = _id AND r.user_id = v_uid;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.content_revision <> _expected_revision THEN
    RAISE EXCEPTION 'living_revision_conflict' USING ERRCODE = '40001';
  END IF;
  v_record := v_row.record_id;

  UPDATE public.pattern_returns SET
    tried_text = coalesce(nullif(btrim(_tried_text), ''), tried_text),
    happened_text = coalesce(nullif(btrim(_happened_text), ''), happened_text),
    noticed_text = coalesce(nullif(btrim(_noticed_text), ''), noticed_text),
    prediction_outcome = coalesce(_prediction_outcome, prediction_outcome),
    carry_forward_text = coalesce(nullif(btrim(_carry_forward_text), ''), carry_forward_text),
    support_text = coalesce(nullif(btrim(coalesce(_support_text, '')), ''), support_text),
    content_revision = content_revision + 1
  WHERE id = _id;

  RETURN public.pattern_record_payload(v_record);
EXCEPTION
  WHEN check_violation THEN
    RAISE EXCEPTION 'living_incomplete_record' USING ERRCODE = '22023';
END;
$$;

-- Records saved a while ago with no Return yet. An invitation, never an overdue task.
CREATE OR REPLACE FUNCTION public.pattern_records_awaiting_return(_min_age interval DEFAULT '2 days')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_rows jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(x ORDER BY (x->>'occurred_at') DESC), '[]'::jsonb) INTO v_rows FROM (
    SELECT jsonb_build_object(
             'id', r.id,
             'occurred_at', r.occurred_at,
             'moment_text', r.moment_text,
             'experiment_text', r.experiment_text
           ) AS x
    FROM public.pattern_records r
    WHERE r.user_id = v_uid
      AND r.occurred_at < now() - coalesce(_min_age, interval '2 days')
      AND NOT EXISTS (SELECT 1 FROM public.pattern_returns t WHERE t.record_id = r.id)
  ) s;
  RETURN jsonb_build_object('records', v_rows);
END;
$$;

-- Deterministic Common Themes: counts of her own controlled answers only. No
-- inference, no scoring, no clustering. Every count is traceable to its records.
CREATE OR REPLACE FUNCTION public.pattern_common_themes(_limit integer DEFAULT 8)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := public.living_caller();
  v_limit integer := least(greatest(coalesce(_limit, 8), 1), 25);
BEGIN
  RETURN jsonb_build_object(
    'state_words', coalesce((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object('value', w, 'count', count(*),
                 'record_ids', jsonb_agg(r.id)) AS x
        FROM public.pattern_records r, unnest(r.state_words) w
        WHERE r.user_id = v_uid
        GROUP BY w ORDER BY count(*) DESC, w LIMIT v_limit
      ) s), '[]'::jsonb),
    'body_cues', coalesce((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object('value', c, 'count', count(*),
                 'record_ids', jsonb_agg(r.id)) AS x
        FROM public.pattern_records r, unnest(r.body_cues) c
        WHERE r.user_id = v_uid
        GROUP BY c ORDER BY count(*) DESC, c LIMIT v_limit
      ) s), '[]'::jsonb),
    'capacity', coalesce((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object('value', r.capacity, 'count', count(*),
                 'record_ids', jsonb_agg(r.id)) AS x
        FROM public.pattern_records r WHERE r.user_id = v_uid
        GROUP BY r.capacity ORDER BY count(*) DESC, r.capacity
      ) s), '[]'::jsonb),
    'familiarity', coalesce((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object('value', r.familiarity, 'count', count(*),
                 'record_ids', jsonb_agg(r.id)) AS x
        FROM public.pattern_records r WHERE r.user_id = v_uid
        GROUP BY r.familiarity ORDER BY count(*) DESC, r.familiarity
      ) s), '[]'::jsonb),
    'continue_identity', coalesce((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object('value', r.continue_identity, 'count', count(*),
                 'record_ids', jsonb_agg(r.id)) AS x
        FROM public.pattern_records r WHERE r.user_id = v_uid
        GROUP BY r.continue_identity ORDER BY count(*) DESC, r.continue_identity
      ) s), '[]'::jsonb),
    'prediction_outcome', coalesce((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object('value', t.prediction_outcome, 'count', count(*),
                 'record_ids', jsonb_agg(t.record_id)) AS x
        FROM public.pattern_returns t
        JOIN public.pattern_records r ON r.id = t.record_id
        WHERE r.user_id = v_uid
        GROUP BY t.prediction_outcome ORDER BY count(*) DESC, t.prediction_outcome
      ) s), '[]'::jsonb),
    'repeated_meanings', coalesce((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object('value', lower(btrim(r.meaning_text)), 'count', count(*),
                 'record_ids', jsonb_agg(r.id)) AS x
        FROM public.pattern_records r WHERE r.user_id = v_uid
        GROUP BY lower(btrim(r.meaning_text)) HAVING count(*) > 1
        ORDER BY count(*) DESC LIMIT v_limit
      ) s), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pattern_record_payload(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pattern_record_payload(uuid) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.pattern_record_create(text, text[], text, text[], text, text, text, text, text, text, text, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pattern_record_get(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pattern_records_list(timestamptz, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pattern_record_update(uuid, integer, text, text[], text, text[], text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pattern_return_create(uuid, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pattern_return_update(uuid, integer, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pattern_records_awaiting_return(interval) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pattern_common_themes(integer) TO authenticated;
