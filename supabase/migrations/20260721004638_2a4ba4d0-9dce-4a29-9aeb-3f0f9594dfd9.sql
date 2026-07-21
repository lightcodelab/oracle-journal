
-- Phase 4e: harden has_manual_access to prevent cross-user probing.
-- Preserves date-window and bucket-scope semantics; never widens a grant.

CREATE OR REPLACE FUNCTION public.has_manual_access(_user_id uuid, _bucket_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.manual_access_grants
    WHERE user_id = _user_id
      AND bucket_key = _bucket_key
      AND starts_at <= now()
      AND ends_at > now()
  )
  -- Enforce identity boundary:
  --   * service_role / SECURITY DEFINER server contexts have NULL auth.uid() -> allowed
  --   * ordinary authenticated callers may only look up their own grants
  --   * admins may look up anyone
  --   * anonymous is blocked by the revoke below in addition to this guard
  AND (
    auth.uid() IS NULL
    OR auth.uid() = _user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
$$;

-- Anonymous callers must not be able to probe grants at all.
REVOKE EXECUTE ON FUNCTION public.has_manual_access(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_manual_access(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_manual_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_manual_access(uuid, text) TO service_role;
