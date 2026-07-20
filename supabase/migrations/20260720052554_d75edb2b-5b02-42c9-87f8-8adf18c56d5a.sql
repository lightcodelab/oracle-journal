
-- =========================================================
-- Phase 3: Stripe integration foundation (additive)
-- =========================================================

-- 1. Seed configuration in app_settings ---------------------

INSERT INTO public.app_settings(key, value) VALUES
  ('founding_beta_starts_at', '"2026-09-14T00:00:00Z"'::jsonb),
  ('founding_beta_ends_at',   '"2026-12-13T23:00:00Z"'::jsonb),
  ('standard_price_id_test',  '"price_1Tv9WiS1OlJiqABw0jp26E22"'::jsonb),
  ('standard_price_id_live',  '"price_1Tv9YeS1OlJiqABwuTRkogji"'::jsonb),
  ('founding_price_id_test',  '"price_1Tv9VsS1OlJiqABw8cLPyOWp"'::jsonb),
  ('founding_price_id_live',  '"price_1Tv9YeS1OlJiqABwPMunzMz3"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Idempotency ledger for Stripe webhook events -----------

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  event_created_at timestamptz NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.stripe_webhook_events TO service_role;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads stripe events"
  ON public.stripe_webhook_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Public offer RPC (no Stripe IDs leak client-side) ------

CREATE OR REPLACE FUNCTION public.get_current_membership_offer()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_starts timestamptz;
  v_ends timestamptz;
  v_in_window boolean;
BEGIN
  SELECT (value #>> '{}')::timestamptz INTO v_starts
    FROM public.app_settings WHERE key = 'founding_beta_starts_at' AND value <> 'null'::jsonb;
  SELECT (value #>> '{}')::timestamptz INTO v_ends
    FROM public.app_settings WHERE key = 'founding_beta_ends_at'   AND value <> 'null'::jsonb;

  v_in_window := v_starts IS NOT NULL
             AND v_ends   IS NOT NULL
             AND v_now >= v_starts
             AND v_now <  v_ends;

  RETURN jsonb_build_object(
    'tier', CASE WHEN v_in_window THEN 'founding' ELSE 'standard' END,
    'unit_amount_cents', CASE WHEN v_in_window THEN 3500 ELSE 5000 END,
    'currency', 'aud',
    'cadence', 'monthly',
    'is_founding_window_open', v_in_window,
    'founding_window_opens_at', v_starts,
    'founding_window_closes_at', v_ends,
    'server_time', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_membership_offer() TO anon, authenticated, service_role;

-- 4. Server-only price resolver ----------------------------
--    Takes the Stripe key mode ('test'|'live') and returns the
--    Stripe price ID that matches the current offer. Callable
--    only by service_role (edge functions).

CREATE OR REPLACE FUNCTION public.get_stripe_price_id_for_current_offer(_mode text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer jsonb := public.get_current_membership_offer();
  v_tier text := v_offer->>'tier';
  v_key text;
  v_price_id text;
BEGIN
  IF _mode NOT IN ('test','live') THEN
    RAISE EXCEPTION 'invalid mode: %', _mode;
  END IF;
  v_key := v_tier || '_price_id_' || _mode;
  SELECT (value #>> '{}') INTO v_price_id
    FROM public.app_settings WHERE key = v_key;
  IF v_price_id IS NULL THEN
    RAISE EXCEPTION 'no Stripe price configured for %', v_key;
  END IF;
  RETURN jsonb_build_object(
    'tier', v_tier,
    'stripe_price_id', v_price_id,
    'unit_amount_cents', v_offer->'unit_amount_cents',
    'currency', v_offer->>'currency'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_stripe_price_id_for_current_offer(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_stripe_price_id_for_current_offer(text) TO service_role;

-- 5. Founding-price forfeiture ------------------------------

CREATE OR REPLACE FUNCTION public.mark_founder_price_lost(
  _user_id uuid,
  _reason  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev text;
BEGIN
  SELECT founding_price_eligibility_status INTO v_prev
    FROM public.founding_members WHERE user_id = _user_id;

  IF v_prev IS NULL OR v_prev = 'lost' THEN
    RETURN;
  END IF;

  UPDATE public.founding_members
     SET founding_price_eligibility_status = 'lost',
         founding_price_lost_at = now(),
         founding_price_lost_reason = _reason,
         updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.founder_price_audit(user_id, action, from_status, to_status, reason)
  VALUES (_user_id, 'forfeit', v_prev, 'lost', _reason);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_founder_price_lost(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_founder_price_lost(uuid, text) TO service_role;

-- 6. Transactional Stripe subscription ingestion -----------
--
-- The webhook calls this once per verified event. It is fully
-- idempotent — repeated calls with the same or older
-- event_created_at are no-ops.
--
-- It writes:
--   * subscriptions mirror row
--   * entitlements row (source='stripe')
--   * founding_members row when this subscription used the
--     configured founding price and the founding window was open
--     at the subscription's start.
--   * marks founder price 'lost' when Stripe reports the
--     subscription in a terminal state (canceled/unpaid/
--     incomplete_expired).
--
-- Called by service_role only.

CREATE OR REPLACE FUNCTION public.ingest_stripe_subscription(
  _user_id                uuid,
  _stripe_subscription_id text,
  _stripe_price_id        text,
  _stripe_status          text,
  _current_period_start   timestamptz,
  _current_period_end     timestamptz,
  _cancel_at_period_end   boolean,
  _canceled_at            timestamptz,
  _event_created_at       timestamptz
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
  v_last_event_at       timestamptz;
  v_terminal            boolean;
  v_existing_founder    text;
BEGIN
  -- Ordering guard --------------------------------------------------
  SELECT last_event_at INTO v_last_event_at
    FROM public.subscriptions
   WHERE provider_subscription_id = _stripe_subscription_id;

  IF v_last_event_at IS NOT NULL AND v_last_event_at > _event_created_at THEN
    RETURN jsonb_build_object('skipped','older_event');
  END IF;

  -- Config lookups --------------------------------------------------
  SELECT (value #>> '{}') INTO v_founding_price_test
    FROM public.app_settings WHERE key='founding_price_id_test';
  SELECT (value #>> '{}') INTO v_founding_price_live
    FROM public.app_settings WHERE key='founding_price_id_live';
  SELECT (value #>> '{}')::timestamptz INTO v_founding_starts
    FROM public.app_settings WHERE key='founding_beta_starts_at' AND value <> 'null'::jsonb;
  SELECT (value #>> '{}')::timestamptz INTO v_founding_ends
    FROM public.app_settings WHERE key='founding_beta_ends_at' AND value <> 'null'::jsonb;
  SELECT COALESCE((value #>> '{}')::int, 10) INTO v_grace_days
    FROM public.app_settings WHERE key='failed_payment_grace_days';

  v_is_founding_price :=
    _stripe_price_id IS NOT NULL AND (
      _stripe_price_id = v_founding_price_test OR
      _stripe_price_id = v_founding_price_live
    );

  -- Map Stripe status -> entitlement status ------------------------
  v_terminal := _stripe_status IN ('canceled','unpaid','incomplete_expired');

  v_ent_status := CASE
    WHEN _stripe_status IN ('active','trialing') THEN 'active'
    WHEN _stripe_status = 'past_due' THEN 'in_grace'
    WHEN _stripe_status = 'paused' THEN 'paused'
    WHEN v_terminal THEN 'canceled'
    ELSE 'expired'
  END;

  IF v_ent_status = 'in_grace' THEN
    v_grace_until := COALESCE(_current_period_end, now()) + make_interval(days => v_grace_days);
  ELSE
    v_grace_until := NULL;
  END IF;

  -- Upsert subscription mirror -------------------------------------
  INSERT INTO public.subscriptions(
    profile_id, provider, provider_subscription_id, plan_code, cadence, status,
    current_period_start, current_period_end, cancel_at_period_end, canceled_at,
    last_event_at
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
    _canceled_at, _event_created_at
  )
  ON CONFLICT (provider_subscription_id) DO UPDATE
    SET status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        canceled_at = EXCLUDED.canceled_at,
        last_event_at = EXCLUDED.last_event_at,
        updated_at = now();

  -- Upsert entitlement (source='stripe', source_ref=sub id) -------
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
      'is_founding_price', v_is_founding_price
    )
  );

  -- Founding member creation --------------------------------------
  IF v_is_founding_price
     AND NOT v_terminal
     AND v_founding_starts IS NOT NULL
     AND v_founding_ends IS NOT NULL
     AND _current_period_start >= v_founding_starts
     AND _current_period_start <  v_founding_ends
  THEN
    INSERT INTO public.founding_members(user_id, founding_subscription_id, founding_price_eligibility_status)
    VALUES (_user_id, _stripe_subscription_id, 'active')
    ON CONFLICT (user_id) DO UPDATE
      SET founding_subscription_id = COALESCE(public.founding_members.founding_subscription_id, EXCLUDED.founding_subscription_id),
          updated_at = now();

    INSERT INTO public.founder_price_audit(user_id, action, to_status, reason)
    SELECT _user_id, 'granted', 'active',
           'Founding checkout at ' || _stripe_subscription_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.founder_price_audit
       WHERE user_id = _user_id AND action = 'granted'
    );
  END IF;

  -- Terminal state on the Founding subscription -> forfeit -------
  IF v_terminal THEN
    SELECT founding_subscription_id INTO v_existing_founder
      FROM public.founding_members WHERE user_id = _user_id;
    IF v_existing_founder = _stripe_subscription_id THEN
      PERFORM public.mark_founder_price_lost(_user_id,
        'Founding subscription terminated: ' || _stripe_status);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'entitlement_status', v_ent_status,
    'is_founding_price', v_is_founding_price,
    'terminal', v_terminal
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_stripe_subscription(uuid, text, text, text, timestamptz, timestamptz, boolean, timestamptz, timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_stripe_subscription(uuid, text, text, text, timestamptz, timestamptz, boolean, timestamptz, timestamptz) TO service_role;
