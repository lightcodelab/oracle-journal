
CREATE OR REPLACE FUNCTION public._oracle_access_run_tests()
RETURNS TABLE(name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid; v_member uuid; v_manual uuid; v_scheduled uuid;
  v_expired uuid; v_revoked uuid; v_legacy_before uuid; v_legacy_during uuid;
  v_legacy_after uuid; v_nobody uuid;
  v_now timestamptz := now();
BEGIN
  v_admin        := gen_random_uuid();
  v_member       := gen_random_uuid();
  v_manual       := gen_random_uuid();
  v_scheduled    := gen_random_uuid();
  v_expired      := gen_random_uuid();
  v_revoked      := gen_random_uuid();
  v_legacy_before:= gen_random_uuid();
  v_legacy_during:= gen_random_uuid();
  v_legacy_after := gen_random_uuid();
  v_nobody       := gen_random_uuid();

  -- Bypass FK constraints to auth.users for this transactional in-memory test.
  SET LOCAL session_replication_role = replica;

  INSERT INTO public.user_roles(user_id, role) VALUES (v_admin, 'admin');
  INSERT INTO public.profiles(id, subscription_status) VALUES
    (v_member,'active'),(v_manual,'canceled'),(v_scheduled,'canceled'),
    (v_expired,'canceled'),(v_revoked,'canceled'),
    (v_legacy_before,'canceled'),(v_legacy_during,'canceled'),
    (v_legacy_after,'canceled'),(v_nobody,'canceled');

  INSERT INTO public.manual_full_access_grants(user_id, starts_at, expires_at, granted_by)
    VALUES
      (v_manual,    v_now - interval '1 day', v_now + interval '30 days', v_admin),
      (v_scheduled, v_now + interval '10 days', v_now + interval '40 days', v_admin),
      (v_expired,   v_now - interval '30 days', v_now - interval '1 day', v_admin);
  INSERT INTO public.manual_full_access_grants(user_id, starts_at, expires_at, granted_by, revoked_at, revoked_by)
    VALUES (v_revoked, v_now - interval '10 days', v_now + interval '10 days', v_admin, v_now - interval '1 hour', v_admin);

  INSERT INTO public.manual_access_legacy_bucket_history(user_id, bucket_key, starts_at, ends_at, source)
    VALUES
      (v_legacy_before, 'devotion', v_now + interval '5 days',  v_now + interval '20 days', 'test'),
      (v_legacy_during, 'remembrance', v_now - interval '5 days',  v_now + interval '20 days', 'test'),
      (v_legacy_after,  'communion',   v_now - interval '30 days', v_now - interval '5 days',  'test');

  RETURN QUERY SELECT 'admin_has_full', public.has_full_temple_access(v_admin), 'admin unconditional';
  RETURN QUERY SELECT 'active_member_has_full', public.has_full_temple_access(v_member), 'profile subscription_status=active';
  RETURN QUERY SELECT 'active_manual_has_full', public.has_full_temple_access(v_manual), 'canonical manual active window';
  RETURN QUERY SELECT 'scheduled_denied', NOT public.has_full_temple_access(v_scheduled), 'future canonical grant does not grant early access';
  RETURN QUERY SELECT 'expired_denied', NOT public.has_full_temple_access(v_expired), 'expired canonical grant';
  RETURN QUERY SELECT 'revoked_denied', NOT public.has_full_temple_access(v_revoked), 'revoked-only history';
  RETURN QUERY SELECT 'legacy_before_denied', NOT public.has_full_temple_access(v_legacy_before), 'legacy window has not begun';
  RETURN QUERY SELECT 'legacy_during_has_full', public.has_full_temple_access(v_legacy_during), 'active dated legacy grants full temple';
  RETURN QUERY SELECT 'legacy_after_denied', NOT public.has_full_temple_access(v_legacy_after), 'legacy window closed';
  RETURN QUERY SELECT 'nobody_denied', NOT public.has_full_temple_access(v_nobody), 'no source';
  RETURN QUERY SELECT 'legacy_bucket_does_not_deny_other_area',
    public.has_full_temple_access(v_legacy_during) AND public.can_view_lesson(v_legacy_during)
    AND public.has_bucket_access(v_legacy_during,'devotion')
    AND public.has_bucket_access(v_legacy_during,'communion')
    AND public.has_bucket_access(v_legacy_during,'remembrance'),
    'active dated legacy user reaches every Temple area regardless of former bucket';
  RETURN QUERY SELECT 'wrapper_parity',
    public.can_view_lesson(v_manual) AND public.can_view_lesson(v_legacy_during)
    AND public.can_view_lesson(v_admin) AND public.can_view_lesson(v_member)
    AND NOT public.can_view_lesson(v_expired) AND NOT public.can_view_lesson(v_revoked)
    AND NOT public.can_view_lesson(v_scheduled) AND NOT public.can_view_lesson(v_nobody),
    'can_view_lesson matches has_full_temple_access for every state';
  -- get_member_state identity guard: caller = NULL must not leak.
  RETURN QUERY SELECT 'get_member_state_identity_guard',
    (public.get_member_state(v_manual) ->> 'forbidden')::boolean,
    'unauthenticated call to another user is forbidden';

  DELETE FROM public.manual_access_legacy_bucket_history WHERE user_id IN (v_legacy_before, v_legacy_during, v_legacy_after);
  DELETE FROM public.manual_full_access_grants WHERE user_id IN (v_manual, v_scheduled, v_expired, v_revoked);
  DELETE FROM public.user_roles WHERE user_id = v_admin;
  DELETE FROM public.profiles WHERE id IN (v_member,v_manual,v_scheduled,v_expired,v_revoked,v_legacy_before,v_legacy_during,v_legacy_after,v_nobody);
END;
$$;
