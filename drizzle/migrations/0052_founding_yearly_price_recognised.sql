CREATE OR REPLACE FUNCTION public.ingest_stripe_subscription(_user_id uuid, _stripe_subscription_id text, _stripe_price_id text, _stripe_status text, _current_period_start timestamp with time zone, _current_period_end timestamp with time zone, _cancel_at_period_end boolean, _canceled_at timestamp with time zone, _event_created_at timestamp with time zone, _stripe_environment text DEFAULT 'live'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_founding_price_test text;
  v_founding_price_live text;
  v_founding_yearly_test text;
  v_founding_yearly_live text;
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
  SELECT (value #>> '{}') INTO v_founding_yearly_test
    FROM public.app_settings WHERE key='founding_yearly_price_id_test';
  SELECT (value #>> '{}') INTO v_founding_yearly_live
    FROM public.app_settings WHERE key='founding_yearly_price_id_live';
  SELECT (value #>> '{}')::timestamptz INTO v_founding_starts
    FROM public.app_settings WHERE key='founding_beta_starts_at' AND value <> 'null'::jsonb;
  SELECT (value #>> '{}')::timestamptz INTO v_founding_ends
    FROM public.app_settings WHERE key='founding_beta_ends_at' AND value <> 'null'::jsonb;
  SELECT COALESCE((value #>> '{}')::int, 15) INTO v_grace_days
    FROM public.app_settings WHERE key='failed_payment_grace_days';

  v_is_founding_price :=
    _stripe_price_id IS NOT NULL AND (
      (v_is_live     AND _stripe_price_id IN (v_founding_price_live, v_founding_yearly_live))
      OR (NOT v_is_live AND _stripe_price_id IN (v_founding_price_test, v_founding_yearly_test))
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
        plan_code = EXCLUDED.plan_code,
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
$function$;