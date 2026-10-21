CREATE OR REPLACE FUNCTION public.admin_launch_stats(_from timestamp with time zone DEFAULT (now() - '30 days'::interval), _to timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _result jsonb;
BEGIN
  IF NOT public.admin_launch_stats_is_authorised() THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  SELECT jsonb_build_object(
    'range', jsonb_build_object('from', _from, 'to', _to),
    'funnel', (
      SELECT coalesce(jsonb_object_agg(event, c), '{}'::jsonb)
      FROM (
        SELECT event, count(*) AS c
        FROM public.launch_events
        WHERE created_at >= _from AND created_at < _to AND (NOT is_admin AND coalesce(session_id,'') NOT IN (SELECT session_id FROM public.launch_events WHERE is_admin AND session_id IS NOT NULL))
        GROUP BY event
      ) f
    ),
    'unique_visitors', (
      SELECT count(DISTINCT coalesce(session_id, id::text))
      FROM public.launch_events
      WHERE created_at >= _from AND created_at < _to
        AND event = 'sales_page_view' AND (NOT is_admin AND coalesce(session_id,'') NOT IN (SELECT session_id FROM public.launch_events WHERE is_admin AND session_id IS NOT NULL))
    ),
    'signups', (
      SELECT count(*) FROM public.profiles
      WHERE created_at >= _from AND created_at < _to AND NOT public.has_role(id, 'admin'::app_role)
    ),
    'new_members', (
      SELECT count(DISTINCT s.profile_id) FROM public.subscriptions s
      WHERE s.created_at >= _from AND s.created_at < _to
        AND s.stripe_environment = 'live'
        AND NOT public.has_role(s.profile_id, 'admin'::app_role)
        AND NOT EXISTS (
          SELECT 1 FROM public.subscriptions s2
          WHERE s2.profile_id = s.profile_id AND s2.stripe_environment = 'live'
            AND s2.created_at < s.created_at
        )
    ),
    'recent_members', (
      SELECT coalesce(jsonb_agg(row_to_json(rm) ORDER BY rm.member_since DESC), '[]'::jsonb)
      FROM (SELECT * FROM (
        SELECT DISTINCT ON (p.id)
          p.id, p.email, p.full_name, p.created_at AS account_created_at,
          s.created_at AS member_since, s.plan_code, s.cadence::text AS cadence, s.status::text AS status,
          (p.created_at < s.created_at - interval '1 day') AS existing_account
        FROM public.subscriptions s
        JOIN public.profiles p ON p.id = s.profile_id
        WHERE s.stripe_environment = 'live' AND NOT public.has_role(p.id, 'admin'::app_role)
        ORDER BY p.id, s.created_at ASC
      ) x ORDER BY member_since DESC LIMIT 25) rm
    ),
    'paying_members', (
      SELECT count(DISTINCT profile_id) FROM public.subscriptions
      WHERE status IN ('active', 'trialing') AND NOT public.has_role(profile_id, 'admin'::app_role)
    ),
    'payment_page_opened', (SELECT count(*) FROM public.launch_events WHERE event='membership_payment_page_opened' AND created_at >= _from AND created_at < _to AND (NOT is_admin AND coalesce(session_id,'') NOT IN (SELECT session_id FROM public.launch_events WHERE is_admin AND session_id IS NOT NULL))),
    'payments', (
      SELECT jsonb_build_object(
        'count', count(*),
        'revenue_cents', coalesce(sum(payments.amount_cents), 0),
        'currency', coalesce(min(payments.currency), 'AUD')
      )
      FROM public.payments
      LEFT JOIN public.invoices i ON i.id = payments.invoice_id
      WHERE (i.profile_id IS NULL OR NOT public.has_role(i.profile_id, 'admin'::app_role)) AND received_at >= _from AND received_at < _to
        AND payments.status IN ('succeeded', 'paid')
    ),
    'plan_mix', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'plan_code', plan_code, 'cadence', cadence::text, 'count', c
      ) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT plan_code, cadence, count(*) AS c
        FROM public.subscriptions
        WHERE status IN ('active', 'trialing') AND NOT public.has_role(profile_id, 'admin'::app_role)
        GROUP BY plan_code, cadence
      ) p
    ),
    'daily', (
      SELECT coalesce(jsonb_agg(row_to_json(d) ORDER BY d.day), '[]'::jsonb)
      FROM (
        SELECT
          gs.day::date AS day,
          (SELECT count(*) FROM public.launch_events e
            WHERE e.event = 'sales_page_view' AND (NOT e.is_admin AND coalesce(e.session_id,'') NOT IN (SELECT session_id FROM public.launch_events WHERE is_admin AND session_id IS NOT NULL))
              AND e.created_at >= gs.day AND e.created_at < gs.day + interval '1 day') AS views,
          (SELECT count(*) FROM public.launch_events e
            WHERE e.event LIKE '%enter_temple_clicked' AND (NOT e.is_admin AND coalesce(e.session_id,'') NOT IN (SELECT session_id FROM public.launch_events WHERE is_admin AND session_id IS NOT NULL))
              AND e.created_at >= gs.day AND e.created_at < gs.day + interval '1 day') AS cta_clicks,
          (SELECT count(*) FROM public.launch_events e
            WHERE e.event = 'membership_checkout_started' AND (NOT e.is_admin AND coalesce(e.session_id,'') NOT IN (SELECT session_id FROM public.launch_events WHERE is_admin AND session_id IS NOT NULL))
              AND e.created_at >= gs.day AND e.created_at < gs.day + interval '1 day') AS checkouts_started,
          (SELECT count(*) FROM public.launch_events e
            WHERE e.event = 'membership_payment_page_opened' AND (NOT e.is_admin AND coalesce(e.session_id,'') NOT IN (SELECT session_id FROM public.launch_events WHERE is_admin AND session_id IS NOT NULL))
              AND e.created_at >= gs.day AND e.created_at < gs.day + interval '1 day') AS payment_pages,
          (SELECT count(*) FROM public.profiles p
            WHERE p.created_at >= gs.day AND p.created_at < gs.day + interval '1 day' AND NOT public.has_role(p.id, 'admin'::app_role)) AS signups,
          (SELECT count(*) FROM public.payments pay LEFT JOIN public.invoices pi ON pi.id = pay.invoice_id
            WHERE (pi.profile_id IS NULL OR NOT public.has_role(pi.profile_id, 'admin'::app_role)) AND pay.status IN ('succeeded', 'paid')
              AND pay.received_at >= gs.day AND pay.received_at < gs.day + interval '1 day') AS payments,
          (SELECT coalesce(sum(pay.amount_cents), 0) FROM public.payments pay LEFT JOIN public.invoices pi ON pi.id = pay.invoice_id
            WHERE (pi.profile_id IS NULL OR NOT public.has_role(pi.profile_id, 'admin'::app_role)) AND pay.status IN ('succeeded', 'paid')
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
        WHERE created_at >= _from AND created_at < _to AND (NOT is_admin AND coalesce(session_id,'') NOT IN (SELECT session_id FROM public.launch_events WHERE is_admin AND session_id IS NOT NULL))
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
        LEFT JOIN public.affiliate_referrals r ON r.affiliate_id = af.id AND (r.referred_user_id IS NULL OR NOT public.has_role(r.referred_user_id, 'admin'::app_role))
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
        WHERE NOT public.has_role(p.id, 'admin'::app_role)
        ORDER BY p.created_at DESC
        LIMIT 25
      ) rs
    )
  ) INTO _result;

  RETURN _result;
END;
$function$;