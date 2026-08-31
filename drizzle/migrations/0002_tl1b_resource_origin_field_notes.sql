-- TL-1B: resource/card-origin Field Notes for Your Experiments.
-- Owner-only. Entitlement-aware server-derived title snapshots. No new table,
-- no new bucket, no widened grants, no Arrival path.

-- 1. Accept the `card` resource family on the accepted owner-only tag model.
ALTER TABLE public.living_resource_tags
  DROP CONSTRAINT IF EXISTS living_tags_family_chk;
ALTER TABLE public.living_resource_tags
  ADD CONSTRAINT living_tags_family_chk
  CHECK (resource_family IN ('content_resource','healing_resource','course','lesson','card'));

-- 2. Entitlement-aware title resolution. Publication alone is insufficient:
--    the caller must be entitled to the exact resource/card right now.
CREATE OR REPLACE FUNCTION public.living_resource_visible_title(
  _uid uuid, _family text, _resource_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _uid IS NULL OR _resource_id IS NULL THEN NULL
    ELSE CASE _family
      WHEN 'content_resource' THEN (
        SELECT r.title FROM public.content_resources r
         WHERE r.id = _resource_id
           AND r.status = 'published'
           AND (public.has_full_temple_access(_uid) OR public.has_role(_uid, 'admin')))
      WHEN 'healing_resource' THEN (
        SELECT r.title FROM public.healing_resources r
         WHERE r.id = _resource_id
           AND r.status = 'published'
           AND (public.has_full_temple_access(_uid) OR public.has_role(_uid, 'admin')))
      WHEN 'course' THEN (
        SELECT c.title FROM public.courses c
         WHERE c.id = _resource_id
           AND c.is_published
           AND (public.can_view_lesson_by_door(_uid, c.id) OR public.has_role(_uid, 'admin')))
      WHEN 'lesson' THEN (
        SELECT l.title FROM public.lessons l
          JOIN public.courses c ON c.id = l.course_id
         WHERE l.id = _resource_id
           AND c.is_published
           AND (public.can_view_lesson_by_door(_uid, l.course_id) OR public.has_role(_uid, 'admin')))
      WHEN 'card' THEN (
        SELECT coalesce(d.name || ': ', '') || cd.card_title
          FROM public.cards cd
          LEFT JOIN public.decks d ON d.id = cd.deck_id
         WHERE cd.id = _resource_id
           AND public.can_view_card(_uid, cd.deck_id))
      ELSE NULL
    END
  END;
$function$;

REVOKE ALL ON FUNCTION public.living_resource_visible_title(uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;

-- 3. Every authoritative tag path now uses the entitlement-aware resolver.
CREATE OR REPLACE FUNCTION public.living_resource_tag_add(
  _target_kind text, _target_id uuid, _resource_family text, _resource_id uuid,
  _noticed_after text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := public.living_caller(); v_title text; v_row public.living_resource_tags;
BEGIN
  IF _target_kind IS NULL OR _target_id IS NULL OR _resource_family IS NULL OR _resource_id IS NULL
     OR _target_kind NOT IN ('state','moment','pattern','pattern_evidence','experiment','field_note')
     OR _resource_family NOT IN ('content_resource','healing_resource','course','lesson','card') THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;
  IF NOT public.living_owns_record(v_uid, _target_kind, _target_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_title := public.living_resource_visible_title(v_uid, _resource_family, _resource_id);
  IF v_title IS NULL OR char_length(btrim(v_title)) = 0 THEN
    RAISE EXCEPTION 'living_resource_unavailable' USING ERRCODE = 'P0002';
  END IF;

  BEGIN
    INSERT INTO public.living_resource_tags
      (user_id, target_kind, target_id, resource_family, resource_id, title_snapshot, noticed_after)
    VALUES (v_uid, _target_kind, _target_id, _resource_family, _resource_id, left(btrim(v_title), 500), _noticed_after)
    RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'living_duplicate_tag' USING ERRCODE = '23505';
  END;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$function$;

-- Availability display also becomes entitlement-aware; the snapshot is never
-- substituted, only muted when the support is no longer available to her.
CREATE OR REPLACE FUNCTION public.living_resource_tags_list(_target_kind text, _target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := public.living_caller(); v_rows jsonb;
BEGIN
  IF NOT public.living_owns_record(v_uid, _target_kind, _target_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(jsonb_agg((to_jsonb(t) - 'user_id') || jsonb_build_object(
           'available',
           public.living_resource_visible_title(v_uid, t.resource_family, t.resource_id) IS NOT NULL)
         ORDER BY t.created_at ASC), '[]'::jsonb)
    INTO v_rows
  FROM public.living_resource_tags t
  WHERE t.user_id = v_uid AND t.target_kind = _target_kind AND t.target_id = _target_id;

  RETURN jsonb_build_object('records', v_rows);
END;
$function$;

-- 4. Resource/card-origin experiment: experiment + Try note + support tag,
--    atomically, with a server-derived entitled title snapshot.
CREATE OR REPLACE FUNCTION public.living_experiment_create_from_resource(
  _resource_family text,
  _resource_id uuid,
  _guide_key text DEFAULT NULL,
  _own_experiment text DEFAULT NULL,
  _try_body text DEFAULT NULL,
  _try_content jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := public.living_caller();
  v_title text;
  v_row public.living_experiments;
  v_tag public.living_resource_tags;
BEGIN
  IF _resource_family IS NULL OR _resource_id IS NULL
     OR _resource_family NOT IN ('content_resource','healing_resource','course','lesson','card')
     OR (_own_experiment IS NOT NULL AND char_length(_own_experiment) > 2000)
     OR (_try_body IS NOT NULL AND char_length(_try_body) > 10000)
     OR jsonb_typeof(coalesce(_try_content,'{}'::jsonb)) <> 'object'
     OR (_guide_key IS NOT NULL AND _guide_key NOT IN (
         'make_it_smaller','meet_one_basic_need','ask_for_space','gather_one_fact',
         'borrow_steadiness','smaller_boundary','hold_second_possibility','own')) THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  v_title := public.living_resource_visible_title(v_uid, _resource_family, _resource_id);
  IF v_title IS NULL OR char_length(btrim(v_title)) = 0 THEN
    RAISE EXCEPTION 'living_resource_unavailable' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.living_experiments (user_id, guide_key, own_experiment)
  VALUES (v_uid, _guide_key, nullif(btrim(coalesce(_own_experiment,'')), ''))
  RETURNING * INTO v_row;

  INSERT INTO public.living_field_notes (experiment_id, phase, body, content)
  VALUES (v_row.id, 'try', coalesce(_try_body,''), coalesce(_try_content,'{}'::jsonb));

  INSERT INTO public.living_resource_tags
    (user_id, target_kind, target_id, resource_family, resource_id, title_snapshot)
  VALUES (v_uid, 'experiment', v_row.id, _resource_family, _resource_id, left(btrim(v_title), 500))
  RETURNING * INTO v_tag;

  RETURN jsonb_build_object(
    'experiment', to_jsonb(v_row) - 'user_id',
    'support', to_jsonb(v_tag) - 'user_id');
END;
$function$;

-- 5. Owner-only list of her experiments that originated from this exact
--    resource/card. Non-enumerating: it only ever reads her own rows.
CREATE OR REPLACE FUNCTION public.living_experiments_from_resource(
  _resource_family text, _resource_id uuid, _limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := public.living_caller();
  v_n integer := least(greatest(coalesce(_limit,20),1),50);
  v_rows jsonb;
BEGIN
  IF _resource_family IS NULL OR _resource_id IS NULL
     OR _resource_family NOT IN ('content_resource','healing_resource','course','lesson','card') THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(x ORDER BY (x->>'created_at') DESC, (x->>'id') DESC), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT (to_jsonb(e) - 'user_id') || jsonb_build_object(
             'title_snapshot', t.title_snapshot,
             'notice_count', (SELECT count(*) FROM public.living_field_notes fn
                               WHERE fn.experiment_id = e.id AND fn.phase = 'notice'),
             'has_return', EXISTS (SELECT 1 FROM public.living_field_notes fr
                               WHERE fr.experiment_id = e.id AND fr.phase = 'return')) AS x
    FROM public.living_resource_tags t
    JOIN public.living_experiments e
      ON e.id = t.target_id AND e.user_id = v_uid
    WHERE t.user_id = v_uid
      AND t.target_kind = 'experiment'
      AND t.resource_family = _resource_family
      AND t.resource_id = _resource_id
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT v_n
  ) q;

  RETURN jsonb_build_object('records', v_rows);
END;
$function$;

-- 6. Experiment detail carries her explicitly recorded support, with the
--    snapshot preserved and availability computed for muted display.
CREATE OR REPLACE FUNCTION public.living_experiment_get(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_experiments; v_notes jsonb; v_support jsonb;
BEGIN
  SELECT * INTO v_row FROM public.living_experiments WHERE id = _id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(fn) ORDER BY fn.recorded_at ASC, fn.id ASC), '[]'::jsonb)
    INTO v_notes
  FROM public.living_field_notes fn
  WHERE fn.experiment_id = v_row.id;

  SELECT coalesce(jsonb_agg((to_jsonb(t) - 'user_id') || jsonb_build_object(
           'available',
           public.living_resource_visible_title(v_uid, t.resource_family, t.resource_id) IS NOT NULL)
         ORDER BY t.created_at ASC), '[]'::jsonb)
    INTO v_support
  FROM public.living_resource_tags t
  WHERE t.user_id = v_uid AND t.target_kind = 'experiment' AND t.target_id = v_row.id;

  RETURN jsonb_build_object('experiment', to_jsonb(v_row) - 'user_id',
                            'field_notes', v_notes,
                            'support', v_support);
END;
$function$;

-- 7. Execute privileges: authenticated members and service_role only.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('living_experiment_create_from_resource',
                         'living_experiments_from_resource',
                         'living_resource_tag_add',
                         'living_resource_tags_list',
                         'living_experiment_get')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END;
$$;
