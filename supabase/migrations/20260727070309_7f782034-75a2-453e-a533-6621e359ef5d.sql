-- Security remediation: remove public SELECT access on affiliate_links.
-- Redirect/click attribution is handled exclusively by the SECURITY DEFINER
-- public.track_affiliate_click(_code TEXT) RPC, which returns only the
-- minimal fields required for redirect.

-- 1. Drop the overly permissive public read policy.
DROP POLICY IF EXISTS "Public can read links for redirect" ON public.affiliate_links;

-- 2. Revoke direct anon table access; anon should only use the RPC.
REVOKE SELECT ON public.affiliate_links FROM anon;

-- 3. Re-affirm authenticated and service_role access for the Affiliate Portal.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_links TO authenticated;
GRANT ALL ON public.affiliate_links TO service_role;