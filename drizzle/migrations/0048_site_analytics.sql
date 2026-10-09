CREATE TABLE public.site_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL,
  event_type text NOT NULL DEFAULT 'page_view',
  path text,
  prev_path text,
  page_title text,
  door text,
  search_query text,
  results_count integer,
  device_type text,
  os text,
  browser text,
  timezone text,
  region text,
  local_hour smallint,
  local_dow smallint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.site_analytics_events TO anon, authenticated;
GRANT SELECT ON public.site_analytics_events TO authenticated;
GRANT ALL ON public.site_analytics_events TO service_role;
ALTER TABLE public.site_analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitors record own events" ON public.site_analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND length(coalesce(path,'')) < 500 AND length(coalesce(search_query,'')) < 200 AND length(coalesce(page_title,'')) < 300);
CREATE POLICY "Admins read events" ON public.site_analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX site_analytics_events_created_idx ON public.site_analytics_events (created_at);
CREATE INDEX site_analytics_events_session_idx ON public.site_analytics_events (session_id, created_at);

CREATE OR REPLACE FUNCTION public.admin_site_analytics(_from timestamptz, _to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  WITH ev AS (SELECT * FROM site_analytics_events WHERE created_at >= _from AND created_at < _to),
  pv AS (SELECT * FROM ev WHERE event_type = 'page_view'),
  sess AS (
    SELECT session_id, min(created_at) AS s, max(created_at) AS e, count(*) AS pages,
           (array_agg(path ORDER BY created_at DESC))[1] AS last_path
    FROM pv GROUP BY session_id
  ),
  member_days AS (
    SELECT user_id, count(DISTINCT date_trunc('day', created_at)) AS d FROM pv WHERE user_id IS NOT NULL GROUP BY user_id
  ),
  member_profile AS (
    SELECT p.user_id,
      (SELECT pr.primary_focus FROM profiles pr WHERE pr.id = p.user_id) AS focus,
      mode() WITHIN GROUP (ORDER BY p.device_type) AS device,
      mode() WITHIN GROUP (ORDER BY CASE WHEN p.local_hour < 6 THEN 'Night' WHEN p.local_hour < 12 THEN 'Morning' WHEN p.local_hour < 18 THEN 'Afternoon' ELSE 'Evening' END) AS daypart,
      mode() WITHIN GROUP (ORDER BY p.door) FILTER (WHERE p.door IS NOT NULL) AS door
    FROM pv p WHERE p.user_id IS NOT NULL GROUP BY p.user_id
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'page_views', (SELECT count(*) FROM pv),
      'sessions', (SELECT count(*) FROM sess),
      'members', (SELECT count(DISTINCT user_id) FROM pv),
      'avg_pages', (SELECT round(avg(pages)::numeric, 1) FROM sess),
      'avg_minutes', (SELECT round(avg(extract(epoch FROM e - s) / 60)::numeric, 1) FROM sess WHERE pages > 1),
      'avg_visit_days', (SELECT round(avg(d)::numeric, 1) FROM member_days)
    ),
    'top_pages', COALESCE((SELECT jsonb_agg(t) FROM (SELECT path, max(page_title) AS title, max(door) AS door, count(*) AS views, count(DISTINCT coalesce(user_id::text, session_id)) AS people FROM pv GROUP BY path ORDER BY count(*) DESC LIMIT 25) t), '[]'),
    'doors', COALESCE((SELECT jsonb_agg(t) FROM (SELECT door, count(*) AS views FROM pv WHERE door IS NOT NULL GROUP BY door ORDER BY 2 DESC) t), '[]'),
    'focus', COALESCE((SELECT jsonb_agg(t) FROM (SELECT coalesce(primary_focus, 'not chosen') AS focus, count(*) AS members FROM profiles GROUP BY 1 ORDER BY 2 DESC) t), '[]'),
    'hours', COALESCE((SELECT jsonb_agg(t ORDER BY t.hr) FROM (SELECT local_hour AS hr, count(*) AS views FROM pv WHERE local_hour IS NOT NULL GROUP BY 1) t), '[]'),
    'weekdays', COALESCE((SELECT jsonb_agg(t ORDER BY t.dw) FROM (SELECT local_dow AS dw, count(*) AS views FROM pv WHERE local_dow IS NOT NULL GROUP BY 1) t), '[]'),
    'regions', COALESCE((SELECT jsonb_agg(t) FROM (SELECT coalesce(region, 'Unknown') AS region, count(DISTINCT session_id) AS sessions FROM pv GROUP BY 1 ORDER BY 2 DESC LIMIT 20) t), '[]'),
    'timezones', COALESCE((SELECT jsonb_agg(t) FROM (SELECT coalesce(timezone, 'Unknown') AS timezone, count(DISTINCT session_id) AS sessions FROM pv GROUP BY 1 ORDER BY 2 DESC LIMIT 20) t), '[]'),
    'devices', COALESCE((SELECT jsonb_agg(t) FROM (SELECT coalesce(device_type,'Unknown') AS device, count(DISTINCT session_id) AS sessions FROM pv GROUP BY 1 ORDER BY 2 DESC) t), '[]'),
    'os', COALESCE((SELECT jsonb_agg(t) FROM (SELECT coalesce(os,'Unknown') AS os, count(DISTINCT session_id) AS sessions FROM pv GROUP BY 1 ORDER BY 2 DESC) t), '[]'),
    'browsers', COALESCE((SELECT jsonb_agg(t) FROM (SELECT coalesce(browser,'Unknown') AS browser, count(DISTINCT session_id) AS sessions FROM pv GROUP BY 1 ORDER BY 2 DESC) t), '[]'),
    'journeys', COALESCE((SELECT jsonb_agg(t) FROM (SELECT prev_path AS from_path, path AS to_path, count(*) AS times FROM pv WHERE prev_path IS NOT NULL AND prev_path <> path GROUP BY 1,2 ORDER BY 3 DESC LIMIT 20) t), '[]'),
    'exits', COALESCE((SELECT jsonb_agg(t) FROM (SELECT last_path AS path, count(*) AS sessions FROM sess GROUP BY 1 ORDER BY 2 DESC LIMIT 15) t), '[]'),
    'searches', COALESCE((SELECT jsonb_agg(t) FROM (SELECT lower(trim(search_query)) AS query, count(*) AS times, round(avg(results_count)::numeric,0) AS avg_results FROM ev WHERE event_type = 'search' AND search_query IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 25) t), '[]'),
    'empty_searches', COALESCE((SELECT jsonb_agg(t) FROM (SELECT lower(trim(search_query)) AS query, count(*) AS times FROM ev WHERE event_type = 'search' AND search_query IS NOT NULL AND coalesce(results_count,0) = 0 GROUP BY 1 ORDER BY 2 DESC LIMIT 15) t), '[]'),
    'avatars', COALESCE((SELECT jsonb_agg(t) FROM (SELECT coalesce(focus,'no focus') AS focus, coalesce(device,'Unknown') AS device, daypart, coalesce(door,'—') AS door, count(*) AS members FROM member_profile GROUP BY 1,2,3,4 HAVING count(*) >= 3 ORDER BY 5 DESC LIMIT 12) t), '[]')
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_site_analytics(timestamptz, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_site_analytics(timestamptz, timestamptz) TO authenticated;