
-- 1. Identity boundary on get_member_state.
-- Previously any authenticated user could pass any UUID and read another user's
-- founder / subscription / manual-access / admin-role state. Restrict to
-- self-or-admin; anonymous callers receive an empty state.
CREATE OR REPLACE FUNCTION public.get_member_state(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_now timestamptz := now();
  v_state text := 'none';
  v_starts_at timestamptz;
  v_expires_at timestamptz;
  v_r RECORD;
  v_revoked_only boolean;
BEGIN
  -- Identity guard: only the subject or an admin may read this state.
  -- Do not leak information about existence of other users' records.
  IF v_caller IS NULL OR (v_caller <> _user_id AND NOT public.has_role(v_caller, 'admin'::public.app_role)) THEN
    RETURN jsonb_build_object(
      'is_active_member', false,
      'is_founding_member', false,
      'founder_badge', false,
      'founding_price_status', NULL,
      'founding_member_since', NULL,
      'subscription_status', NULL,
      'current_period_end', NULL,
      'is_admin', false,
      'manual_full_access', jsonb_build_object(
        'state', 'none', 'starts_at', NULL, 'expires_at', NULL
      ),
      'forbidden', true
    );
  END IF;

  SELECT starts_at, expires_at INTO v_r
  FROM public.manual_full_access_grants
  WHERE user_id = _user_id AND revoked_at IS NULL
    AND starts_at <= v_now AND expires_at > v_now
  ORDER BY expires_at DESC LIMIT 1;
  IF FOUND THEN
    v_state := 'active'; v_starts_at := v_r.starts_at; v_expires_at := v_r.expires_at;
  ELSE
    SELECT starts_at, expires_at INTO v_r
    FROM public.manual_full_access_grants
    WHERE user_id = _user_id AND revoked_at IS NULL AND starts_at > v_now
    ORDER BY starts_at ASC LIMIT 1;
    IF FOUND THEN
      v_state := 'scheduled'; v_starts_at := v_r.starts_at; v_expires_at := v_r.expires_at;
    ELSE
      SELECT starts_at, expires_at INTO v_r
      FROM public.manual_full_access_grants
      WHERE user_id = _user_id AND revoked_at IS NULL AND expires_at <= v_now
      ORDER BY expires_at DESC LIMIT 1;
      IF FOUND THEN
        v_state := 'expired'; v_starts_at := v_r.starts_at; v_expires_at := v_r.expires_at;
      ELSE
        SELECT EXISTS(SELECT 1 FROM public.manual_full_access_grants
                      WHERE user_id = _user_id AND revoked_at IS NOT NULL)
          INTO v_revoked_only;
        IF v_revoked_only THEN v_state := 'revoked_only'; END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_active_member', public.is_active_member(_user_id),
    'is_founding_member', COALESCE(
       (SELECT is_founding_member FROM public.founding_members
         WHERE user_id = _user_id AND stripe_environment = 'live'), false),
    'founder_badge', EXISTS(SELECT 1 FROM public.founding_members
        WHERE user_id = _user_id AND stripe_environment = 'live'),
    'founding_price_status', (SELECT founding_price_eligibility_status FROM public.founding_members
        WHERE user_id = _user_id AND stripe_environment = 'live'),
    'founding_member_since', (SELECT founding_member_since FROM public.founding_members
        WHERE user_id = _user_id AND stripe_environment = 'live'),
    'subscription_status', (SELECT subscription_status FROM public.profiles WHERE id = _user_id),
    'current_period_end', (SELECT current_period_end FROM public.profiles WHERE id = _user_id),
    'is_admin', EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'),
    'manual_full_access', jsonb_build_object(
      'state', v_state,
      'starts_at', v_starts_at,
      'expires_at', v_expires_at
    ),
    'forbidden', false
  );
END;
$function$;

-- 2. Remove the unused kill-switch flag. It was never read by app code and is
-- inconsistent with the current single-access-level policy.
DELETE FROM public.app_settings WHERE key = 'use_new_entitlement_model';
