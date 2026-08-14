-- Arrival-B3.2 : confirmed atomic restart. Append-only.
-- Adds public.arrival_abandon_and_restart(uuid) only. No other object is altered.

CREATE OR REPLACE FUNCTION public.arrival_abandon_and_restart(
  _expected_interaction_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_pred public.arrival_interactions;
  v_succ uuid;
  v_qv   uuid;
  v_rv   uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'arrival_unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_full_temple_access(v_uid) THEN
    RAISE EXCEPTION 'arrival_forbidden' USING ERRCODE = '42501';
  END IF;

  -- Null expected id is treated exactly like a foreign or nonexistent one.
  IF _expected_interaction_id IS NULL THEN
    RAISE EXCEPTION 'arrival_interaction_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Same user-scoped lifecycle lock key as arrival_start_or_resume, so restart
  -- and start/resume serialize against each other for a single caller.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('arrival_start_or_resume:' || v_uid::text, 0)
  );

  SELECT i.* INTO v_pred
  FROM public.arrival_interactions i
  WHERE i.id = _expected_interaction_id
    AND i.user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'arrival_interaction_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_pred.state = 'completed' THEN
    RAISE EXCEPTION 'arrival_restart_not_allowed' USING ERRCODE = '55000';
  END IF;

  IF v_pred.state = 'abandoned' THEN
    -- Replay: return the unique existing successor unchanged.
    SELECT s.id INTO v_succ
    FROM public.arrival_interactions s
    WHERE s.restarted_from_interaction_id = v_pred.id
      AND s.user_id = v_uid;

    IF v_succ IS NULL THEN
      -- Torn integrity state: fail closed rather than mint a second successor.
      RAISE EXCEPTION 'arrival_restart_torn_state' USING ERRCODE = '55000';
    END IF;

    RETURN public._arrival_questionnaire_payload(v_succ, v_uid);
  END IF;

  -- Predecessor is in_progress: resolve the current published pair first, so a
  -- missing pair aborts before any state mutation is attempted.
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

  UPDATE public.arrival_interactions
  SET state = 'abandoned',
      abandoned_at = now()
  WHERE id = v_pred.id;

  INSERT INTO public.arrival_interactions (
    user_id, questionnaire_version_id, rule_version_id, restarted_from_interaction_id
  )
  VALUES (v_uid, v_qv, v_rv, v_pred.id)
  RETURNING id INTO v_succ;

  RETURN public._arrival_questionnaire_payload(v_succ, v_uid);
END;
$$;

ALTER FUNCTION public.arrival_abandon_and_restart(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.arrival_abandon_and_restart(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arrival_abandon_and_restart(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.arrival_abandon_and_restart(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.arrival_abandon_and_restart(uuid) TO service_role;