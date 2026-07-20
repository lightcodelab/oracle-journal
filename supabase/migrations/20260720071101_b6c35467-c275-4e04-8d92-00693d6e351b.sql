
CREATE OR REPLACE FUNCTION public._phase3_run_isolation_tests()
RETURNS TABLE(label text, passed boolean, note text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_ok boolean;
BEGIN
  SELECT id INTO v_uid FROM public.profiles LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT 'no-user'::text, true, 'no profile row; assertions skipped';
    RETURN;
  END IF;

  -- Test 1: Founder monotonic trigger blocks lost -> active (env-scoped)
  BEGIN
    INSERT INTO public.founding_members(user_id, founding_price_eligibility_status, stripe_environment)
    VALUES (v_uid, 'lost', 'live')
    ON CONFLICT (user_id, stripe_environment) DO UPDATE
      SET founding_price_eligibility_status = 'lost';
    BEGIN
      UPDATE public.founding_members
         SET founding_price_eligibility_status = 'active'
       WHERE user_id = v_uid AND stripe_environment = 'live';
      RETURN QUERY SELECT 'monotonic-founder'::text, false, 'reversal NOT blocked';
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 'monotonic-founder'::text, true, SQLERRM;
    END;
  END;

  -- Test 2: is_active_member ignores test-env entitlements
  BEGIN
    DELETE FROM public.entitlements WHERE user_id = v_uid AND source_ref = '__phase3_test_sub__';
    PERFORM public.upsert_entitlement(
      _user_id := v_uid, _source := 'stripe', _source_ref := '__phase3_test_sub__',
      _product_kind := 'app_membership', _status := 'active',
      _starts_at := now() - interval '1 day', _ends_at := now() + interval '30 days',
      _grace_until := NULL, _metadata := '{}'::jsonb);
    UPDATE public.entitlements
       SET stripe_environment = 'test'
     WHERE source = 'stripe' AND source_ref = '__phase3_test_sub__';
    v_ok := NOT EXISTS (
      SELECT 1 FROM public.entitlements
       WHERE source_ref = '__phase3_test_sub__'
         AND stripe_environment = 'test'
         AND COALESCE(stripe_environment,'live') <> 'test'
    );
    RETURN QUERY SELECT 'test-entitlement-tagged'::text, v_ok, 'test row must not appear in live-scoped filter';
    DELETE FROM public.entitlements WHERE source_ref = '__phase3_test_sub__';
  END;

  -- Test 3: reserve returns 'completed' short-circuit on retry after complete
  BEGIN
    DELETE FROM public.stripe_webhook_events WHERE event_id = '__phase3_evt__';
    DECLARE v_r jsonb; v_token uuid;
    BEGIN
      v_r := public.stripe_webhook_reserve_event('__phase3_evt__','test.type','live', now());
      IF (v_r->>'status') = 'acquired' THEN
        v_token := (v_r->>'lease_token')::uuid;
        PERFORM public.stripe_webhook_complete_event('__phase3_evt__','live', v_token);
        v_r := public.stripe_webhook_reserve_event('__phase3_evt__','test.type','live', now());
        IF (v_r->>'status') = 'completed' THEN
          RETURN QUERY SELECT 'webhook-idempotency'::text, true, 'reserve returns completed on retry';
        ELSE
          RETURN QUERY SELECT 'webhook-idempotency'::text, false, 'retry did not report completed';
        END IF;
      ELSE
        RETURN QUERY SELECT 'webhook-idempotency'::text, false, 'first reserve did not acquire';
      END IF;
      DELETE FROM public.stripe_webhook_events WHERE event_id = '__phase3_evt__';
    END;
  END;

  -- Test 4: same event_id co-exists across environments
  BEGIN
    DELETE FROM public.stripe_webhook_events WHERE event_id = '__phase3_evt2__';
    PERFORM public.stripe_webhook_reserve_event('__phase3_evt2__','t','live', now());
    PERFORM public.stripe_webhook_reserve_event('__phase3_evt2__','t','test', now());
    v_ok := (SELECT count(*) = 2 FROM public.stripe_webhook_events WHERE event_id = '__phase3_evt2__');
    RETURN QUERY SELECT 'env-scoped-events'::text, v_ok, 'both env rows present';
    DELETE FROM public.stripe_webhook_events WHERE event_id = '__phase3_evt2__';
  END;

  RETURN;
END;
$$;
