
-- Phase 2: Introduce pre-launch state and server-side pre-launch checkout block.
-- No pricing, secrets, or entitlement data are modified.

CREATE OR REPLACE FUNCTION public.get_current_membership_offer()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_starts timestamptz;
  v_ends timestamptz;
  v_state text;
  v_tier text;
  v_amount int;
  v_checkout boolean;
BEGIN
  SELECT (value #>> '{}')::timestamptz INTO v_starts
    FROM public.app_settings WHERE key = 'founding_beta_starts_at' AND value <> 'null'::jsonb;
  SELECT (value #>> '{}')::timestamptz INTO v_ends
    FROM public.app_settings WHERE key = 'founding_beta_ends_at'   AND value <> 'null'::jsonb;

  IF v_starts IS NOT NULL AND v_now < v_starts THEN
    v_state := 'pre_launch';
    v_tier := 'pre_launch';
    v_amount := NULL;
    v_checkout := false;
  ELSIF v_starts IS NOT NULL AND v_ends IS NOT NULL
    AND v_now >= v_starts AND v_now < v_ends THEN
    v_state := 'founding';
    v_tier := 'founding';
    v_amount := 3500;
    v_checkout := true;
  ELSE
    v_state := 'standard';
    v_tier := 'standard';
    v_amount := 5000;
    v_checkout := true;
  END IF;

  RETURN jsonb_build_object(
    'state', v_state,
    'tier', v_tier,
    'unit_amount_cents', v_amount,
    'currency', 'aud',
    'cadence', 'monthly',
    'checkout_available', v_checkout,
    'is_founding_window_open', v_state = 'founding',
    'founding_window_opens_at', v_starts,
    'founding_window_closes_at', v_ends,
    'server_time', v_now
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_stripe_price_id_for_current_offer(_mode text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offer jsonb := public.get_current_membership_offer();
  v_tier text := v_offer->>'tier';
  v_available boolean := COALESCE((v_offer->>'checkout_available')::boolean, false);
  v_key text;
  v_price_id text;
BEGIN
  IF _mode NOT IN ('test','live') THEN
    RAISE EXCEPTION 'invalid mode: %', _mode;
  END IF;
  IF NOT v_available OR v_tier = 'pre_launch' THEN
    RAISE EXCEPTION 'membership_not_available: checkout is not open';
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_test_get_membership_offer_at(_as_of timestamp with time zone, _mode text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_founding_starts timestamptz;
  v_founding_ends   timestamptz;
  v_state text;
  v_offer text;
BEGIN
  IF _mode <> 'test' THEN
    RAISE EXCEPTION 'admin_test_get_membership_offer_at only supports mode=test';
  END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'admin or service_role required';
  END IF;
  IF _as_of IS NULL THEN
    RAISE EXCEPTION 'as_of is required';
  END IF;

  SELECT (value #>> '{}')::timestamptz INTO v_founding_starts
    FROM public.app_settings WHERE key='founding_beta_starts_at' AND value <> 'null'::jsonb;
  SELECT (value #>> '{}')::timestamptz INTO v_founding_ends
    FROM public.app_settings WHERE key='founding_beta_ends_at' AND value <> 'null'::jsonb;

  IF v_founding_starts IS NOT NULL AND _as_of < v_founding_starts THEN
    v_state := 'pre_launch';
    v_offer := 'pre_launch';
  ELSIF v_founding_starts IS NOT NULL AND v_founding_ends IS NOT NULL
    AND _as_of >= v_founding_starts AND _as_of < v_founding_ends THEN
    v_state := 'founding';
    v_offer := 'founding';
  ELSE
    v_state := 'standard';
    v_offer := 'standard';
  END IF;

  RETURN jsonb_build_object(
    'mode','test',
    'as_of', _as_of,
    'state', v_state,
    'is_founding_window', v_state = 'founding',
    'founding_starts_at', v_founding_starts,
    'founding_ends_at',   v_founding_ends,
    'offer', v_offer
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_current_membership_offer() TO anon, authenticated;
