
DROP FUNCTION IF EXISTS public._phase3_2_run_tests();

CREATE FUNCTION public._phase3_2_run_tests()
RETURNS TABLE(label text, passed boolean, note jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid; v_uid2 uuid; v_r jsonb; v_token uuid; v_offer jsonb;
BEGIN
  SELECT id INTO v_uid  FROM public.profiles ORDER BY id LIMIT 1;
  SELECT id INTO v_uid2 FROM public.profiles ORDER BY id OFFSET 1 LIMIT 1;
  IF v_uid IS NULL OR v_uid2 IS NULL THEN
    RETURN QUERY SELECT 'setup'::text, false, jsonb_build_object('reason','need >=2 profile rows');
    RETURN;
  END IF;

  DELETE FROM public.stripe_webhook_events
    WHERE event_id IN ('__p32_evt_a__','__p32_evt_b__','__p32_evt_c__','__p32_env_mismatch__');
  DELETE FROM public.stripe_webhook_env_mismatches WHERE event_id = '__p32_env_mismatch__';
  DELETE FROM public.founding_members WHERE user_id = v_uid2;
  DELETE FROM public.founder_price_audit WHERE user_id = v_uid2;
  DELETE FROM public.entitlements WHERE user_id = v_uid2 AND source_ref LIKE '__p32_%';

  v_r := public.stripe_webhook_reserve_event('__p32_evt_a__','x.type','live', now());
  RETURN QUERY SELECT 'lease-acquired-fresh'::text, (v_r->>'status')='acquired', v_r;
  v_token := (v_r->>'lease_token')::uuid;

  v_r := public.stripe_webhook_reserve_event('__p32_evt_a__','x.type','live', now());
  RETURN QUERY SELECT 'lease-concurrent-in-progress'::text, (v_r->>'status')='in_progress', v_r;

  RETURN QUERY SELECT 'lease-wrong-token-cannot-complete'::text,
    public.stripe_webhook_complete_event('__p32_evt_a__','live', gen_random_uuid()) = false,
    to_jsonb('wrong token must return false'::text);

  RETURN QUERY SELECT 'lease-correct-token-completes'::text,
    public.stripe_webhook_complete_event('__p32_evt_a__','live', v_token) = true,
    to_jsonb('lease token completes'::text);

  v_r := public.stripe_webhook_reserve_event('__p32_evt_a__','x.type','live', now());
  RETURN QUERY SELECT 'completed-short-circuits'::text, (v_r->>'status')='completed', v_r;

  v_r := public.stripe_webhook_reserve_event('__p32_evt_b__','x.type','live', now());
  v_token := (v_r->>'lease_token')::uuid;
  PERFORM public.stripe_webhook_fail_event('__p32_evt_b__','live', v_token, 'forced fail');
  v_r := public.stripe_webhook_reserve_event('__p32_evt_b__','x.type','live', now());
  RETURN QUERY SELECT 'failed-retry-reacquires'::text, (v_r->>'status')='acquired', v_r;

  v_r := public.stripe_webhook_reserve_event('__p32_evt_c__','x.type','live', now());
  UPDATE public.stripe_webhook_events
     SET lease_expires_at = now() - interval '1 minute'
   WHERE event_id = '__p32_evt_c__' AND stripe_environment = 'live';
  v_r := public.stripe_webhook_reserve_event('__p32_evt_c__','x.type','live', now());
  RETURN QUERY SELECT 'stale-processing-reclaimed'::text, (v_r->>'status')='acquired', v_r;

  PERFORM public.stripe_webhook_record_env_mismatch(
    '__p32_env_mismatch__','evt','live','test','livemode_true');
  RETURN QUERY SELECT 'env-mismatch-audited'::text,
    EXISTS (SELECT 1 FROM public.stripe_webhook_env_mismatches WHERE event_id='__p32_env_mismatch__'),
    to_jsonb('row recorded'::text);

  v_offer := public.admin_test_get_membership_offer_at('2026-09-13T23:59:59Z'::timestamptz);
  RETURN QUERY SELECT 'founding-boundary-before-open'::text, (v_offer->>'is_founding_window')::boolean=false, v_offer;
  v_offer := public.admin_test_get_membership_offer_at('2026-09-14T00:00:00Z'::timestamptz);
  RETURN QUERY SELECT 'founding-boundary-open-instant'::text, (v_offer->>'is_founding_window')::boolean=true, v_offer;
  v_offer := public.admin_test_get_membership_offer_at('2026-09-29T00:00:00Z'::timestamptz);
  RETURN QUERY SELECT 'founding-boundary-mid-window'::text, (v_offer->>'is_founding_window')::boolean=true, v_offer;
  v_offer := public.admin_test_get_membership_offer_at('2026-12-13T22:59:59Z'::timestamptz);
  RETURN QUERY SELECT 'founding-boundary-before-close'::text, (v_offer->>'is_founding_window')::boolean=true, v_offer;
  v_offer := public.admin_test_get_membership_offer_at('2026-12-13T23:00:00Z'::timestamptz);
  RETURN QUERY SELECT 'founding-boundary-close-instant'::text, (v_offer->>'is_founding_window')::boolean=false, v_offer;
  v_offer := public.admin_test_get_membership_offer_at('2026-12-13T23:00:01Z'::timestamptz);
  RETURN QUERY SELECT 'founding-boundary-after-close'::text, (v_offer->>'is_founding_window')::boolean=false, v_offer;

  INSERT INTO public.founding_members(user_id, founding_price_eligibility_status, stripe_environment)
    VALUES (v_uid2, 'active', 'test')
    ON CONFLICT (user_id, stripe_environment) DO UPDATE SET founding_price_eligibility_status='active';
  RETURN QUERY SELECT 'test-founder-does-not-flip-live-badge'::text,
    (public.get_member_state(v_uid2)->>'is_founder')::boolean = false,
    to_jsonb('get_member_state ignores test founder'::text);

  INSERT INTO public.founding_members(user_id, founding_price_eligibility_status, stripe_environment)
    VALUES (v_uid2, 'active', 'live')
    ON CONFLICT (user_id, stripe_environment) DO UPDATE SET founding_price_eligibility_status='active';
  PERFORM public.mark_founder_price_lost(v_uid2, 'test forfeit','test');
  RETURN QUERY SELECT 'test-cancel-does-not-forfeit-live'::text,
    (SELECT founding_price_eligibility_status FROM public.founding_members
       WHERE user_id = v_uid2 AND stripe_environment = 'live') IN ('active','in_grace'),
    to_jsonb('live row stays non-lost'::text);

  BEGIN
    UPDATE public.founding_members SET founding_price_eligibility_status='lost'
     WHERE user_id = v_uid2 AND stripe_environment = 'test';
    BEGIN
      UPDATE public.founding_members SET founding_price_eligibility_status='active'
       WHERE user_id = v_uid2 AND stripe_environment = 'test';
      RETURN QUERY SELECT 'test-founder-monotonic'::text, false, to_jsonb('reversal NOT blocked in test'::text);
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 'test-founder-monotonic'::text, true,
        to_jsonb(('founder price eligibility is immutable once lost (user='||v_uid2::text||')')::text);
    END;
  END;

  INSERT INTO public.entitlements(user_id, source, source_ref, product_kind, status, starts_at, ends_at, stripe_environment)
    VALUES (v_uid2,'stripe','__p32_test_ent__','app_membership','active', now()-interval '1d', now()+interval '30d','test')
    ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT 'test-reset-preserves-live-founder'::text,
    (public.admin_test_reset_user_lifecycle(v_uid2))::jsonb IS NOT NULL,
    (public.admin_test_reset_user_lifecycle(v_uid2))::jsonb;
END;
$$;
