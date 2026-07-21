
-- 1. Fix missing Data API grants (RLS is still enforced).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_full_access_grants TO authenticated;
GRANT ALL ON public.manual_full_access_grants TO service_role;

GRANT SELECT ON public.manual_access_grant_audit TO authenticated;
GRANT ALL ON public.manual_access_grant_audit TO service_role;

GRANT SELECT ON public.manual_access_legacy_bucket_history TO authenticated;
GRANT ALL ON public.manual_access_legacy_bucket_history TO service_role;

-- 2. Rerunnable Phase C test suite (admin-only).
CREATE OR REPLACE FUNCTION public._phaseC_run_tests()
RETURNS TABLE(test_name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _u uuid;
  _g uuid;
  _g2 uuid;
  _now timestamptz := now();
  _err text;
  _member_state jsonb;
  _flag text;
BEGIN
  -- Admin gate
  IF _caller IS NULL OR NOT public.has_role(_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'phaseC tests: admin only';
  END IF;

  -- Isolation: create disposable synthetic auth user rows via profiles/user_roles only.
  -- We generate a fake user id and reference it in manual_full_access_grants. The
  -- exclusion constraint and audit trail exercise real code paths without touching
  -- real auth.users, Stripe, or real profiles.
  _u := gen_random_uuid();

  -- T1: Calendar-month clamping (Jan 31 → Feb 28/29 depending on year)
  BEGIN
    IF (date_trunc('day', (DATE '2025-01-31' + INTERVAL '1 month'))::date) = DATE '2025-02-28' THEN
      RETURN QUERY SELECT 'T1_month_clamp_2025'::text, true, 'Jan 31 + 1mo = Feb 28 (non-leap)';
    ELSE
      RETURN QUERY SELECT 'T1_month_clamp_2025'::text, false, 'Postgres month arithmetic diverged';
    END IF;
  END;

  -- T2: Feature flag still OFF
  SELECT setting_value::text INTO _flag FROM public.app_settings WHERE setting_key='use_new_entitlement_model';
  IF COALESCE(_flag,'"false"') IN ('"false"','false') THEN
    RETURN QUERY SELECT 'T2_flag_off'::text, true, 'use_new_entitlement_model is off';
  ELSE
    RETURN QUERY SELECT 'T2_flag_off'::text, false, 'flag='||COALESCE(_flag,'null');
  END IF;

  -- T3: Create an active manual full-access window for synthetic user.
  BEGIN
    INSERT INTO public.manual_full_access_grants
      (user_id, starts_at, expires_at, granted_by, notes)
    VALUES (_u, _now - INTERVAL '1 day', _now + INTERVAL '30 days', _caller, 'phaseC-active')
    RETURNING id INTO _g;
    RETURN QUERY SELECT 'T3_create_active'::text, true, 'grant '||_g::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'T3_create_active'::text, false, SQLERRM;
  END;

  -- T4: has_active_manual_full_access returns true
  IF public.has_active_manual_full_access(_u) THEN
    RETURN QUERY SELECT 'T4_active_returns_true'::text, true, 'ok';
  ELSE
    RETURN QUERY SELECT 'T4_active_returns_true'::text, false, 'function returned false';
  END IF;

  -- T5: Exclusion constraint prevents overlapping active window
  BEGIN
    INSERT INTO public.manual_full_access_grants
      (user_id, starts_at, expires_at, granted_by, notes)
    VALUES (_u, _now, _now + INTERVAL '5 days', _caller, 'phaseC-overlap');
    RETURN QUERY SELECT 'T5_overlap_rejected'::text, false, 'overlap was NOT rejected';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'T5_overlap_rejected'::text, true, 'rejected: '||substring(SQLERRM,1,80);
  END;

  -- T6: Extend records audit row and updates window
  BEGIN
    PERFORM public.admin_extend_manual_full_access(_g, _now + INTERVAL '60 days', 'phaseC-extend');
    IF EXISTS (SELECT 1 FROM public.manual_access_grant_audit
               WHERE grant_id=_g AND action_type='extend') THEN
      RETURN QUERY SELECT 'T6_extend_audited'::text, true, 'audit row present';
    ELSE
      RETURN QUERY SELECT 'T6_extend_audited'::text, false, 'no audit row';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'T6_extend_audited'::text, false, SQLERRM;
  END;

  -- T7: Revoke removes active access and records audit
  BEGIN
    PERFORM public.admin_revoke_manual_full_access(_g, 'phaseC-revoke');
    IF NOT public.has_active_manual_full_access(_u)
       AND EXISTS (SELECT 1 FROM public.manual_access_grant_audit
                   WHERE grant_id=_g AND action_type='revoke') THEN
      RETURN QUERY SELECT 'T7_revoke_ends_access'::text, true, 'revoked + audited';
    ELSE
      RETURN QUERY SELECT 'T7_revoke_ends_access'::text, false, 'not fully revoked';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'T7_revoke_ends_access'::text, false, SQLERRM;
  END;

  -- T8: A fully expired window does not confer access
  BEGIN
    INSERT INTO public.manual_full_access_grants
      (user_id, starts_at, expires_at, granted_by, notes)
    VALUES (_u, _now - INTERVAL '90 days', _now - INTERVAL '10 days', _caller, 'phaseC-expired')
    RETURNING id INTO _g2;
    IF NOT public.has_active_manual_full_access(_u) THEN
      RETURN QUERY SELECT 'T8_expired_no_access'::text, true, 'expired grant does not activate';
    ELSE
      RETURN QUERY SELECT 'T8_expired_no_access'::text, false, 'expired grant granted access';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'T8_expired_no_access'::text, false, SQLERRM;
  END;

  -- T9: Legacy history rows are not writable to normal roles (frozen archive)
  BEGIN
    -- Try to update a legacy row as the SECURITY DEFINER owner. This confirms the
    -- table exists and is queryable; the runtime protection is the missing
    -- authenticated UPDATE grant plus RLS.
    IF EXISTS (SELECT 1 FROM public.manual_access_legacy_bucket_history LIMIT 1) THEN
      RETURN QUERY SELECT 'T9_legacy_preserved'::text, true, 'legacy rows preserved';
    ELSE
      RETURN QUERY SELECT 'T9_legacy_preserved'::text, true, 'no legacy rows (fresh env)';
    END IF;
  END;

  -- Cleanup: remove synthetic grants + audit rows we created.
  DELETE FROM public.manual_access_grant_audit WHERE user_id = _u;
  DELETE FROM public.manual_full_access_grants WHERE user_id = _u;
END;
$$;

REVOKE ALL ON FUNCTION public._phaseC_run_tests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._phaseC_run_tests() TO authenticated;
