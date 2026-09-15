-- Safeguards: never touch accounts that existed before this feature went live,
-- and never touch an explicitly protected address.
INSERT INTO public.app_settings (key, value, is_public)
VALUES ('purge_protected_emails', '["lightcodelab@gmail.com", "support@lightcodelab.com", "julie@julielewin.com"]'::jsonb, false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value, is_public)
VALUES ('purge_start_after', '"2026-09-15T00:00:00Z"'::jsonb, false)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.find_unpaid_accounts(_older_than_days integer DEFAULT 10)
RETURNS TABLE(user_id uuid, email text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.created_at
  FROM public.profiles p
  WHERE public.admin_launch_stats_is_authorised()
    AND p.created_at < now() - make_interval(days => GREATEST(_older_than_days, 1))
    AND p.created_at >= COALESCE(
      (SELECT (value #>> '{}')::timestamptz FROM public.app_settings WHERE key = 'purge_start_after'),
      now()
    )
    AND lower(COALESCE(p.email, '')) NOT IN (
      SELECT lower(e) FROM jsonb_array_elements_text(
        COALESCE((SELECT value FROM public.app_settings WHERE key = 'purge_protected_emails'), '[]'::jsonb)
      ) AS t(e)
    )
    AND COALESCE(p.is_active_member, false) = false
    AND p.stripe_customer_id IS NULL
    AND NOT public.has_full_temple_access(p.id)
    AND NOT public.has_role(p.id, 'admin'::app_role)
    AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.profile_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM public.entitlements e WHERE e.user_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM public.deck_purchases d WHERE d.user_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM public.affiliates a WHERE a.user_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM public.manual_access_grants g WHERE g.user_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM public.manual_full_access_grants g2 WHERE g2.user_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM public.journal_entries j WHERE j.user_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM public.pattern_records r WHERE r.user_id = p.id)
  ORDER BY p.created_at
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.find_unpaid_accounts(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_unpaid_accounts(integer) TO authenticated, service_role;
