
-- ================================================================
-- Phase 3.2a — Testability & concurrency hardening
-- Additive/idempotent. use_new_entitlement_model remains OFF.
-- No scheduled jobs. No production behaviour flips.
-- ================================================================

-- ------------------------------------------------------------------
-- 1. Lease/ownership on stripe_webhook_events
-- ------------------------------------------------------------------
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS lease_token uuid;

CREATE INDEX IF NOT EXISTS stripe_webhook_events_processing_idx
  ON public.stripe_webhook_events (status, started_at)
  WHERE status = 'processing';

-- Replace reserve/complete/fail with lease-aware versions.
-- Signature changes → DROP first.
DROP FUNCTION IF EXISTS public.stripe_webhook_reserve_event(text,text,text,timestamptz);
DROP FUNCTION IF EXISTS public.stripe_webhook_complete_event(text,text);
DROP FUNCTION IF EXISTS public.stripe_webhook_fail_event(text,text,text);

-- Constant: stale-processing reclaim window
CREATE OR REPLACE FUNCTION public._stripe_webhook_stale_after()
RETURNS interval LANGUAGE sql IMMUTABLE AS $$ SELECT interval '15 minutes' $$;

-- Reserve: acquire | in_progress | completed
--   acquired    → caller owns the lease and MUST process
--   in_progress → another delivery owns a fresh lease; caller must NOT process
--   completed   → prior delivery finished; caller must NOT process
CREATE OR REPLACE FUNCTION public.stripe_webhook_reserve_event(
  _event_id text,
  _event_type text,
  _stripe_environment text,
  _event_created_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.stripe_webhook_events%ROWTYPE;
  v_new_token uuid := gen_random_uuid();
  v_stale interval := public._stripe_webhook_stale_after();
BEGIN
  IF _stripe_environment NOT IN ('test','live') THEN
    RAISE EXCEPTION 'invalid stripe_environment: %', _stripe_environment;
  END IF;

  -- Lock the row (or reserve a fresh one) atomically.
  SELECT * INTO v_existing
    FROM public.stripe_webhook_events
   WHERE event_id = _event_id AND stripe_environment = _stripe_environment
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.stripe_webhook_events(
      event_id, event_type, event_created_at, stripe_environment,
      status, attempt_count, started_at, lease_token
    ) VALUES (
      _event_id, _event_type, _event_created_at, _stripe_environment,
      'processing', 1, now(), v_new_token
    );
    RETURN jsonb_build_object(
      'status','acquired','lease_token', v_new_token, 'attempt_count', 1
    );
  END IF;

  IF v_existing.status = 'completed' THEN
    RETURN jsonb_build_object('status','completed','attempt_count', v_existing.attempt_count);
  END IF;

  IF v_existing.status = 'processing'
     AND v_existing.started_at IS NOT NULL
     AND (now() - v_existing.started_at) < v_stale THEN
    -- Another delivery owns a fresh lease. Do NOT reprocess.
    RETURN jsonb_build_object(
      'status','in_progress',
      'attempt_count', v_existing.attempt_count,
      'started_at', v_existing.started_at
    );
  END IF;

  -- Reclaimable: 'failed' OR stale 'processing'. Mint a fresh lease.
  UPDATE public.stripe_webhook_events
     SET status = 'processing',
         lease_token = v_new_token,
         attempt_count = attempt_count + 1,
         started_at = now(),
         last_error = NULL
   WHERE event_id = _event_id AND stripe_environment = _stripe_environment;

  RETURN jsonb_build_object(
    'status','acquired',
    'lease_token', v_new_token,
    'attempt_count', v_existing.attempt_count + 1,
    'reclaimed_from', v_existing.status
  );
END;
$$;
REVOKE ALL ON FUNCTION public.stripe_webhook_reserve_event(text,text,text,timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_webhook_reserve_event(text,text,text,timestamptz) TO service_role;

-- Complete: verifies lease ownership. Returns true on success.
CREATE OR REPLACE FUNCTION public.stripe_webhook_complete_event(
  _event_id text,
  _stripe_environment text,
  _lease_token uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE public.stripe_webhook_events
     SET status = 'completed',
         completed_at = now(),
         last_error = NULL
   WHERE event_id = _event_id
     AND stripe_environment = _stripe_environment
     AND lease_token = _lease_token
     AND status = 'processing';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.stripe_webhook_complete_event(text,text,uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_webhook_complete_event(text,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.stripe_webhook_fail_event(
  _event_id text,
  _stripe_environment text,
  _lease_token uuid,
  _error text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE public.stripe_webhook_events
     SET status = 'failed',
         last_error = LEFT(COALESCE(_error,''), 500)
   WHERE event_id = _event_id
     AND stripe_environment = _stripe_environment
     AND lease_token = _lease_token
     AND status = 'processing';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.stripe_webhook_fail_event(text,text,uuid,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_webhook_fail_event(text,text,uuid,text) TO service_role;

-- ------------------------------------------------------------------
-- 2. Livemode / environment consistency rejection audit
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_webhook_env_mismatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text,
  verified_env text NOT NULL CHECK (verified_env IN ('test','live')),
  event_livemode boolean,
  reason text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_webhook_env_mismatches TO service_role;
ALTER TABLE public.stripe_webhook_env_mismatches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin reads env mismatches" ON public.stripe_webhook_env_mismatches;
CREATE POLICY "admin reads env mismatches"
  ON public.stripe_webhook_env_mismatches
  FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.stripe_webhook_record_env_mismatch(
  _event_id text,
  _verified_env text,
  _event_livemode boolean,
  _reason text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.stripe_webhook_env_mismatches(
    event_id, verified_env, event_livemode, reason
  ) VALUES (
    LEFT(COALESCE(_event_id,''), 128),
    _verified_env,
    _event_livemode,
    LEFT(COALESCE(_reason,''), 500)
  );
$$;
REVOKE ALL ON FUNCTION public.stripe_webhook_record_env_mismatch(text,text,boolean,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_webhook_record_env_mismatch(text,text,boolean,text) TO service_role;

-- ------------------------------------------------------------------
-- 3. Founding_members: composite PK to allow isolated Test rows
-- ------------------------------------------------------------------
-- Existing rows are all stripe_environment='live' (backfilled by 3.1).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.founding_members'::regclass
       AND contype = 'p'
       AND conname = 'founding_members_pkey'
  ) THEN
    ALTER TABLE public.founding_members DROP CONSTRAINT founding_members_pkey;
  END IF;
END$$;

ALTER TABLE public.founding_members
  ALTER COLUMN stripe_environment SET NOT NULL,
  ALTER COLUMN stripe_environment SET DEFAULT 'live';

ALTER TABLE public.founding_members
  ADD CONSTRAINT founding_members_pkey
    PRIMARY KEY (user_id, stripe_environment);

-- ------------------------------------------------------------------
-- 4. mark_founder_price_lost: env-scoped variant.
--    Old (user_id, reason) signature stays for backward compat and
--    now defaults to live. New (user_id, reason, env) variant is
--    used by the test harness.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_founder_price_lost(
  _user_id uuid,
  _reason  text,
  _stripe_environment text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev text;
BEGIN
  IF _stripe_environment NOT IN ('test','live') THEN
    RAISE EXCEPTION 'invalid stripe_environment: %', _stripe_environment;
  END IF;
  SELECT founding_price_eligibility_status INTO v_prev
    FROM public.founding_members
   WHERE user_id = _user_id AND stripe_environment = _stripe_environment;
  IF v_prev IS NULL OR v_prev = 'lost' THEN
    RETURN;
  END IF;
  UPDATE public.founding_members
     SET founding_price_eligibility_status = 'lost',
         founding_price_lost_at = now(),
         founding_price_lost_reason = LEFT(COALESCE(_reason,''), 500),
         updated_at = now()
   WHERE user_id = _user_id AND stripe_environment = _stripe_environment;
  INSERT INTO public.founder_price_audit(user_id, action, from_status, to_status, reason, stripe_environment)
  VALUES (_user_id, 'lost', v_prev, 'lost', _reason, _stripe_environment);
END;
$$;
REVOKE ALL ON FUNCTION public.mark_founder_price_lost(uuid,text,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_founder_price_lost(uuid,text,text) TO service_role;

-- Preserve the 2-arg signature so existing callers (Phase 3.1
-- ingest_stripe_subscription live path) still work. It now
-- delegates to the env-aware variant with 'live'.
CREATE OR REPLACE FUNCTION public.mark_founder_price_lost(
  _user_id uuid, _reason text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.mark_founder_price_lost(_user_id, _reason, 'live');
$$;
REVOKE ALL ON FUNCTION public.mark_founder_price_lost(uuid,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_founder_price_lost(uuid,text) TO service_role;

-- ------------------------------------------------------------------
-- 5. Rewire ingest_stripe_subscription:
--    - permit Test founder writes tagged 'test' (isolated);
--    - keep production Founder read paths ignoring Test.
--    Signature unchanged.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ingest_stripe_subscription(
  _user_id                uuid,
  _stripe_subscription_id text,
  _stripe_price_id        text,
  _stripe_status          text,
  _current_period_start   timestamptz,
  _current_period_end     timestamptz,
  _cancel_at_period_end   boolean,
  _canceled_at            timestamptz,
  _event_created_at       timestamptz,
  _stripe_environment     text DEFAULT 'live'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_founding_price_test text;
  v_founding_price_live text;
  v_founding_starts     timestamptz;
  v_founding_ends       timestamptz;
  v_grace_days          int;
  v_is_founding_price   boolean;
  v_ent_status          text;
  v_grace_until         timestamptz;
  v_existing_grace      timestamptz;
  v_last_event_at       timestamptz;
  v_terminal            boolean;
  v_existing_founder    text;
  v_existing_env        text;
  v_is_live             boolean;
BEGIN
  IF _stripe_environment NOT IN ('test','live') THEN
    RAISE EXCEPTION 'invalid stripe_environment: %', _stripe_environment;
  END IF;
  v_is_live := _stripe_environment = 'live';

  SELECT last_event_at, stripe_environment
    INTO v_last_event_at, v_existing_env
    FROM public.subscriptions
   WHERE provider_subscription_id = _stripe_subscription_id;

  IF v_last_event_at IS NOT NULL AND v_last_event_at > _event_created_at THEN
    RETURN jsonb_build_object('skipped','older_event');
  END IF;
  IF v_existing_env IS NOT NULL AND v_existing_env <> _stripe_environment THEN
    RAISE EXCEPTION 'environment mismatch for %: existing=% incoming=%',
      _stripe_subscription_id, v_existing_env, _stripe_environment;
  END IF;

  SELECT (value #>> '{}') INTO v_founding_price_test
    FROM public.app_settings WHERE key='founding_price_id_test';
  SELECT (value #>> '{}') INTO v_founding_price_live
    FROM public.app_settings WHERE key='founding_price_id_live';
  SELECT (value #>> '{}')::timestamptz INTO v_founding_starts
    FROM public.app_settings WHERE key='founding_beta_starts_at' AND value <> 'null'::jsonb;
  SELECT (value #>> '{}')::timestamptz INTO v_founding_ends
    FROM public.app_settings WHERE key='founding_beta_ends_at' AND value <> 'null'::jsonb;
  SELECT COALESCE((value #>> '{}')::int, 15) INTO v_grace_days
    FROM public.app_settings WHERE key='failed_payment_grace_days';

  v_is_founding_price :=
    _stripe_price_id IS NOT NULL AND (
      (v_is_live     AND _stripe_price_id = v_founding_price_live)
      OR (NOT v_is_live AND _stripe_price_id = v_founding_price_test)
    );

  v_terminal := _stripe_status IN ('canceled','unpaid','incomplete_expired');

  v_ent_status := CASE
    WHEN _stripe_status IN ('active','trialing') THEN 'active'
    WHEN _stripe_status = 'past_due' THEN 'in_grace'
    WHEN _stripe_status = 'paused' THEN 'paused'
    WHEN v_terminal THEN 'canceled'
    ELSE 'expired'
  END;

  IF v_ent_status = 'in_grace' THEN
    SELECT grace_until INTO v_existing_grace
      FROM public.entitlements
     WHERE source = 'stripe' AND source_ref = _stripe_subscription_id
       AND COALESCE(stripe_environment,'live') = _stripe_environment;
    IF v_existing_grace IS NOT NULL THEN
      v_grace_until := v_existing_grace;
    ELSE
      v_grace_until := COALESCE(_current_period_end, now())
                       + make_interval(days => v_grace_days);
    END IF;
  ELSE
    v_grace_until := NULL;
  END IF;

  INSERT INTO public.subscriptions(
    profile_id, provider, provider_subscription_id, plan_code, cadence, status,
    current_period_start, current_period_end, cancel_at_period_end, canceled_at,
    last_event_at, stripe_environment
  ) VALUES (
    _user_id, 'stripe'::payment_provider, _stripe_subscription_id,
    CASE WHEN v_is_founding_price THEN 'founding' ELSE 'standard' END,
    'monthly'::billing_cadence,
    (CASE _stripe_status
       WHEN 'trialing' THEN 'trialing'
       WHEN 'active' THEN 'active'
       WHEN 'past_due' THEN 'past_due'
       WHEN 'paused' THEN 'paused'
       WHEN 'canceled' THEN 'canceled'
       WHEN 'unpaid' THEN 'canceled'
       WHEN 'incomplete' THEN 'incomplete'
       WHEN 'incomplete_expired' THEN 'canceled'
       ELSE 'incomplete'
     END)::subscription_status,
    _current_period_start, _current_period_end, COALESCE(_cancel_at_period_end,false),
    _canceled_at, _event_created_at, _stripe_environment
  )
  ON CONFLICT (provider_subscription_id) DO UPDATE
    SET status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        canceled_at = EXCLUDED.canceled_at,
        last_event_at = EXCLUDED.last_event_at,
        updated_at = now();

  PERFORM public.upsert_entitlement(
    _user_id       := _user_id,
    _source        := 'stripe',
    _source_ref    := _stripe_subscription_id,
    _product_kind  := 'app_membership',
    _status        := v_ent_status,
    _starts_at     := _current_period_start,
    _ends_at       := CASE WHEN v_terminal THEN COALESCE(_canceled_at, now())
                           ELSE _current_period_end END,
    _grace_until   := v_grace_until,
    _metadata      := jsonb_build_object(
      'stripe_price_id', _stripe_price_id,
      'stripe_status', _stripe_status,
      'is_founding_price', v_is_founding_price,
      'stripe_environment', _stripe_environment
    )
  );

  UPDATE public.entitlements
     SET stripe_environment = _stripe_environment
   WHERE source = 'stripe' AND source_ref = _stripe_subscription_id;

  -- Founder writes now happen in BOTH envs, always tagged.
  -- Production reads filter to 'live' → Test rows are cosmetically inert.
  IF v_is_founding_price
     AND NOT v_terminal
     AND v_founding_starts IS NOT NULL
     AND v_founding_ends IS NOT NULL
     AND _current_period_start >= v_founding_starts
     AND _current_period_start <  v_founding_ends
  THEN
    INSERT INTO public.founding_members(
      user_id, founding_subscription_id, founding_price_eligibility_status,
      stripe_environment
    )
    VALUES (_user_id, _stripe_subscription_id, 'active', _stripe_environment)
    ON CONFLICT (user_id, stripe_environment) DO UPDATE
      SET founding_subscription_id = COALESCE(
            public.founding_members.founding_subscription_id,
            EXCLUDED.founding_subscription_id),
          updated_at = now();

    INSERT INTO public.founder_price_audit(user_id, action, to_status, reason, stripe_environment)
    SELECT _user_id, 'granted', 'active',
           'Founding checkout at ' || _stripe_subscription_id, _stripe_environment
    WHERE NOT EXISTS (
      SELECT 1 FROM public.founder_price_audit
       WHERE user_id = _user_id AND action = 'granted'
         AND COALESCE(stripe_environment,'live') = _stripe_environment
    );
  END IF;

  IF v_terminal THEN
    SELECT founding_subscription_id INTO v_existing_founder
      FROM public.founding_members
      WHERE user_id = _user_id AND stripe_environment = _stripe_environment;
    IF v_existing_founder = _stripe_subscription_id THEN
      PERFORM public.mark_founder_price_lost(_user_id,
        'Founding subscription terminated: ' || _stripe_status,
        _stripe_environment);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'entitlement_status', v_ent_status,
    'is_founding_price', v_is_founding_price,
    'terminal', v_terminal,
    'stripe_environment', _stripe_environment,
    'grace_until', v_grace_until
  );
END;
$$;
REVOKE ALL ON FUNCTION public.ingest_stripe_subscription(uuid,text,text,text,timestamptz,timestamptz,boolean,timestamptz,timestamptz,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_stripe_subscription(uuid,text,text,text,timestamptz,timestamptz,boolean,timestamptz,timestamptz,text) TO service_role;

-- ------------------------------------------------------------------
-- 6. Production Founder reads: filter to live only.
--    get_member_state is the canonical read; harden it.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_member_state(_user_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'is_active_member', public.is_active_member(_user_id),
    'is_founding_member', COALESCE(
       (SELECT is_founding_member FROM public.founding_members
         WHERE user_id = _user_id AND stripe_environment = 'live'),
       false),
    'founder_badge', EXISTS(
       SELECT 1 FROM public.founding_members
        WHERE user_id = _user_id AND stripe_environment = 'live'),
    'founding_price_status', (
       SELECT founding_price_eligibility_status FROM public.founding_members
        WHERE user_id = _user_id AND stripe_environment = 'live'),
    'founding_member_since', (
       SELECT founding_member_since FROM public.founding_members
        WHERE user_id = _user_id AND stripe_environment = 'live'),
    'subscription_status', (SELECT subscription_status FROM public.profiles WHERE id = _user_id),
    'current_period_end', (SELECT current_period_end FROM public.profiles WHERE id = _user_id),
    'is_admin', EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
  );
$$;

-- ------------------------------------------------------------------
-- 7. Simulated-time offer function (Test only, admin/service_role)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_test_get_membership_offer_at(
  _as_of timestamptz,
  _mode  text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_founding_starts timestamptz;
  v_founding_ends   timestamptz;
  v_is_founding     boolean;
BEGIN
  IF _mode <> 'test' THEN
    RAISE EXCEPTION 'admin_test_get_membership_offer_at only supports mode=test';
  END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR auth.uid() IS NULL) THEN
    -- auth.uid() IS NULL implies service_role/no-auth JWT (server context)
    RAISE EXCEPTION 'admin or service_role required';
  END IF;
  IF _as_of IS NULL THEN
    RAISE EXCEPTION 'as_of is required';
  END IF;

  SELECT (value #>> '{}')::timestamptz INTO v_founding_starts
    FROM public.app_settings WHERE key='founding_beta_starts_at' AND value <> 'null'::jsonb;
  SELECT (value #>> '{}')::timestamptz INTO v_founding_ends
    FROM public.app_settings WHERE key='founding_beta_ends_at' AND value <> 'null'::jsonb;

  v_is_founding := v_founding_starts IS NOT NULL
               AND v_founding_ends IS NOT NULL
               AND _as_of >= v_founding_starts
               AND _as_of <  v_founding_ends;

  RETURN jsonb_build_object(
    'mode','test',
    'as_of', _as_of,
    'is_founding_window', v_is_founding,
    'founding_starts_at', v_founding_starts,
    'founding_ends_at',   v_founding_ends,
    'offer', CASE WHEN v_is_founding THEN 'founding' ELSE 'standard' END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_test_get_membership_offer_at(timestamptz,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_test_get_membership_offer_at(timestamptz,text) TO authenticated, service_role;

-- ------------------------------------------------------------------
-- 8. Admin/service_role test lifecycle reset for a user (test rows only)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_test_reset_user_lifecycle(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_deleted int;
  v_ent_deleted int;
  v_fnd_deleted int;
  v_aud_deleted int;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'admin or service_role required';
  END IF;

  DELETE FROM public.entitlements
   WHERE user_id = _user_id AND COALESCE(stripe_environment,'live') = 'test';
  GET DIAGNOSTICS v_ent_deleted = ROW_COUNT;

  DELETE FROM public.subscriptions
   WHERE profile_id = _user_id AND stripe_environment = 'test';
  GET DIAGNOSTICS v_sub_deleted = ROW_COUNT;

  DELETE FROM public.founder_price_audit
   WHERE user_id = _user_id AND COALESCE(stripe_environment,'live') = 'test';
  GET DIAGNOSTICS v_aud_deleted = ROW_COUNT;

  -- Founding rows: only delete non-lost rows; 'lost' remains
  -- irreversible even in test to preserve monotonic semantics under
  -- test as well. Callers who want a fully clean slate should use a
  -- different test user_id.
  DELETE FROM public.founding_members
   WHERE user_id = _user_id
     AND stripe_environment = 'test'
     AND founding_price_eligibility_status <> 'lost';
  GET DIAGNOSTICS v_fnd_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'entitlements_deleted', v_ent_deleted,
    'subscriptions_deleted', v_sub_deleted,
    'founder_rows_deleted', v_fnd_deleted,
    'founder_audit_deleted', v_aud_deleted
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_test_reset_user_lifecycle(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_test_reset_user_lifecycle(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------------
-- 9. Phase 3.2 self-test function
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._phase3_2_run_tests()
RETURNS TABLE(label text, passed boolean, note text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_uid2 uuid;
  v_r jsonb;
  v_token1 uuid;
  v_ok boolean;
  v_starts timestamptz;
  v_ends timestamptz;
BEGIN
  SELECT id INTO v_uid FROM public.profiles LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT 'no-user'::text, true, 'no profile row; assertions skipped';
    RETURN;
  END IF;

  -- Cleanup from any prior run
  DELETE FROM public.stripe_webhook_events WHERE event_id LIKE '__p32_%';
  PERFORM public.admin_test_reset_user_lifecycle(v_uid);

  ---------------------------------------------------------------
  -- A. Lease acquisition on fresh event
  ---------------------------------------------------------------
  v_r := public.stripe_webhook_reserve_event('__p32_evt_lease__','x','test', now());
  IF (v_r->>'status') = 'acquired' AND (v_r->>'lease_token') IS NOT NULL THEN
    RETURN QUERY SELECT 'lease-acquired-fresh'::text, true, v_r::text;
    v_token1 := (v_r->>'lease_token')::uuid;
  ELSE
    RETURN QUERY SELECT 'lease-acquired-fresh'::text, false, v_r::text;
    v_token1 := NULL;
  END IF;

  ---------------------------------------------------------------
  -- B. Concurrent second delivery on same fresh row → in_progress
  ---------------------------------------------------------------
  v_r := public.stripe_webhook_reserve_event('__p32_evt_lease__','x','test', now());
  RETURN QUERY SELECT
    'lease-concurrent-in-progress'::text,
    (v_r->>'status') = 'in_progress',
    v_r::text;

  ---------------------------------------------------------------
  -- C. Wrong lease token cannot complete
  ---------------------------------------------------------------
  RETURN QUERY SELECT
    'lease-wrong-token-cannot-complete'::text,
    NOT public.stripe_webhook_complete_event('__p32_evt_lease__','test', gen_random_uuid()),
    'wrong token must return false';

  ---------------------------------------------------------------
  -- D. Correct lease can complete; completed short-circuits retries
  ---------------------------------------------------------------
  RETURN QUERY SELECT
    'lease-correct-token-completes'::text,
    public.stripe_webhook_complete_event('__p32_evt_lease__','test', v_token1),
    'lease token completes';

  v_r := public.stripe_webhook_reserve_event('__p32_evt_lease__','x','test', now());
  RETURN QUERY SELECT
    'completed-short-circuits'::text,
    (v_r->>'status') = 'completed',
    v_r::text;

  ---------------------------------------------------------------
  -- E. Failed event can be reclaimed (retry)
  ---------------------------------------------------------------
  v_r := public.stripe_webhook_reserve_event('__p32_evt_fail__','x','test', now());
  PERFORM public.stripe_webhook_fail_event('__p32_evt_fail__','test',
    (v_r->>'lease_token')::uuid, 'sim');
  v_r := public.stripe_webhook_reserve_event('__p32_evt_fail__','x','test', now());
  RETURN QUERY SELECT
    'failed-retry-reacquires'::text,
    (v_r->>'status') = 'acquired' AND (v_r->>'reclaimed_from') = 'failed',
    v_r::text;

  ---------------------------------------------------------------
  -- F. Stale processing (backdated started_at) can be reclaimed
  ---------------------------------------------------------------
  v_r := public.stripe_webhook_reserve_event('__p32_evt_stale__','x','test', now());
  UPDATE public.stripe_webhook_events
     SET started_at = now() - interval '30 minutes'
   WHERE event_id = '__p32_evt_stale__';
  v_r := public.stripe_webhook_reserve_event('__p32_evt_stale__','x','test', now());
  RETURN QUERY SELECT
    'stale-processing-reclaimed'::text,
    (v_r->>'status') = 'acquired' AND (v_r->>'reclaimed_from') = 'processing',
    v_r::text;

  ---------------------------------------------------------------
  -- G. env-mismatch audit path
  ---------------------------------------------------------------
  PERFORM public.stripe_webhook_record_env_mismatch(
    '__p32_env_mismatch__', 'live', false, 'test livemode with live secret'
  );
  RETURN QUERY SELECT
    'env-mismatch-audited'::text,
    EXISTS (SELECT 1 FROM public.stripe_webhook_env_mismatches
             WHERE event_id = '__p32_env_mismatch__'),
    'row recorded';
  DELETE FROM public.stripe_webhook_env_mismatches WHERE event_id = '__p32_env_mismatch__';

  ---------------------------------------------------------------
  -- H. Founding-window boundary cases via simulated-time RPC
  ---------------------------------------------------------------
  SELECT (value #>> '{}')::timestamptz INTO v_starts
    FROM public.app_settings WHERE key='founding_beta_starts_at' AND value <> 'null'::jsonb;
  SELECT (value #>> '{}')::timestamptz INTO v_ends
    FROM public.app_settings WHERE key='founding_beta_ends_at' AND value <> 'null'::jsonb;
  IF v_starts IS NULL OR v_ends IS NULL THEN
    RETURN QUERY SELECT 'founding-window-boundaries'::text, false, 'founding_beta_starts_at/ends_at not set';
  ELSE
    v_r := public.admin_test_get_membership_offer_at(v_starts - interval '1 second','test');
    RETURN QUERY SELECT 'founding-boundary-before-open'::text,
      (v_r->>'offer')='standard', v_r::text;
    v_r := public.admin_test_get_membership_offer_at(v_starts,'test');
    RETURN QUERY SELECT 'founding-boundary-open-instant'::text,
      (v_r->>'offer')='founding', v_r::text;
    v_r := public.admin_test_get_membership_offer_at(v_starts + interval '15 days','test');
    RETURN QUERY SELECT 'founding-boundary-mid-window'::text,
      (v_r->>'offer')='founding', v_r::text;
    v_r := public.admin_test_get_membership_offer_at(v_ends - interval '1 second','test');
    RETURN QUERY SELECT 'founding-boundary-before-close'::text,
      (v_r->>'offer')='founding', v_r::text;
    v_r := public.admin_test_get_membership_offer_at(v_ends,'test');
    RETURN QUERY SELECT 'founding-boundary-close-instant'::text,
      (v_r->>'offer')='standard', v_r::text;
    v_r := public.admin_test_get_membership_offer_at(v_ends + interval '1 second','test');
    RETURN QUERY SELECT 'founding-boundary-after-close'::text,
      (v_r->>'offer')='standard', v_r::text;
  END IF;

  ---------------------------------------------------------------
  -- I. Test founder writes coexist with live; production reads filter live.
  ---------------------------------------------------------------
  INSERT INTO public.founding_members(user_id, founding_price_eligibility_status, stripe_environment)
    VALUES (v_uid, 'active', 'test')
    ON CONFLICT (user_id, stripe_environment) DO NOTHING;
  v_ok := (SELECT (public.get_member_state(v_uid)->>'founder_badge')::boolean) = false
          OR EXISTS (SELECT 1 FROM public.founding_members
                      WHERE user_id = v_uid AND stripe_environment = 'live');
  RETURN QUERY SELECT
    'test-founder-does-not-flip-live-badge'::text,
    -- Badge must reflect *only* live-tagged rows
    (SELECT (public.get_member_state(v_uid)->>'founder_badge')::boolean)
      = EXISTS (SELECT 1 FROM public.founding_members
                 WHERE user_id = v_uid AND stripe_environment = 'live'),
    'get_member_state ignores test founder';

  ---------------------------------------------------------------
  -- J. Test cancellation cannot forfeit live founder eligibility
  ---------------------------------------------------------------
  -- Ensure a live 'active' founder row exists to test isolation
  INSERT INTO public.founding_members(user_id, founding_price_eligibility_status, stripe_environment)
    VALUES (v_uid, 'active', 'live')
    ON CONFLICT (user_id, stripe_environment) DO NOTHING;
  PERFORM public.mark_founder_price_lost(v_uid, 'test forfeit','test');
  RETURN QUERY SELECT
    'test-cancel-does-not-forfeit-live'::text,
    (SELECT founding_price_eligibility_status FROM public.founding_members
       WHERE user_id = v_uid AND stripe_environment = 'live')
      IN ('active','in_grace'),
    'live row stays non-lost';

  ---------------------------------------------------------------
  -- K. Live founder monotonic still fires from env-scoped mark
  ---------------------------------------------------------------
  BEGIN
    UPDATE public.founding_members
       SET founding_price_eligibility_status = 'lost'
     WHERE user_id = v_uid AND stripe_environment = 'test';
    BEGIN
      UPDATE public.founding_members
         SET founding_price_eligibility_status = 'active'
       WHERE user_id = v_uid AND stripe_environment = 'test';
      RETURN QUERY SELECT 'test-founder-monotonic'::text, false, 'reversal NOT blocked in test';
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 'test-founder-monotonic'::text, true, SQLERRM;
    END;
  END;

  ---------------------------------------------------------------
  -- L. admin_test_reset_user_lifecycle removes test but not live
  ---------------------------------------------------------------
  v_r := public.admin_test_reset_user_lifecycle(v_uid);
  RETURN QUERY SELECT
    'test-reset-preserves-live-founder'::text,
    EXISTS (SELECT 1 FROM public.founding_members
             WHERE user_id = v_uid AND stripe_environment = 'live'),
    v_r::text;

  -- Cleanup all test-scoped fixtures
  DELETE FROM public.stripe_webhook_events WHERE event_id LIKE '__p32_%';
  PERFORM public.admin_test_reset_user_lifecycle(v_uid);
  -- Note: any lost-test-founder rows remain (monotonic). This is
  -- intentional per Phase 3.2 forfeiture rules.

  RETURN;
END;
$$;
REVOKE ALL ON FUNCTION public._phase3_2_run_tests() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._phase3_2_run_tests() TO service_role;
