-- Remove permissive public-read policy on public.affiliates that exposed
-- payout_email, stripe_connect_account_id, display_name, commission rates,
-- notes, and social handles for any active affiliate. Referral code lookups
-- are performed exclusively through the SECURITY DEFINER RPC
-- public.track_affiliate_click(_code), which returns only the minimal fields
-- required (id, referral_code). No client path selects from public.affiliates
-- anonymously by referral_code.
DROP POLICY IF EXISTS "Anyone can read active code lookup" ON public.affiliates;

-- Ensure anon has no residual privileges on the table; only authenticated
-- affiliate owners and admins can read (existing "Affiliates view own"
-- policy). The RPC runs as definer and does not require table grants for
-- anon.
REVOKE ALL ON public.affiliates FROM anon;