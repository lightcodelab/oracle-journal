CREATE OR REPLACE FUNCTION public.arrival_save_answers(
  _interaction_id uuid,
  _expected_answers_revision integer,
  _answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid       uuid := auth.uid();
  v_i         public.arrival_interactions;
  v_el        jsonb;
  v_qid       uuid;
  v_qtext     text;
  v_q         public.arrival_questions;
  v_opts      jsonb;
  v_n         integer;
  v_o         text;
  v_slugs     text[];
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

  IF _expected_answers_revision IS NULL THEN
    RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
  END IF;

  IF _answers IS NULL OR jsonb_typeof(_answers) <> 'array' THEN
    RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
  END IF;

  -- Lock the interaction row. Foreign, nonexistent and non-in_progress ids are
  -- indistinguishable: no ownership or state is revealed and nothing is written.
  SELECT i.* INTO v_i
  FROM public.arrival_interactions i
  WHERE i.id = _interaction_id
    AND i.user_id = v_uid
    AND i.state = 'in_progress'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'arrival_interaction_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_i.answers_revision <> _expected_answers_revision::bigint THEN
    RAISE EXCEPTION 'arrival_revision_conflict' USING ERRCODE = '55000';
  END IF;

  -- No duplicate question submissions.
  IF (
    SELECT count(*) <> count(DISTINCT e->>'question_id')
    FROM jsonb_array_elements(_answers) e
  ) THEN
    RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
  END IF;

  FOR v_el IN SELECT e FROM jsonb_array_elements(_answers) e
  LOOP
    IF jsonb_typeof(v_el) <> 'object' THEN
      RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
    END IF;

    -- Only the two accepted keys are permitted.
    IF EXISTS (
      SELECT 1 FROM jsonb_object_keys(v_el) k
      WHERE k NOT IN ('question_id', 'answer_option_ids')
    ) THEN
      RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
    END IF;

    v_qtext := v_el->>'question_id';
    IF v_qtext IS NULL
       OR v_qtext !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
    END IF;
    v_qid := v_qtext::uuid;

    -- Question must belong to this interaction's pinned questionnaire version.
    SELECT q.* INTO v_q
    FROM public.arrival_questions q
    WHERE q.id = v_qid
      AND q.questionnaire_version_id = v_i.questionnaire_version_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
    END IF;

    v_opts := v_el->'answer_option_ids';
    IF v_opts IS NULL OR jsonb_typeof(v_opts) <> 'array' THEN
      RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
    END IF;

    -- No duplicate option selections within a question.
    IF (
      SELECT count(*) <> count(DISTINCT o)
      FROM jsonb_array_elements_text(v_opts) o
    ) THEN
      RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
    END IF;

    SELECT count(*) INTO v_n FROM jsonb_array_elements_text(v_opts) o;

    IF v_n < v_q.select_min OR v_n > v_q.select_max THEN
      RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
    END IF;

    v_slugs := ARRAY[]::text[];

    FOR v_o IN SELECT o FROM jsonb_array_elements_text(v_opts) o
    LOOP
      IF v_o IS NULL
         OR v_o !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
      END IF;

      -- Option must belong to this submitted question (blocks cross-question
      -- option injection and unknown option ids).
      DECLARE
        v_slug text;
      BEGIN
        SELECT o2.slug INTO v_slug
        FROM public.arrival_answer_options o2
        WHERE o2.id = v_o::uuid
          AND o2.question_id = v_qid;

        IF v_slug IS NULL THEN
          RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
        END IF;

        v_slugs := v_slugs || v_slug;
      END;
    END LOOP;

    -- Exclusive-option rules, keyed by authored slugs.
    IF v_q.slug = 'preferred_form'
       AND 'no_preference' = ANY(v_slugs)
       AND array_length(v_slugs, 1) > 1 THEN
      RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
    END IF;

    IF v_q.slug = 'honour_first'
       AND 'none' = ANY(v_slugs)
       AND array_length(v_slugs, 1) > 1 THEN
      RAISE EXCEPTION 'arrival_answers_invalid' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- Atomic replace of this interaction's answered subset only.
  DELETE FROM public.arrival_answers a
  WHERE a.interaction_id = v_i.id;

  INSERT INTO public.arrival_answers (interaction_id, question_id, answer_option_id)
  SELECT v_i.id,
         (e->>'question_id')::uuid,
         o::uuid
  FROM jsonb_array_elements(_answers) e,
       jsonb_array_elements_text(e->'answer_option_ids') o;

  UPDATE public.arrival_interactions
  SET answers_revision = answers_revision + 1
  WHERE id = v_i.id;

  RETURN public._arrival_questionnaire_payload(v_i.id, v_uid);
END;
$function$;

ALTER FUNCTION public.arrival_save_answers(uuid, integer, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.arrival_save_answers(uuid, integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arrival_save_answers(uuid, integer, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.arrival_save_answers(uuid, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.arrival_save_answers(uuid, integer, jsonb) TO service_role;