-- Arrival-B3 Slice 1.1: sequence_stage 1..7 correction + rollback-scoped verification fixtures

ALTER TABLE public.arrival_resource_registry
  DROP CONSTRAINT arrival_registry_sequence_ck;

ALTER TABLE public.arrival_resource_registry
  ADD CONSTRAINT arrival_registry_sequence_ck CHECK (
    sequence_stage IS NULL OR sequence_stage BETWEEN 1 AND 7
  );

COMMENT ON COLUMN public.arrival_resource_registry.sequence_stage IS
  'Locked sequence contract: 1 regulate, 2 restore, 3 clear, 4 reconnect, 5 reveal, 6 integrate, 7 deepen. NULL = unknown metadata and never qualifies a sequence-conditioned MATCH.';

DO $fix$
DECLARE
  _res uuid; _res2 uuid; _id uuid; _id2 uuid;
  _admin uuid; _member uuid; _tmp uuid := gen_random_uuid();
  _ok boolean; _err text; _pass int := 0;
  _code text; _i int; _sa timestamptz; _sr text; _sb uuid;
  _codes text[] := ARRAY['establish_safety','settle','anchor','contain','comfort','reduce_demand',
    'restore','replenish','separate','release','stabilise','orient','reconnect','clarify','reveal',
    'express','discharge','restore_agency','integrate','embody','deepen'];
BEGIN
  IF (SELECT count(*) FROM public.arrival_resource_registry) <> 0 THEN
    RAISE EXCEPTION 'PRECONDITION FAIL: registry not empty';
  END IF;

  SELECT id INTO _res FROM public.content_resources ORDER BY id LIMIT 1;
  SELECT id INTO _res2 FROM public.content_resources ORDER BY id OFFSET 1 LIMIT 1;
  SELECT user_id INTO _admin FROM public.user_roles WHERE role='admin' ORDER BY user_id LIMIT 1;
  SELECT u.id INTO _member FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=u.id AND r.role='admin')
    ORDER BY u.id LIMIT 1;
  IF _res IS NULL OR _res2 IS NULL OR _admin IS NULL OR _member IS NULL THEN
    RAISE EXCEPTION 'PRECONDITION FAIL: missing fixture actors/resources';
  END IF;

  INSERT INTO public.arrival_resource_registry (content_resource_id) VALUES (_res) RETURNING id INTO _id;

  -- F1: valid sequence stages 1..7
  FOR _i IN 1..7 LOOP
    UPDATE public.arrival_resource_registry SET sequence_stage=_i WHERE id=_id;
  END LOOP;
  _pass := _pass + 1;

  -- F2: rejected sequence values 0, 8, -1, non-integer
  FOREACH _code IN ARRAY ARRAY['0','8','-1','abc'] LOOP
    _ok := false;
    BEGIN
      EXECUTE format('UPDATE public.arrival_resource_registry SET sequence_stage=%L WHERE id=%L', _code, _id);
      _ok := true;
    EXCEPTION WHEN others THEN _ok := false;
    END;
    IF _ok THEN RAISE EXCEPTION 'FAIL F2: sequence value % accepted', _code; END IF;
  END LOOP;
  _pass := _pass + 1;

  -- F3: admin suspension via RPC records actor, timestamp, trimmed reason
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub',_admin::text,'role','authenticated')::text, true);
    PERFORM public.arrival_admin_suspend_resource(_id, '   safety review   ');
    _ok := true;
  EXCEPTION WHEN others THEN _err := SQLERRM; _ok := false;
  END;
  EXECUTE 'RESET ROLE';
  IF NOT _ok THEN RAISE EXCEPTION 'FAIL F3: admin suspend failed (%)', _err; END IF;
  SELECT suspended_at, suspension_reason, suspended_by INTO _sa,_sr,_sb
    FROM public.arrival_resource_registry WHERE id=_id;
  IF _sa IS NULL OR _sr <> 'safety review' OR _sb <> _admin THEN
    RAISE EXCEPTION 'FAIL F3: provenance wrong (%,%,%)', _sa,_sr,_sb;
  END IF;
  _pass := _pass + 1;

  -- F6: blank / whitespace / NULL reasons rejected
  FOREACH _code IN ARRAY ARRAY['', '   ', NULL] LOOP
    _ok := false;
    BEGIN
      EXECUTE 'SET LOCAL ROLE authenticated';
      PERFORM set_config('request.jwt.claims', json_build_object('sub',_admin::text,'role','authenticated')::text, true);
      PERFORM public.arrival_admin_suspend_resource(_id, _code);
      _ok := true;
    EXCEPTION WHEN others THEN _ok := false;
    END;
    EXECUTE 'RESET ROLE';
    IF _ok THEN RAISE EXCEPTION 'FAIL F6: blank reason accepted'; END IF;
  END LOOP;
  _pass := _pass + 1;

  -- F6b: table-level constraint rejects whitespace-only reason
  _ok := false;
  BEGIN
    UPDATE public.arrival_resource_registry SET suspension_reason='   ' WHERE id=_id;
    _ok := true;
  EXCEPTION WHEN others THEN _ok := false;
  END;
  IF _ok THEN RAISE EXCEPTION 'FAIL F6b: whitespace reason accepted at table level'; END IF;
  _pass := _pass + 1;

  -- F4: ordinary authenticated member cannot suspend or unsuspend
  _ok := false;
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub',_member::text,'role','authenticated')::text, true);
    PERFORM public.arrival_admin_suspend_resource(_id, 'member attempt');
    _ok := true;
  EXCEPTION WHEN others THEN _err := SQLERRM; _ok := false;
  END;
  EXECUTE 'RESET ROLE';
  IF _ok THEN RAISE EXCEPTION 'FAIL F4: member suspended a resource'; END IF;
  IF _err NOT LIKE '%Admin privileges required%' THEN RAISE EXCEPTION 'FAIL F4: unexpected error %', _err; END IF;
  _ok := false;
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub',_member::text,'role','authenticated')::text, true);
    PERFORM public.arrival_admin_unsuspend_resource(_id);
    _ok := true;
  EXCEPTION WHEN others THEN _err := SQLERRM; _ok := false;
  END;
  EXECUTE 'RESET ROLE';
  IF _ok THEN RAISE EXCEPTION 'FAIL F4: member unsuspended a resource'; END IF;
  _pass := _pass + 1;

  -- F4b: member has no direct table read/write path
  FOREACH _code IN ARRAY ARRAY[
    'SELECT count(*) FROM public.arrival_resource_registry',
    'UPDATE public.arrival_resource_registry SET admin_notes=''x''',
    'INSERT INTO public.arrival_resource_registry (content_resource_id) VALUES (gen_random_uuid())'] LOOP
    _ok := false;
    BEGIN
      EXECUTE 'SET LOCAL ROLE authenticated';
      EXECUTE _code;
      _ok := true;
    EXCEPTION WHEN others THEN _ok := false;
    END;
    EXECUTE 'RESET ROLE';
    IF _ok THEN RAISE EXCEPTION 'FAIL F4b: authenticated could run %', _code; END IF;
  END LOOP;
  _pass := _pass + 1;

  -- F5: anon cannot read or mutate registry
  FOREACH _code IN ARRAY ARRAY[
    'SELECT count(*) FROM public.arrival_resource_registry',
    'UPDATE public.arrival_resource_registry SET admin_notes=''x''',
    'DELETE FROM public.arrival_resource_registry'] LOOP
    _ok := false;
    BEGIN
      EXECUTE 'SET LOCAL ROLE anon';
      EXECUTE _code;
      _ok := true;
    EXCEPTION WHEN others THEN _ok := false;
    END;
    EXECUTE 'RESET ROLE';
    IF _ok THEN RAISE EXCEPTION 'FAIL F5: anon could run %', _code; END IF;
  END LOOP;
  _pass := _pass + 1;

  -- F7: unsuspension clears timestamp, reason and provenance together
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub',_admin::text,'role','authenticated')::text, true);
    PERFORM public.arrival_admin_unsuspend_resource(_id);
    _ok := true;
  EXCEPTION WHEN others THEN _err := SQLERRM; _ok := false;
  END;
  EXECUTE 'RESET ROLE';
  IF NOT _ok THEN RAISE EXCEPTION 'FAIL F7: admin unsuspend failed (%)', _err; END IF;
  SELECT suspended_at, suspension_reason, suspended_by INTO _sa,_sr,_sb
    FROM public.arrival_resource_registry WHERE id=_id;
  IF _sa IS NOT NULL OR _sr IS NOT NULL OR _sb IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL F7: residue after unsuspend';
  END IF;
  _pass := _pass + 1;

  -- F8: actor account deletion nulls suspended_by, suspension record stays valid
  _ok := false;
  BEGIN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES ('00000000-0000-0000-0000-000000000000', _tmp, 'authenticated', 'authenticated',
      'arrival-fixture-' || _tmp || '@example.invalid', 'x', now(), now(), now(), '{}'::jsonb, '{}'::jsonb);
    INSERT INTO public.user_roles (user_id, role) VALUES (_tmp, 'admin');
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub',_tmp::text,'role','authenticated')::text, true);
    PERFORM public.arrival_admin_suspend_resource(_id, 'temp actor suspension');
    EXECUTE 'RESET ROLE';
    SELECT suspended_by INTO _sb FROM public.arrival_resource_registry WHERE id=_id;
    IF _sb <> _tmp THEN RAISE EXCEPTION 'temp actor not recorded'; END IF;
    DELETE FROM auth.users WHERE id=_tmp;
    SELECT suspended_at, suspension_reason, suspended_by INTO _sa,_sr,_sb
      FROM public.arrival_resource_registry WHERE id=_id;
    IF _sa IS NULL OR _sr <> 'temp actor suspension' OR _sb IS NOT NULL THEN
      RAISE EXCEPTION 'deletion left invalid suspension (%,%,%)', _sa,_sr,_sb;
    END IF;
    _ok := true;
  EXCEPTION WHEN others THEN _err := SQLERRM; _ok := false;
  END;
  EXECUTE 'RESET ROLE';
  IF NOT _ok THEN
    RAISE EXCEPTION 'FAIL F8: account-deletion provenance test failed (%)', _err;
  END IF;
  _pass := _pass + 1;
  UPDATE public.arrival_resource_registry
     SET suspended_at=NULL, suspension_reason=NULL, suspended_by=NULL WHERE id=_id;

  -- F9a: duration
  UPDATE public.arrival_resource_registry SET duration_minutes=30 WHERE id=_id;
  FOREACH _code IN ARRAY ARRAY['0','-5'] LOOP
    _ok := false;
    BEGIN
      EXECUTE format('UPDATE public.arrival_resource_registry SET duration_minutes=%L WHERE id=%L', _code, _id);
      _ok := true;
    EXCEPTION WHEN others THEN _ok := false;
    END;
    IF _ok THEN RAISE EXCEPTION 'FAIL F9a: duration % accepted', _code; END IF;
  END LOOP;

  -- F9b: intensity
  FOR _i IN 1..3 LOOP
    UPDATE public.arrival_resource_registry SET intensity_level=_i WHERE id=_id;
  END LOOP;
  FOREACH _code IN ARRAY ARRAY['0','4','-1'] LOOP
    _ok := false;
    BEGIN
      EXECUTE format('UPDATE public.arrival_resource_registry SET intensity_level=%L WHERE id=%L', _code, _id);
      _ok := true;
    EXCEPTION WHEN others THEN _ok := false;
    END;
    IF _ok THEN RAISE EXCEPTION 'FAIL F9b: intensity % accepted', _code; END IF;
  END LOOP;

  -- F9c: modality vocabulary (valid, case variant, alias, empty, duplicate)
  UPDATE public.arrival_resource_registry SET modality_codes=ARRAY['meditation','somatic'] WHERE id=_id;
  FOREACH _code IN ARRAY ARRAY['Meditation','MEDITATION','breathwork',''] LOOP
    _ok := false;
    BEGIN
      UPDATE public.arrival_resource_registry SET modality_codes=ARRAY[_code] WHERE id=_id;
      _ok := true;
    EXCEPTION WHEN others THEN _ok := false;
    END;
    IF _ok THEN RAISE EXCEPTION 'FAIL F9c: modality % accepted', _code; END IF;
  END LOOP;
  _ok := false;
  BEGIN
    UPDATE public.arrival_resource_registry SET modality_codes=ARRAY['somatic','somatic'] WHERE id=_id;
    _ok := true;
  EXCEPTION WHEN others THEN _ok := false;
  END;
  IF _ok THEN RAISE EXCEPTION 'FAIL F9c: duplicate modality accepted'; END IF;

  -- F9d / F10: bridge codes — all 21 individually, plus invalid variants
  UPDATE public.arrival_resource_registry SET bridge_codes=_codes WHERE id=_id;
  FOREACH _code IN ARRAY _codes LOOP
    UPDATE public.arrival_resource_registry SET bridge_codes=ARRAY[_code] WHERE id=_id;
  END LOOP;
  FOREACH _code IN ARRAY ARRAY['Settle','SETTLE','grounding','ground','',' settle','settle '] LOOP
    _ok := false;
    BEGIN
      UPDATE public.arrival_resource_registry SET bridge_codes=ARRAY[_code] WHERE id=_id;
      _ok := true;
    EXCEPTION WHEN others THEN _ok := false;
    END;
    IF _ok THEN RAISE EXCEPTION 'FAIL F10: bridge code % accepted', _code; END IF;
  END LOOP;
  _ok := false;
  BEGIN
    UPDATE public.arrival_resource_registry SET bridge_codes=ARRAY['settle','settle'] WHERE id=_id;
    _ok := true;
  EXCEPTION WHEN others THEN _ok := false;
  END;
  IF _ok THEN RAISE EXCEPTION 'FAIL F10: duplicate bridge code accepted'; END IF;
  _pass := _pass + 1;

  -- F11: no Search-tag object participates in Arrival metadata
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE (c.conrelid::regclass::text LIKE 'arrival%' AND c.confrelid::regclass::text ~ 'tag')
       OR (c.confrelid::regclass::text LIKE 'arrival%' AND c.conrelid::regclass::text ~ 'tag')
  ) THEN RAISE EXCEPTION 'FAIL F11: tag/arrival constraint linkage exists'; END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name LIKE 'arrival%'
      AND column_name ~ '(^|_)tags?(_|$)'
  ) THEN RAISE EXCEPTION 'FAIL F11: arrival table exposes a tag column'; END IF;
  _pass := _pass + 1;

  -- F12: source identity immutable, duplicate identity and arc violations rejected
  _ok := false;
  BEGIN
    UPDATE public.arrival_resource_registry SET content_resource_id=_res2 WHERE id=_id;
    _ok := true;
  EXCEPTION WHEN others THEN _err := SQLERRM; _ok := false;
  END;
  IF _ok THEN RAISE EXCEPTION 'FAIL F12: source identity mutated'; END IF;
  IF _err NOT LIKE '%source identity is immutable%' THEN RAISE EXCEPTION 'FAIL F12: unexpected error %', _err; END IF;
  _ok := false;
  BEGIN
    INSERT INTO public.arrival_resource_registry (content_resource_id) VALUES (_res) RETURNING id INTO _id2;
    _ok := true;
  EXCEPTION WHEN others THEN _ok := false;
  END;
  IF _ok THEN RAISE EXCEPTION 'FAIL F12: duplicate registry identity accepted'; END IF;
  _ok := false;
  BEGIN
    INSERT INTO public.arrival_resource_registry (content_resource_id, course_id)
      VALUES (_res2, (SELECT id FROM public.courses LIMIT 1));
    _ok := true;
  EXCEPTION WHEN others THEN _ok := false;
  END;
  IF _ok THEN RAISE EXCEPTION 'FAIL F12: exclusive arc violated'; END IF;
  _pass := _pass + 1;

  -- F13: zero residue
  DELETE FROM public.arrival_resource_registry WHERE id=_id;
  IF (SELECT count(*) FROM public.arrival_resource_registry) <> 0 THEN
    RAISE EXCEPTION 'FAIL F13: registry rows remain';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id=_tmp)
     OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_tmp) THEN
    RAISE EXCEPTION 'FAIL F13: fixture actor residue';
  END IF;
  _pass := _pass + 1;

  RAISE NOTICE 'Arrival-B3 Slice 1.1 fixtures passed: % groups', _pass;
END
$fix$;