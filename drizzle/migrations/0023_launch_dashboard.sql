CREATE TABLE IF NOT EXISTS public.launch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  session_id text,
  path text,
  referrer text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  affiliate_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT launch_events_event_check CHECK (
    event IN (
      'sales_page_view',
      'hero_enter_temple_clicked',
      'midpage_enter_temple_clicked',
      'final_enter_temple_clicked',
      'faq_opened',
      'membership_checkout_started',
      'membership_checkout_completed'
    )
  ),
  CONSTRAINT launch_events_lengths CHECK (
    length(coalesce(session_id, '')) <= 64
    AND length(coalesce(path, '')) <= 500
    AND length(coalesce(referrer, '')) <= 500
    AND length(coalesce(referrer_host, '')) <= 255
    AND length(coalesce(utm_source, '')) <= 120
    AND length(coalesce(utm_medium, '')) <= 120
    AND length(coalesce(utm_campaign, '')) <= 120
    AND length(coalesce(affiliate_code, '')) <= 64
    AND pg_column_size(metadata) <= 2000
  )
);

CREATE INDEX IF NOT EXISTS launch_events_created_at_idx ON public.launch_events (created_at DESC);
CREATE INDEX IF NOT EXISTS launch_events_event_idx ON public.launch_events (event, created_at DESC);

GRANT INSERT ON public.launch_events TO anon;
GRANT INSERT, SELECT ON public.launch_events TO authenticated;
GRANT ALL ON public.launch_events TO service_role;

ALTER TABLE public.launch_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can record a launch event" ON public.launch_events;
CREATE POLICY "Anyone can record a launch event"
  ON public.launch_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read launch events" ON public.launch_events;
CREATE POLICY "Admins can read launch events"
  ON public.launch_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_launch_stats(
  _from timestamptz DEFAULT (now() - interval '30 days'),
  _to timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_service boolean := coalesce(current_setting('request.jwt.claim.role', true), current_user) = 'service_role';
  _result jsonb;
BEGIN
  IF NOT _is_service AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  SELECT jsonb_build_object(
    'range', jsonb_build_object('from', _from, 'to', _to),
    'funnel', (
      SELECT coalesce(jsonb_object_agg(event, c), '{}'::jsonb)
      FROM (
        SELECT event, count(*) AS c
        FROM public.launch_events
        WHERE created_at >= _from AND created_at < _to
        GROUP BY event
      ) f
    ),
    'unique_visitors', (
      SELECT count(DISTINCT coalesce(session_id, id::text))
      FROM public.launch_events
      WHERE created_at >= _from AND created_at < _to
        AND event = 'sales_page_view'
    ),
    'signups', (
      SELECT count(*) FROM public.profiles
      WHERE created_at >= _from AND created_at < _to
    ),
    'paying_members', (
      SELECT count(DISTINCT profile_id) FROM public.subscriptions
      WHERE status IN ('active', 'trialing')
    ),
    'payments', (
      SELECT jsonb_build_object(
        'count', count(*),
        'revenue_cents', coalesce(sum(amount_cents), 0),
        'currency', coalesce(min(currency), 'AUD')
      )
      FROM public.payments
      WHERE received_at >= _from AND received_at < _to
        AND status IN ('succeeded', 'paid')
    ),
    'plan_mix', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'plan_code', plan_code, 'cadence', cadence::text, 'count', c
      ) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT plan_code, cadence, count(*) AS c
        FROM public.subscriptions
        WHERE status IN ('active', 'trialing')
        GROUP BY plan_code, cadence
      ) p
    ),
    'daily', (
      SELECT coalesce(jsonb_agg(row_to_json(d) ORDER BY d.day), '[]'::jsonb)
      FROM (
        SELECT
          gs.day::date AS day,
          (SELECT count(*) FROM public.launch_events e
            WHERE e.event = 'sales_page_view'
              AND e.created_at >= gs.day AND e.created_at < gs.day + interval '1 day') AS views,
          (SELECT count(*) FROM public.launch_events e
            WHERE e.event LIKE '%enter_temple_clicked'
              AND e.created_at >= gs.day AND e.created_at < gs.day + interval '1 day') AS cta_clicks,
          (SELECT count(*) FROM public.launch_events e
            WHERE e.event = 'membership_checkout_started'
              AND e.created_at >= gs.day AND e.created_at < gs.day + interval '1 day') AS checkouts_started,
          (SELECT count(*) FROM public.profiles p
            WHERE p.created_at >= gs.day AND p.created_at < gs.day + interval '1 day') AS signups,
          (SELECT count(*) FROM public.payments pay
            WHERE pay.status IN ('succeeded', 'paid')
              AND pay.received_at >= gs.day AND pay.received_at < gs.day + interval '1 day') AS payments,
          (SELECT coalesce(sum(pay.amount_cents), 0) FROM public.payments pay
            WHERE pay.status IN ('succeeded', 'paid')
              AND pay.received_at >= gs.day AND pay.received_at < gs.day + interval '1 day') AS revenue_cents
        FROM generate_series(date_trunc('day', _from), date_trunc('day', _to), interval '1 day') AS gs(day)
      ) d
    ),
    'sources', (
      SELECT coalesce(jsonb_agg(row_to_json(s) ORDER BY s.views DESC), '[]'::jsonb)
      FROM (
        SELECT
          coalesce(nullif(utm_source, ''), nullif(referrer_host, ''), 'direct') AS source,
          count(*) FILTER (WHERE event = 'sales_page_view') AS views,
          count(*) FILTER (WHERE event = 'membership_checkout_started') AS checkouts_started
        FROM public.launch_events
        WHERE created_at >= _from AND created_at < _to
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 25
      ) s
    ),
    'affiliates', (
      SELECT coalesce(jsonb_agg(row_to_json(a) ORDER BY a.signups DESC), '[]'::jsonb)
      FROM (
        SELECT
          af.referral_code AS code,
          af.display_name,
          count(r.id) FILTER (WHERE r.signed_up_at >= _from AND r.signed_up_at < _to) AS signups,
          count(r.id) FILTER (WHERE r.converted_at >= _from AND r.converted_at < _to) AS conversions
        FROM public.affiliates af
        LEFT JOIN public.affiliate_referrals r ON r.affiliate_id = af.id
        GROUP BY af.referral_code, af.display_name
        HAVING count(r.id) FILTER (WHERE r.signed_up_at >= _from AND r.signed_up_at < _to) > 0
            OR count(r.id) FILTER (WHERE r.converted_at >= _from AND r.converted_at < _to) > 0
        ORDER BY 3 DESC
        LIMIT 25
      ) a
    ),
    'recent_signups', (
      SELECT coalesce(jsonb_agg(row_to_json(rs) ORDER BY rs.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT
          p.id, p.email, p.full_name, p.created_at,
          EXISTS (
            SELECT 1 FROM public.subscriptions s
            WHERE s.profile_id = p.id AND s.status IN ('active', 'trialing')
          ) AS has_membership
        FROM public.profiles p
        ORDER BY p.created_at DESC
        LIMIT 25
      ) rs
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_launch_stats(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_launch_stats(timestamptz, timestamptz) TO authenticated, service_role;