-- 1. Rate-limit ledger for sign-up attempts (written only by the signup-guard edge function).
CREATE TABLE public.signup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_hash text NOT NULL,
  email_domain text,
  outcome text NOT NULL DEFAULT 'allowed',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.signup_attempts TO service_role;
GRANT SELECT ON public.signup_attempts TO authenticated;

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read signup attempts"
ON public.signup_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX signup_attempts_client_hash_created_at_idx
  ON public.signup_attempts (client_hash, created_at DESC);

-- 2. Audit trail of automatically removed unpaid accounts.
CREATE TABLE public.unpaid_account_purges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  account_created_at timestamptz,
  purged_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.unpaid_account_purges TO service_role;
GRANT SELECT ON public.unpaid_account_purges TO authenticated;

ALTER TABLE public.unpaid_account_purges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read unpaid account purges"
ON public.unpaid_account_purges
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Deterministic list of accounts that never reached payment.
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
  ORDER BY p.created_at
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.find_unpaid_accounts(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_unpaid_accounts(integer) TO authenticated, service_role;
