
-- =========================================================================
-- Pass 3.2c remediation migration (additive)
-- =========================================================================

-- 1. Widen plan code columns to varchar(32). Existing values are preserved.
ALTER TABLE public.plans          ALTER COLUMN code       TYPE varchar(32);
ALTER TABLE public.subscriptions  ALTER COLUMN plan_code  TYPE varchar(32);

-- 2. Ensure canonical plan rows exist for the new membership contract.
INSERT INTO public.plans (code, name, description, active) VALUES
  ('founding', 'Founding Member', 'Founding beta pricing (locked while eligible)', true),
  ('standard', 'Standard Member', 'Standard monthly membership', true)
ON CONFLICT (code) DO NOTHING;

-- 3. Admin-only helper to reopen a specific Test-environment ledger row for
--    authenticated replay. Refuses to touch any Live row. Audit-tagged.
CREATE OR REPLACE FUNCTION public.admin_reset_test_webhook_event(_event_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_row public.stripe_webhook_events%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_reset_test_webhook_event: admin required';
  END IF;

  SELECT * INTO v_row FROM public.stripe_webhook_events
   WHERE event_id = _event_id AND stripe_environment = 'test';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','not_found','event_id',_event_id);
  END IF;

  -- Hard rail: never touch a live ledger row from this helper.
  IF EXISTS (
    SELECT 1 FROM public.stripe_webhook_events
     WHERE event_id = _event_id AND stripe_environment = 'live'
  ) THEN
    RAISE EXCEPTION 'refusing: live ledger row exists for event %', _event_id;
  END IF;

  DELETE FROM public.stripe_webhook_events
   WHERE event_id = _event_id AND stripe_environment = 'test';

  RETURN jsonb_build_object(
    'status', 'reset',
    'event_id', _event_id,
    'previous_status', v_row.status,
    'previous_attempt_count', v_row.attempt_count,
    'previous_last_error', v_row.last_error,
    'previous_completed_at', v_row.completed_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_test_webhook_event(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_test_webhook_event(text) TO service_role;

-- 4. Regression test for failure → retry → completion lifecycle.
CREATE OR REPLACE FUNCTION public._phase3_2c_run_tests()
RETURNS TABLE(label text, passed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_evt text := '__p32c_evt_' || extract(epoch from clock_timestamp())::bigint;
  v_env text := 'test';
  v_created timestamptz := now();
  v_r1 jsonb; v_r2 jsonb; v_r3 jsonb;
  v_lease1 uuid; v_lease2 uuid; v_lease3 uuid;
  v_status text; v_attempts int;
  v_bogus uuid := gen_random_uuid();
  v_results jsonb := '[]'::jsonb;
BEGIN
  BEGIN
    -- Cleanup any prior fixture
    DELETE FROM public.stripe_webhook_events WHERE event_id = v_evt;

    -- (1) reserve → acquired
    v_r1 := public.stripe_webhook_reserve_event(v_evt, 'x.type', v_env, v_created);
    v_lease1 := (v_r1->>'lease_token')::uuid;
    v_results := v_results || jsonb_build_object(
      'label','1st reserve returns acquired',
      'passed', (v_r1->>'status')='acquired' AND v_lease1 IS NOT NULL);

    -- (2) fail with WRONG lease token must not transition
    BEGIN
      PERFORM public.stripe_webhook_fail_event(v_evt, v_env, v_bogus, 'wrong token');
    EXCEPTION WHEN OTHERS THEN NULL; END;
    SELECT status INTO v_status FROM public.stripe_webhook_events
      WHERE event_id=v_evt AND stripe_environment=v_env;
    v_results := v_results || jsonb_build_object(
      'label','fail with wrong lease does not mark failed',
      'passed', v_status='processing');

    -- (3) fail with correct lease → status=failed
    PERFORM public.stripe_webhook_fail_event(v_evt, v_env, v_lease1, 'simulated ingest error');
    SELECT status, attempt_count INTO v_status, v_attempts
      FROM public.stripe_webhook_events
     WHERE event_id=v_evt AND stripe_environment=v_env;
    v_results := v_results || jsonb_build_object(
      'label','fail with correct lease sets failed',
      'passed', v_status='failed' AND v_attempts >= 1);

    -- (4) retry reserve after failure → acquired with NEW lease token
    v_r2 := public.stripe_webhook_reserve_event(v_evt, 'x.type', v_env, v_created);
    v_lease2 := (v_r2->>'lease_token')::uuid;
    v_results := v_results || jsonb_build_object(
      'label','retry reserve after failure returns acquired',
      'passed', (v_r2->>'status')='acquired' AND v_lease2 IS NOT NULL AND v_lease2 <> v_lease1);

    -- (5) complete with WRONG token must not mark completed
    BEGIN
      PERFORM public.stripe_webhook_complete_event(v_evt, v_env, v_bogus);
    EXCEPTION WHEN OTHERS THEN NULL; END;
    SELECT status INTO v_status FROM public.stripe_webhook_events
      WHERE event_id=v_evt AND stripe_environment=v_env;
    v_results := v_results || jsonb_build_object(
      'label','complete with wrong lease does not mark completed',
      'passed', v_status='processing');

    -- (6) complete with correct lease → status=completed
    PERFORM public.stripe_webhook_complete_event(v_evt, v_env, v_lease2);
    SELECT status INTO v_status FROM public.stripe_webhook_events
      WHERE event_id=v_evt AND stripe_environment=v_env;
    v_results := v_results || jsonb_build_object(
      'label','complete with correct lease sets completed',
      'passed', v_status='completed');

    -- (7) reserve again after completion → duplicate/completed
    v_r3 := public.stripe_webhook_reserve_event(v_evt, 'x.type', v_env, v_created);
    v_results := v_results || jsonb_build_object(
      'label','reserve after completion returns completed/duplicate',
      'passed', (v_r3->>'status') IN ('completed','duplicate'));

    RAISE EXCEPTION '__p32c_rollback__';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> '__p32c_rollback__' THEN RAISE; END IF;
  END;

  RETURN QUERY
    SELECT (elem->>'label')::text, (elem->>'passed')::boolean
      FROM jsonb_array_elements(v_results) elem;
END;
$$;

REVOKE ALL ON FUNCTION public._phase3_2c_run_tests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._phase3_2c_run_tests() TO service_role;
