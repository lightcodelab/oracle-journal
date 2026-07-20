
DROP FUNCTION IF EXISTS public._phase1_run_access_tests();
CREATE OR REPLACE FUNCTION public._phase1_run_access_tests()
RETURNS TABLE(label text, passed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  u_nonmember uuid; u_remem uuid; u_devo uuid; u_comb uuid; u_commun uuid;
  u_legacy uuid; u_admin uuid; u_deckbuyer uuid;
  u_active uuid; u_future uuid; u_exp_end uuid;
  u_gok uuid; u_gexp uuid; u_canceled uuid; u_paused uuid;
  ids uuid[];
  free_deck uuid; paid_deck uuid;
  devo_course uuid; remem_course uuid;
  v_results jsonb := '[]'::jsonb;
BEGIN
  SELECT array_agg(id ORDER BY id) INTO ids FROM (SELECT id FROM public.profiles LIMIT 15) t;
  IF COALESCE(array_length(ids,1),0) < 15 THEN RETURN QUERY SELECT 'setup'::text, false; RETURN; END IF;
  u_nonmember:=ids[1]; u_remem:=ids[2]; u_devo:=ids[3]; u_comb:=ids[4];
  u_commun:=ids[5]; u_legacy:=ids[6]; u_admin:=ids[7]; u_deckbuyer:=ids[8];
  u_active:=ids[9]; u_future:=ids[10]; u_exp_end:=ids[11]; u_gok:=ids[12];
  u_gexp:=ids[13]; u_canceled:=ids[14]; u_paused:=ids[15];

  BEGIN
    DELETE FROM public.user_roles           WHERE user_id = ANY(ids);
    DELETE FROM public.manual_access_grants WHERE user_id = ANY(ids);
    DELETE FROM public.entitlements         WHERE user_id = ANY(ids);
    DELETE FROM public.founding_members     WHERE user_id = ANY(ids);
    DELETE FROM public.deck_purchases       WHERE user_id = ANY(ids);
    UPDATE public.profiles
       SET member_tier_code=NULL, subscription_status=NULL, is_active_member=false
     WHERE id = ANY(ids);

    INSERT INTO public.manual_access_grants(user_id,bucket_key,starts_at,ends_at) VALUES
      (u_remem,'remembrance',now()-'1d'::interval,now()+'30d'::interval),
      (u_devo,'devotion',   now()-'1d'::interval,now()+'30d'::interval),
      (u_comb,'remembrance',now()-'1d'::interval,now()+'30d'::interval),
      (u_comb,'devotion',   now()-'1d'::interval,now()+'30d'::interval),
      (u_commun,'communion',now()-'1d'::interval,now()+'30d'::interval);
    UPDATE public.profiles SET member_tier_code='T1', subscription_status='active' WHERE id=u_legacy;
    INSERT INTO public.tier_bucket_access(tier_code,bucket_key,is_granted)
      VALUES ('T1','remembrance',true) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles(user_id, role) VALUES (u_admin,'admin')
      ON CONFLICT (user_id, role) DO NOTHING;

    SELECT id INTO free_deck FROM public.decks WHERE is_free=true OR is_starter=true LIMIT 1;
    SELECT id INTO paid_deck FROM public.decks WHERE COALESCE(is_free,false)=false AND COALESCE(is_starter,false)=false LIMIT 1;
    IF paid_deck IS NULL THEN INSERT INTO public.decks(name) VALUES ('_p1_paid') RETURNING id INTO paid_deck; END IF;
    IF free_deck IS NULL THEN INSERT INTO public.decks(name, is_free) VALUES ('_p1_free', true) RETURNING id INTO free_deck; END IF;
    INSERT INTO public.deck_purchases(user_id, deck_id, verified, woocommerce_order_id, woocommerce_customer_email)
      VALUES (u_deckbuyer, paid_deck, true, '_p1_test_order', '_p1@test.local');

    SELECT id INTO devo_course  FROM public.courses WHERE door_type='devotion'    LIMIT 1;
    SELECT id INTO remem_course FROM public.courses WHERE door_type='remembrance' LIMIT 1;

    INSERT INTO public.entitlements(user_id,source,source_ref,product_kind,status,starts_at,ends_at,grace_until) VALUES
      (u_active,   'stripe','_p1:active',    'app_membership','active',   now()-'10d'::interval, NULL, NULL),
      (u_future,   'stripe','_p1:future',    'app_membership','active',   now()-'10d'::interval, now()+'30d'::interval, NULL),
      (u_exp_end,  'stripe','_p1:exp_end',   'app_membership','active',   now()-'40d'::interval, now()-'1d'::interval, NULL),
      (u_gok,      'stripe','_p1:gok',       'app_membership','in_grace', now()-'30d'::interval, now()+'5d'::interval, now()+'5d'::interval),
      (u_gexp,     'stripe','_p1:gexp',      'app_membership','in_grace', now()-'30d'::interval, now()+'5d'::interval, now()-'1d'::interval),
      (u_canceled, 'stripe','_p1:canceled',  'app_membership','canceled', now()-'30d'::interval, now()-'1d'::interval, NULL),
      (u_paused,   'stripe','_p1:paused',    'app_membership','paused',   now()-'30d'::interval, NULL, NULL);

    BEGIN
      INSERT INTO public.entitlements(user_id,source,source_ref,product_kind,status)
      VALUES (u_nonmember,'stripe','_p1:bad','app_membership','in_grace');
      v_results := v_results || jsonb_build_object('label','invariant rejects in_grace w/o grace_until','passed',false);
    EXCEPTION WHEN others THEN
      v_results := v_results || jsonb_build_object('label','invariant rejects in_grace w/o grace_until','passed',true);
    END;

    UPDATE public.app_settings SET value='false'::jsonb WHERE key='use_new_entitlement_model';
    v_results := v_results
      || jsonb_build_object('label','legacy: nonmember denied','passed', public.is_active_member(u_nonmember)=false)
      || jsonb_build_object('label','legacy: remem-only manual not full','passed', public.is_active_member(u_remem)=false)
      || jsonb_build_object('label','legacy: legacy tier holder active','passed', public.is_active_member(u_legacy)=true)
      || jsonb_build_object('label','legacy: admin active','passed', public.is_active_member(u_admin)=true)
      || jsonb_build_object('label','legacy: entitlement alone does not grant','passed', public.is_active_member(u_active)=false);
    IF devo_course IS NOT NULL THEN
      v_results := v_results
        || jsonb_build_object('label','legacy: devo-manual views devotion course','passed', public.can_view_lesson_by_door(u_devo,devo_course)=true)
        || jsonb_build_object('label','legacy: remem-only CANNOT view devotion course','passed', public.can_view_lesson_by_door(u_remem,devo_course)=false)
        || jsonb_build_object('label','legacy: commun-only CANNOT view devotion course','passed', public.can_view_lesson_by_door(u_commun,devo_course)=false)
        || jsonb_build_object('label','legacy: remem+devo combined views devotion course','passed', public.can_view_lesson_by_door(u_comb,devo_course)=true);
    END IF;
    IF remem_course IS NOT NULL THEN
      v_results := v_results
        || jsonb_build_object('label','legacy: remem-manual views remembrance course','passed', public.can_view_lesson_by_door(u_remem,remem_course)=true)
        || jsonb_build_object('label','legacy: commun-only CANNOT view remembrance course','passed', public.can_view_lesson_by_door(u_commun,remem_course)=false);
    END IF;
    v_results := v_results
      || jsonb_build_object('label','legacy: free deck viewable by nonmember','passed', public.can_view_card(u_nonmember,free_deck)=true)
      || jsonb_build_object('label','legacy: paid deck viewable by purchaser','passed', public.can_view_card(u_deckbuyer,paid_deck)=true)
      || jsonb_build_object('label','legacy: paid deck NOT viewable by nonmember','passed', public.can_view_card(u_nonmember,paid_deck)=false)
      || jsonb_build_object('label','legacy: remem-manual can view paid deck','passed', public.can_view_card(u_remem,paid_deck)=true);

    UPDATE public.app_settings SET value='true'::jsonb WHERE key='use_new_entitlement_model';
    v_results := v_results
      || jsonb_build_object('label','new: nonmember denied','passed', public.is_active_member(u_nonmember)=false)
      || jsonb_build_object('label','new: active entitlement grants','passed', public.is_active_member(u_active)=true)
      || jsonb_build_object('label','new: future ends_at grants','passed', public.is_active_member(u_future)=true)
      || jsonb_build_object('label','new: expired ends_at denies','passed', public.is_active_member(u_exp_end)=false)
      || jsonb_build_object('label','new: in_grace w/ future grace_until grants','passed', public.is_active_member(u_gok)=true)
      || jsonb_build_object('label','new: in_grace w/ expired grace_until denies','passed', public.is_active_member(u_gexp)=false)
      || jsonb_build_object('label','new: canceled denies','passed', public.is_active_member(u_canceled)=false)
      || jsonb_build_object('label','new: paused denies','passed', public.is_active_member(u_paused)=false)
      || jsonb_build_object('label','new: historical remem-only manual grant does NOT grant','passed', public.is_active_member(u_remem)=false)
      || jsonb_build_object('label','new: historical combined manual grants do NOT grant','passed', public.is_active_member(u_comb)=false)
      || jsonb_build_object('label','new: legacy tier holder w/o entitlement denied','passed', public.is_active_member(u_legacy)=false)
      || jsonb_build_object('label','new: admin grants','passed', public.is_active_member(u_admin)=true);

    INSERT INTO public.entitlements(user_id,source,source_ref,product_kind,status,starts_at)
      VALUES (u_active,'stripe','_p1:active_2','app_membership','active', now()-'1d'::interval);
    UPDATE public.entitlements SET status='canceled', ends_at=now()-'1s'::interval
      WHERE source='stripe' AND source_ref='_p1:active';
    v_results := v_results || jsonb_build_object('label','new: two entitlements, ending one keeps user active','passed', public.is_active_member(u_active)=true);

    INSERT INTO public.entitlements(user_id,source,source_ref,product_kind,status,starts_at,ends_at)
      VALUES (u_nonmember,'manual','_p1:manual_full','app_membership','active', now()-'1d'::interval, now()+'365d'::interval);
    v_results := v_results || jsonb_build_object('label','new: manual full-membership entitlement grants','passed', public.is_active_member(u_nonmember)=true);

    v_results := v_results
      || jsonb_build_object('label','mirror: true for u_future','passed', (SELECT is_active_member FROM public.profiles WHERE id=u_future)=true)
      || jsonb_build_object('label','mirror: false for u_gexp','passed',  (SELECT is_active_member FROM public.profiles WHERE id=u_gexp)=false)
      || jsonb_build_object('label','mirror: false for historical bucket-only user','passed', (SELECT is_active_member FROM public.profiles WHERE id=u_remem)=false);

    UPDATE public.profiles SET is_active_member=true WHERE id=u_gexp;
    v_results := v_results || jsonb_build_object('label','security: stale mirror does NOT grant','passed', public.is_active_member(u_gexp)=false);
    UPDATE public.profiles SET is_active_member=false WHERE id=u_gexp;

    INSERT INTO public.founding_members(user_id) VALUES (u_gexp) ON CONFLICT DO NOTHING;
    v_results := v_results || jsonb_build_object('label','security: founder badge alone does NOT grant','passed', public.is_active_member(u_gexp)=false);

    v_results := v_results
      || jsonb_build_object('label','new: paid deck viewable by purchaser','passed', public.can_view_card(u_deckbuyer,paid_deck)=true)
      || jsonb_build_object('label','new: paid deck viewable by admin','passed', public.can_view_card(u_admin,paid_deck)=true)
      || jsonb_build_object('label','new: free deck viewable','passed', public.can_view_card(u_paused,free_deck)=true);

    UPDATE public.app_settings SET value='false'::jsonb WHERE key='use_new_entitlement_model';
    v_results := v_results
      || jsonb_build_object('label','flag OFF: entitlement no longer grants','passed', public.is_active_member(u_future)=false)
      || jsonb_build_object('label','flag OFF: legacy tier holder active','passed', public.is_active_member(u_legacy)=true);

    RAISE EXCEPTION '__p1_rollback__';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> '__p1_rollback__' THEN RAISE; END IF;
  END;

  UPDATE public.app_settings SET value='false'::jsonb WHERE key='use_new_entitlement_model';

  RETURN QUERY
    SELECT (elem->>'label')::text, (elem->>'passed')::boolean
      FROM jsonb_array_elements(v_results) elem;
END;
$fn$;

REVOKE ALL ON FUNCTION public._phase1_run_access_tests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._phase1_run_access_tests() TO service_role;
