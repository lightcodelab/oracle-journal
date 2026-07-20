
-- Restore the Phase 1 remediation contract of is_active_member.
-- Phase 3.1 accidentally reintroduced an unconditional trailing
-- OR EXISTS(manual_access_grants ...) branch. Bucket-scoped grants
-- must NEVER confer full app membership; they only grant access to
-- their specific bucket via bucket-aware readers (can_view_lesson_by_door,
-- can_view_card, etc.), which remain unchanged.
--
-- No manual_access_grants rows are added, modified or deleted.

CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR (
      public.use_new_entitlement_model()
      AND EXISTS (
        SELECT 1 FROM public.entitlements
        WHERE user_id = _user_id
          AND product_kind = 'app_membership'
          AND COALESCE(stripe_environment,'live') <> 'test'
          AND (
            status = 'active'
            OR (status = 'in_grace' AND grace_until IS NOT NULL AND grace_until > now())
          )
          AND (ends_at IS NULL OR ends_at > now())
      )
    )
    OR (
      NOT public.use_new_entitlement_model()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _user_id
          AND subscription_status IN ('active','trialing')
      )
    );
$$;
