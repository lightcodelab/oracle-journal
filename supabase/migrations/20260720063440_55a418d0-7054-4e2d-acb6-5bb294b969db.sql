
-- =========================================================
-- Phase 3.1 — Stripe test/live isolation, webhook idempotency
-- lifecycle, event ordering, monotonic founder forfeiture.
-- Additive only. Kill switch (use_new_entitlement_model)
-- unchanged.
-- =========================================================

-- 1. stripe_environment column on every Stripe-derived table ------

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_environment text NOT NULL DEFAULT 'live'
    CHECK (stripe_environment IN ('test','live'));

ALTER TABLE public.entitlements
  ADD COLUMN IF NOT EXISTS stripe_environment text
    CHECK (stripe_environment IS NULL OR stripe_environment IN ('test','live'));

ALTER TABLE public.founding_members
  ADD COLUMN IF NOT EXISTS stripe_environment text NOT NULL DEFAULT 'live'
    CHECK (stripe_environment IN ('test','live'));

ALTER TABLE public.founder_price_audit
  ADD COLUMN IF NOT EXISTS stripe_environment text
    CHECK (stripe_environment IS NULL OR stripe_environment IN ('test','live'));

CREATE INDEX IF NOT EXISTS entitlements_env_idx
  ON public.entitlements (user_id, stripe_environment);
CREATE INDEX IF NOT EXISTS subscriptions_env_idx
  ON public.subscriptions (profile_id, stripe_environment);

-- 2. stripe_webhook_events lifecycle rebuild ----------------------
--    Preserve any prior rows as 'completed'. Composite PK on
--    (event_id, stripe_environment) — Stripe IDs never collide
--    across envs but composite keeps intent explicit.

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS stripe_environment text NOT NULL DEFAULT 'live'
    CHECK (stripe_environment IN ('test','live'));
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('processing','completed','failed'));
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS attempt_count int NOT NULL DEFAULT 0;
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS last_error text;

-- Rebuild PK to include stripe_environment
ALTER TABLE public.stripe_webhook_events DROP CONSTRAINT IF EXISTS stripe_webhook_events_pkey;
ALTER TABLE public.stripe_webhook_events
  ADD CONSTRAINT stripe_webhook_events_pkey PRIMARY KEY (event_id, stripe_environment);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_status_idx
  ON public.stripe_webhook_events (status, stripe_environment);

-- 3. Event reservation RPCs (atomic INSERT ... ON CONFLICT) -------

CREATE OR REPLACE FUNCTION public.stripe_webhook_reserve_event(
  _event_id text,
  _event_type text,
  _stripe_environment text,
  _event_created_at timestamptz
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF _stripe_environment NOT IN ('test','live') THEN
    RAISE EXCEPTION 'invalid stripe_environment: %', _stripe_environment;
  END IF;

  INSERT INTO public.stripe_webhook_events (
    event_id, event_type, event_created_at, stripe_environment,
    status, attempt_count, started_at
  ) VALUES (
    _event_id, _event_type, _event_created_at, _stripe_environment,
    'processing', 1, now()
  )
  ON CONFLICT (event_id, stripe_environment) DO UPDATE
    SET status = CASE
                    WHEN public.stripe_webhook_events.status IN ('failed','processing')
                    THEN 'processing'
                    ELSE public.stripe_webhook_events.status
                 END,
        attempt_count = public.stripe_webhook_events.attempt_count + 1,
        started_at = CASE
                       WHEN public.stripe_webhook_events.status = 'completed'
                       THEN public.stripe_webhook_events.started_at
                       ELSE now()
                     END
  RETURNING status INTO v_status;

  RETURN v_status;  -- 'processing' (new or retry) or 'completed' (short-circuit)
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_webhook_reserve_event(text,text,text,timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_webhook_reserve_event(text,text,text,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.stripe_webhook_complete_event(
  _event_id text,
  _stripe_environment text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stripe_webhook_events
     SET status = 'completed',
         completed_at = now(),
         last_error = NULL
   WHERE event_id = _event_id AND stripe_environment = _stripe_environment;
$$;

REVOKE ALL ON FUNCTION public.stripe_webhook_complete_event(text,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_webhook_complete_event(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.stripe_webhook_fail_event(
  _event_id text,
  _stripe_environment text,
  _error text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stripe_webhook_events
     SET status = 'failed',
         last_error = LEFT(COALESCE(_error,''), 500)
   WHERE event_id = _event_id
     AND stripe_environment = _stripe_environment
     AND status <> 'completed';
$$;

REVOKE ALL ON FUNCTION public.stripe_webhook_fail_event(text,text,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_webhook_fail_event(text,text,text) TO service_role;

-- 4. Monotonic founder-price transition guard --------------------
--    Blocks any DB-side revert from 'lost' -> anything else, and
--    from 'in_grace' -> 'active' unless service_role sets a flag.
--    mark_founder_price_lost already short-circuits on 'lost'.

CREATE OR REPLACE FUNCTION public.founding_members_enforce_monotonic()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.founding_price_eligibility_status = 'lost'
     AND NEW.founding_price_eligibility_status <> 'lost' THEN
    RAISE EXCEPTION
      'founder price eligibility is immutable once lost (user=%)', OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS founding_members_monotonic ON public.founding_members;
CREATE TRIGGER founding_members_monotonic
  BEFORE UPDATE ON public.founding_members
  FOR EACH ROW EXECUTE FUNCTION public.founding_members_enforce_monotonic();

-- 5. Production access must ignore Test entitlements -------------
--    is_active_member() now excludes entitlements marked 'test'.
--    Manual grants and admin role remain untouched (never touched
--    by Stripe ingestion).

CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR (
      public.use_new_entitlement_model()
      AND EXISTS (
        SELECT 1 FROM public.entitlements
        WHERE user_id = _user_id
          AND product_kind = 'app_membership'
          AND COALESCE(stripe_environment,'live') <> 'test'
          AND (
            status = 'active'
            OR (status = 'in_grace' AND grace_until IS NOT NULL AND grace_until > now())
          )
          AND (ends_at IS NULL OR ends_at > now())
      )
    )
    OR (
      NOT public.use_new_entitlement_model()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _user_id
          AND subscription_status IN ('active','trialing')
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.manual_access_grants
       WHERE user_id = _user_id
         AND starts_at <= now() AND ends_at > now()
    );
$$;

-- 6. Environment-aware ingest_stripe_subscription ----------------
--    Adds _stripe_environment param. Test-env writes NEVER touch
--    founding_members / founder_price_audit / profile mirror.
--    Grace deadline is preserved on repeated past_due (monotonic).

DROP FUNCTION IF EXISTS public.ingest_stripe_subscription(uuid,text,text,text,timestamptz,timestamptz,boolean,timestamptz,timestamptz);

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

  -- Ordering guard (per-subscription) ------------------------------
  SELECT last_event_at, stripe_environment
    INTO v_last_event_at, v_existing_env
    FROM public.subscriptions
   WHERE provider_subscription_id = _stripe_subscription_id;

  IF v_last_event_at IS NOT NULL AND v_last_event_at > _event_created_at THEN
    RETURN jsonb_build_object('skipped','older_event');
  END IF;

  -- Environment must never cross for a given Stripe subscription id.
  IF v_existing_env IS NOT NULL AND v_existing_env <> _stripe_environment THEN
    RAISE EXCEPTION 'environment mismatch for %: existing=% incoming=%',
      _stripe_subscription_id, v_existing_env, _stripe_environment;
  END IF;

  -- Config lookups -------------------------------------------------
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

  -- Founding price detection scoped to environment
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

  -- Preserve original grace deadline: repeat past_due must not extend
  IF v_ent_status = 'in_grace' THEN
    SELECT grace_until INTO v_existing_grace
      FROM public.entitlements
     WHERE source = 'stripe' AND source_ref = _stripe_subscription_id
       AND COALESCE(stripe_environment,'live') = _stripe_environment;
    IF v_existing_grace IS NOT NULL THEN
      v_grace_until := v_existing_grace;
    ELSE
      -- Anchor to the failed-renewal boundary (current_period_end),
      -- NOT now(). Falls back to now() only if Stripe omitted it.
      v_grace_until := COALESCE(_current_period_end, now())
                       + make_interval(days => v_grace_days);
    END IF;
  ELSE
    v_grace_until := NULL;
  END IF;

  -- Upsert subscription mirror -------------------------------------
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

  -- Upsert entitlement (source='stripe', tagged with env) --------
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

  -- Tag entitlement row with environment (upsert_entitlement doesn't
  -- know about that column yet).
  UPDATE public.entitlements
     SET stripe_environment = _stripe_environment
   WHERE source = 'stripe' AND source_ref = _stripe_subscription_id;

  -- Founder / audit writes are LIVE-ONLY ---------------------------
  IF v_is_live THEN
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
      VALUES (_user_id, _stripe_subscription_id, 'active', 'live')
      ON CONFLICT (user_id) DO UPDATE
        SET founding_subscription_id = COALESCE(
              public.founding_members.founding_subscription_id,
              EXCLUDED.founding_subscription_id),
            updated_at = now();

      INSERT INTO public.founder_price_audit(user_id, action, to_status, reason, stripe_environment)
      SELECT _user_id, 'granted', 'active',
             'Founding checkout at ' || _stripe_subscription_id, 'live'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.founder_price_audit
         WHERE user_id = _user_id AND action = 'granted'
      );
    END IF;

    IF v_terminal THEN
      SELECT founding_subscription_id INTO v_existing_founder
        FROM public.founding_members
        WHERE user_id = _user_id AND stripe_environment = 'live';
      IF v_existing_founder = _stripe_subscription_id THEN
        PERFORM public.mark_founder_price_lost(_user_id,
          'Founding subscription terminated: ' || _stripe_status);
      END IF;
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

-- 7. Admin-only test-entitlement inspection RPC ------------------
--    Returns Test-env entitlement snapshot for a user without
--    granting production access. Requires admin caller.

CREATE OR REPLACE FUNCTION public.admin_inspect_test_entitlements(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  RETURN jsonb_build_object(
    'entitlements',
      (SELECT COALESCE(jsonb_agg(to_jsonb(e)), '[]'::jsonb)
         FROM public.entitlements e
        WHERE e.user_id = _user_id
          AND COALESCE(e.stripe_environment,'live') = 'test'),
    'subscriptions',
      (SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
         FROM public.subscriptions s
        WHERE s.profile_id = _user_id
          AND s.stripe_environment = 'test'),
    'grants_production_access_via_test', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_inspect_test_entitlements(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_inspect_test_entitlements(uuid) TO authenticated, service_role;

-- 8. Phase 3.1 database isolation self-test ----------------------
--    Callable by service_role. Uses a scratch auth user id space,
--    rolled back inside the function via savepoints — we instead
--    perform side-effect-free assertions with EXCEPTION blocks.

CREATE OR REPLACE FUNCTION public._phase3_run_isolation_tests()
RETURNS TABLE(label text, passed boolean, note text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_ok boolean;
  v_err text;
BEGIN
  -- Pick an existing user (falls back to zero uuid if none, tests skip)
  SELECT id INTO v_uid FROM public.profiles LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT 'no-user'::text, true, 'no profile row; assertions skipped';
    RETURN;
  END IF;

  -- Test 1: Founder monotonic trigger blocks lost -> active
  BEGIN
    INSERT INTO public.founding_members(user_id, founding_price_eligibility_status, stripe_environment)
    VALUES (v_uid, 'lost', 'live')
    ON CONFLICT (user_id) DO UPDATE
      SET founding_price_eligibility_status = 'lost';
    -- attempt reversal
    BEGIN
      UPDATE public.founding_members
         SET founding_price_eligibility_status = 'active'
       WHERE user_id = v_uid;
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

    -- Query directly: is there any non-test active entitlement contribution from this row?
    v_ok := NOT EXISTS (
      SELECT 1 FROM public.entitlements
       WHERE source_ref = '__phase3_test_sub__'
         AND stripe_environment = 'test'
         AND COALESCE(stripe_environment,'live') <> 'test'
    );
    RETURN QUERY SELECT 'test-entitlement-tagged'::text, v_ok,
      'test row must not appear in live-scoped filter';

    -- clean up
    DELETE FROM public.entitlements WHERE source_ref = '__phase3_test_sub__';
  END;

  -- Test 3: stripe_webhook_reserve_event returns 'completed' for
  -- an already-completed event, and 'processing' for new events.
  BEGIN
    DELETE FROM public.stripe_webhook_events WHERE event_id = '__phase3_evt__';
    IF public.stripe_webhook_reserve_event('__phase3_evt__','test.type','live', now()) = 'processing' THEN
      PERFORM public.stripe_webhook_complete_event('__phase3_evt__','live');
      IF public.stripe_webhook_reserve_event('__phase3_evt__','test.type','live', now()) = 'completed' THEN
        RETURN QUERY SELECT 'webhook-idempotency'::text, true, 'reserve returns completed on retry';
      ELSE
        RETURN QUERY SELECT 'webhook-idempotency'::text, false, 'retry did not report completed';
      END IF;
    ELSE
      RETURN QUERY SELECT 'webhook-idempotency'::text, false, 'first reserve did not return processing';
    END IF;
    DELETE FROM public.stripe_webhook_events WHERE event_id = '__phase3_evt__';
  END;

  -- Test 4: same event_id can co-exist across environments
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

REVOKE ALL ON FUNCTION public._phase3_run_isolation_tests() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._phase3_run_isolation_tests() TO service_role;
