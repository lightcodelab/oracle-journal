-- Arrival-B3.1 : member RPCs (start/resume + read-only load) and the shared,
-- non-client-callable questionnaire payload helper. Append-only.

CREATE OR REPLACE FUNCTION public._arrival_questionnaire_payload(
  _interaction_id uuid,
  _user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_i        public.arrival_interactions;
  v_payload  jsonb;
BEGIN
  IF _interaction_id IS NULL OR _user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT i.* INTO v_i
  FROM public.arrival_interactions i
  WHERE i.id = _interaction_id
    AND i.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'interaction', jsonb_build_object(
      'id', v_i.id,
      'state', v_i.state,
      'answers_revision', v_i.answers_revision,
      'started_at', v_i.started_at,
      'completed_at', v_i.completed_at,
      'abandoned_at', v_i.abandoned_at,
      'questionnaire_version_id', v_i.questionnaire_version_id,
      'rule_version_id', v_i.rule_version_id
    ),
    'questionnaire', (
      SELECT jsonb_build_object(
        'id', qv.id,
        'version_number', qv.version_number,
        'label', qv.label,
        'status', qv.status,
        'published_at', qv.published_at
      )
      FROM public.arrival_questionnaire_versions qv
      WHERE qv.id = v_i.questionnaire_version_id
    ),
    'questions', COALESCE((
      SELECT jsonb_agg(q_obj ORDER BY q_order)
      FROM (
        SELECT
          q.display_order AS q_order,
          jsonb_build_object(
            'id', q.id,
            'slug', q.slug,
            'prompt', q.prompt,
            'helper_text', q.helper_text,
            'display_order', q.display_order,
            'select_min', q.select_min,
            'select_max', q.select_max,
            'required', q.required,
            'options', COALESCE((
              SELECT jsonb_agg(
                       jsonb_build_object(
                         'id', o.id,
                         'slug', o.slug,
                         'label', o.label,
                         'display_order', o.display_order
                       )
                       ORDER BY o.display_order
                     )
              FROM public.arrival_answer_options o
              WHERE o.question_id = q.id
            ), '[]'::jsonb)
          ) AS q_obj
        FROM public.arrival_questions q
        WHERE q.questionnaire_version_id = v_i.questionnaire_version_id
      ) s
    ), '[]'::jsonb),
    'answers', COALESCE((
      SELECT jsonb_agg(
               jsonb_build_object(
                 'question_id', a.question_id,
                 'answer_option_id', a.answer_option_id
               )
               ORDER BY a.question_id, a.answer_option_id
             )
      FROM public.arrival_answers a
      WHERE a.interaction_id = v_i.id
    ), '[]'::jsonb),
    'run', CASE
      WHEN v_i.state = 'completed' THEN (
        SELECT jsonb_build_object(
          'id', r.id,
          'outcome', r.outcome,
          'created_at', r.created_at
        )
        FROM public.arrival_recommendation_runs r
        WHERE r.interaction_id = v_i.id
      )
      ELSE NULL
    END
  )
  INTO v_payload;

  RETURN v_payload;
END;
$$;

ALTER FUNCTION public._arrival_questionnaire_payload(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._arrival_questionnaire_payload(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._arrival_questionnaire_payload(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public._arrival_questionnaire_payload(uuid, uuid) FROM authenticated;


CREATE OR REPLACE FUNCTION public.arrival_start_or_resume()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_qv  uuid;
  v_rv  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'arrival_unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_full_temple_access(v_uid) THEN
    RAISE EXCEPTION 'arrival_forbidden' USING ERRCODE = '42501';
  END IF;

  -- Transaction-scoped serialization per caller: genuinely competing first
  -- calls from separate sessions are ordered here, so exactly one interaction
  -- is created and both callers observe the same row.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('arrival_start_or_resume:' || v_uid::text, 0)
  );

  SELECT i.id INTO v_id
  FROM public.arrival_interactions i
  WHERE i.user_id = v_uid
    AND i.state = 'in_progress'
  LIMIT 1;

  IF v_id IS NULL THEN
    SELECT rv.id, rv.questionnaire_version_id
    INTO v_rv, v_qv
    FROM public.arrival_rule_versions rv
    JOIN public.arrival_questionnaire_versions qv
      ON qv.id = rv.questionnaire_version_id
    WHERE rv.is_current
      AND rv.status = 'published'
      AND qv.status = 'published';

    IF v_rv IS NULL OR v_qv IS NULL THEN
      RAISE EXCEPTION 'arrival_no_published_version' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.arrival_interactions (user_id, questionnaire_version_id, rule_version_id)
    VALUES (v_uid, v_qv, v_rv)
    RETURNING id INTO v_id;
  END IF;

  RETURN public._arrival_questionnaire_payload(v_id, v_uid);
END;
$$;

ALTER FUNCTION public.arrival_start_or_resume() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.arrival_start_or_resume() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arrival_start_or_resume() FROM anon;
GRANT EXECUTE ON FUNCTION public.arrival_start_or_resume() TO authenticated;
GRANT EXECUTE ON FUNCTION public.arrival_start_or_resume() TO service_role;


CREATE OR REPLACE FUNCTION public.arrival_load_interaction(_interaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_payload jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'arrival_unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_full_temple_access(v_uid) THEN
    RAISE EXCEPTION 'arrival_forbidden' USING ERRCODE = '42501';
  END IF;

  IF _interaction_id IS NULL THEN
    RAISE EXCEPTION 'arrival_interaction_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_payload := public._arrival_questionnaire_payload(_interaction_id, v_uid);

  -- Foreign, nonexistent and otherwise inaccessible ids are indistinguishable.
  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'arrival_interaction_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_payload;
END;
$$;

ALTER FUNCTION public.arrival_load_interaction(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.arrival_load_interaction(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arrival_load_interaction(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.arrival_load_interaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.arrival_load_interaction(uuid) TO service_role;