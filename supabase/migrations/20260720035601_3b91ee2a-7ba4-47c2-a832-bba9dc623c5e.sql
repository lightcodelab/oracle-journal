
DO $outer$
DECLARE
  v_fail_count int := 0;
  v_ok_count int := 0;

  u_nonmember uuid; u_remem uuid; u_devo uuid; u_comb uuid; u_commun uuid;
  u_legacy uuid; u_admin uuid; u_deckbuyer uuid;
  u_active uuid; u_future uuid; u_exp_end uuid;
  u_gok uuid; u_gexp uuid; u_canceled uuid; u_paused uuid;
  ids uuid[];
  free_deck uuid; paid_deck uuid;
  devo_course uuid; remem_course uuid;
BEGIN
  SELECT array_agg(id ORDER BY id) INTO ids FROM (SELECT id FROM public.profiles LIMIT 15) t;
  IF COALESCE(array_length(ids,1),0) < 15 THEN
    RAISE NOTICE 'SKIP tests: need 15 profiles'; RETURN;
  END IF;
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
      v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: invariant rejects in_grace w/o grace_until';
    EXCEPTION WHEN others THEN
      v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   invariant rejects in_grace w/o grace_until';
    END;

    RAISE NOTICE '===== LEGACY (flag=false) =====';
    UPDATE public.app_settings SET value='false'::jsonb WHERE key='use_new_entitlement_model';

    IF public.is_active_member(u_nonmember)=false THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   legacy nonmember not active'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: legacy nonmember not active'; END IF;
    IF public.is_active_member(u_remem)=false     THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   legacy remem-only manual: is_active_member=false'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: legacy remem manual not active'; END IF;
    IF public.is_active_member(u_legacy)=true     THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   legacy tier holder active'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: legacy tier holder active'; END IF;
    IF public.is_active_member(u_admin)=true      THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   admin active'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: admin active'; END IF;
    IF public.is_active_member(u_active)=false    THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   legacy: entitlement alone does NOT grant'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: legacy entitlement alone'; END IF;

    IF devo_course IS NOT NULL THEN
      IF public.can_view_lesson_by_door(u_devo, devo_course)=true    THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   legacy devo-manual views devotion course'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: legacy devo-manual views devotion'; END IF;
      IF public.can_view_lesson_by_door(u_remem, devo_course)=false  THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   legacy remem-only CANNOT view devotion course'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: legacy remem cannot view devotion'; END IF;
      IF public.can_view_lesson_by_door(u_commun, devo_course)=false THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   legacy commun-only CANNOT view devotion course'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: legacy commun cannot view devotion'; END IF;
      IF public.can_view_lesson_by_door(u_comb, devo_course)=true    THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   legacy remem+devo views devotion course'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: legacy remem+devo views devotion'; END IF;
    END IF;
    IF remem_course IS NOT NULL THEN
      IF public.can_view_lesson_by_door(u_remem, remem_course)=true   THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   legacy remem-manual views remembrance course'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: remem manual views remembrance'; END IF;
      IF public.can_view_lesson_by_door(u_commun, remem_course)=false THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   legacy commun-only CANNOT view remembrance course'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: commun cannot view remembrance'; END IF;
    END IF;

    IF public.can_view_card(u_nonmember, free_deck)=true THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   free deck viewable by nonmember'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: free deck viewable by nonmember'; END IF;
    IF public.can_view_card(u_deckbuyer, paid_deck)=true THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   paid deck viewable by purchaser'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: paid deck viewable by purchaser'; END IF;
    IF public.can_view_card(u_nonmember, paid_deck)=false THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   paid deck NOT viewable by nonmember'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: paid deck NOT viewable by nonmember'; END IF;
    IF public.can_view_card(u_remem, paid_deck)=true      THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   legacy remem-manual can view paid deck'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: legacy remem manual paid deck'; END IF;

    RAISE NOTICE '===== NEW MODEL (flag=true) =====';
    UPDATE public.app_settings SET value='true'::jsonb WHERE key='use_new_entitlement_model';

    IF public.is_active_member(u_nonmember)=false  THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   new nonmember denied'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: new nonmember'; END IF;
    IF public.is_active_member(u_active)=true      THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   active entitlement grants'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: active ent grants'; END IF;
    IF public.is_active_member(u_future)=true      THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   future ends_at grants'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: future ends grants'; END IF;
    IF public.is_active_member(u_exp_end)=false    THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   expired ends_at denies'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: expired ends denies'; END IF;
    IF public.is_active_member(u_gok)=true         THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   in_grace future grace_until grants'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: grace future grants'; END IF;
    IF public.is_active_member(u_gexp)=false       THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   in_grace expired grace_until denies'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: grace expired denies'; END IF;
    IF public.is_active_member(u_canceled)=false   THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   canceled denies'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: canceled denies'; END IF;
    IF public.is_active_member(u_paused)=false     THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   paused denies'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: paused denies'; END IF;
    IF public.is_active_member(u_remem)=false      THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   historical remem-only manual grant does NOT grant new-model active'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: hist remem grants'; END IF;
    IF public.is_active_member(u_comb)=false       THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   historical combined manual grants do NOT grant new-model'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: hist combined grants'; END IF;
    IF public.is_active_member(u_legacy)=false     THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   legacy tier holder w/o entitlement denied under new model'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: legacy tier under new model'; END IF;
    IF public.is_active_member(u_admin)=true       THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   admin grants under new model'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: admin new model'; END IF;

    INSERT INTO public.entitlements(user_id,source,source_ref,product_kind,status,starts_at)
      VALUES (u_active,'stripe','_p1:active_2','app_membership','active', now()-'1d'::interval);
    UPDATE public.entitlements SET status='canceled', ends_at=now()-'1s'::interval
      WHERE source='stripe' AND source_ref='_p1:active';
    IF public.is_active_member(u_active)=true THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   two entitlements: ending one keeps user active'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: two ents'; END IF;

    INSERT INTO public.entitlements(user_id,source,source_ref,product_kind,status,starts_at,ends_at)
      VALUES (u_nonmember,'manual','_p1:manual_full','app_membership','active', now()-'1d'::interval, now()+'365d'::interval);
    IF public.is_active_member(u_nonmember)=true THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   manual full-membership entitlement grants'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: manual full ent'; END IF;

    IF (SELECT is_active_member FROM public.profiles WHERE id=u_future)=true  THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   mirror true for u_future'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: mirror u_future'; END IF;
    IF (SELECT is_active_member FROM public.profiles WHERE id=u_gexp)=false   THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   mirror false for u_gexp'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: mirror u_gexp'; END IF;
    IF (SELECT is_active_member FROM public.profiles WHERE id=u_remem)=false  THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   mirror false for historical bucket-only user'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: mirror hist bucket'; END IF;

    UPDATE public.profiles SET is_active_member=true WHERE id=u_gexp;
    IF public.is_active_member(u_gexp)=false THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   stale mirror does NOT grant via is_active_member()'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: stale mirror'; END IF;

    UPDATE public.profiles SET is_active_member=false WHERE id=u_gexp;
    INSERT INTO public.founding_members(user_id) VALUES (u_gexp) ON CONFLICT DO NOTHING;
    IF public.is_active_member(u_gexp)=false THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   founder badge alone does NOT grant'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: founder alone'; END IF;

    IF public.can_view_card(u_deckbuyer, paid_deck)=true THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   new: paid deck viewable by purchaser'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: new paid purchaser'; END IF;
    IF public.can_view_card(u_admin, paid_deck)=true     THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   new: paid deck viewable by admin'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: new admin deck'; END IF;
    IF public.can_view_card(u_paused, free_deck)=true    THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   new: free deck viewable'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: new free deck'; END IF;

    UPDATE public.app_settings SET value='false'::jsonb WHERE key='use_new_entitlement_model';
    IF public.is_active_member(u_future)=false THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   flag OFF: entitlement no longer grants'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: flag off entitlement'; END IF;
    IF public.is_active_member(u_legacy)=true  THEN v_ok_count:=v_ok_count+1; RAISE NOTICE '  ok:   flag OFF: legacy tier holder active'; ELSE v_fail_count:=v_fail_count+1; RAISE NOTICE '  FAIL: flag off legacy'; END IF;

    RAISE NOTICE '=====================================';
    RAISE NOTICE '  TOTALS: ok=%   FAIL=%', v_ok_count, v_fail_count;
    RAISE NOTICE '=====================================';

    RAISE EXCEPTION '__phase1_test_rollback__ ok=% fail=%', v_ok_count, v_fail_count;

  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '__phase1_test_rollback__%' THEN
      RAISE NOTICE 'Subtransaction rolled back cleanly (test data discarded).';
    ELSE
      RAISE;
    END IF;
  END;

  UPDATE public.app_settings SET value='false'::jsonb WHERE key='use_new_entitlement_model';
END $outer$;
