-- =====================================================================
-- LP-B — Canonical private Living Pattern foundation
-- Private, owner-only. No UI, no Arrival coupling, no admin bypass.
-- =====================================================================

COMMENT ON TABLE public.temple_moments IS
  'Moments of Meaning: canonical parent record. Reused unchanged as the Living Pattern feature''s Moments of Meaning foundation (LP-B).';
COMMENT ON TABLE public.temple_moment_movements IS
  'Moments of Meaning: per-movement child content (Register / Recognise / Recalibrate). Reused unchanged by the Living Pattern feature (LP-B).';

-- ---------------------------------------------------------------------
-- 1. living_states
-- ---------------------------------------------------------------------
CREATE TABLE public.living_states (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  schema_version   integer NOT NULL DEFAULT 1,
  content_revision integer NOT NULL DEFAULT 0,
  feeling          jsonb NOT NULL DEFAULT '{}'::jsonb,
  body             jsonb NOT NULL DEFAULT '{}'::jsonb,
  capacity         jsonb NOT NULL DEFAULT '{}'::jsonb,
  desired_state    jsonb NOT NULL DEFAULT '{}'::jsonb,
  receive          jsonb NOT NULL DEFAULT '{}'::jsonb,
  reorient         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT living_states_schema_version_chk   CHECK (schema_version > 0),
  CONSTRAINT living_states_revision_chk         CHECK (content_revision >= 0),
  CONSTRAINT living_states_feeling_obj_chk      CHECK (jsonb_typeof(feeling) = 'object'),
  CONSTRAINT living_states_body_obj_chk         CHECK (jsonb_typeof(body) = 'object'),
  CONSTRAINT living_states_capacity_obj_chk     CHECK (jsonb_typeof(capacity) = 'object'),
  CONSTRAINT living_states_desired_obj_chk      CHECK (jsonb_typeof(desired_state) = 'object'),
  CONSTRAINT living_states_receive_obj_chk      CHECK (jsonb_typeof(receive) = 'object'),
  CONSTRAINT living_states_reorient_obj_chk     CHECK (jsonb_typeof(reorient) = 'object')
);
CREATE INDEX living_states_owner_time_idx ON public.living_states (user_id, occurred_at DESC, id DESC);

-- ---------------------------------------------------------------------
-- 2. living_patterns
-- ---------------------------------------------------------------------
CREATE TABLE public.living_patterns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label            text NOT NULL,
  commitment       text,
  schema_version   integer NOT NULL DEFAULT 1,
  content          jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_revision integer NOT NULL DEFAULT 0,
  chosen_at        timestamptz NOT NULL DEFAULT now(),
  rechosen_at      timestamptz,
  retired_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT living_patterns_label_len_chk      CHECK (char_length(label) BETWEEN 1 AND 120),
  CONSTRAINT living_patterns_commitment_len_chk CHECK (commitment IS NULL OR char_length(commitment) <= 2000),
  CONSTRAINT living_patterns_schema_version_chk CHECK (schema_version > 0),
  CONSTRAINT living_patterns_revision_chk       CHECK (content_revision >= 0),
  CONSTRAINT living_patterns_content_obj_chk    CHECK (jsonb_typeof(content) = 'object')
);
CREATE INDEX living_patterns_owner_time_idx ON public.living_patterns (user_id, chosen_at DESC, id DESC);

-- ---------------------------------------------------------------------
-- 3. living_pattern_evidence  (ownership derived through the Pattern)
-- ---------------------------------------------------------------------
CREATE TABLE public.living_pattern_evidence (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id       uuid NOT NULL REFERENCES public.living_patterns(id) ON DELETE CASCADE,
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  schema_version   integer NOT NULL DEFAULT 1,
  content          jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_revision integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT living_evidence_schema_version_chk CHECK (schema_version > 0),
  CONSTRAINT living_evidence_revision_chk       CHECK (content_revision >= 0),
  CONSTRAINT living_evidence_content_obj_chk    CHECK (jsonb_typeof(content) = 'object')
);
CREATE INDEX living_evidence_pattern_time_idx ON public.living_pattern_evidence (pattern_id, occurred_at DESC, id DESC);

-- ---------------------------------------------------------------------
-- 4. living_record_links
-- ---------------------------------------------------------------------
CREATE TABLE public.living_record_links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_kind  text NOT NULL,
  source_id    uuid NOT NULL,
  target_kind  text NOT NULL,
  target_id    uuid NOT NULL,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT living_links_source_kind_chk CHECK (source_kind IN ('state','moment','pattern')),
  CONSTRAINT living_links_target_kind_chk CHECK (target_kind IN ('state','moment','pattern')),
  CONSTRAINT living_links_note_len_chk    CHECK (note IS NULL OR char_length(note) <= 2000),
  CONSTRAINT living_links_no_self_chk     CHECK (NOT (source_kind = target_kind AND source_id = target_id))
);
-- Duplicate rejection is direction-insensitive: A->B and B->A are one link.
CREATE UNIQUE INDEX living_links_unique_pair_idx ON public.living_record_links (
  user_id,
  LEAST(source_kind || ':' || source_id::text, target_kind || ':' || target_id::text),
  GREATEST(source_kind || ':' || source_id::text, target_kind || ':' || target_id::text)
);
CREATE INDEX living_links_owner_idx  ON public.living_record_links (user_id, created_at DESC);
CREATE INDEX living_links_source_idx ON public.living_record_links (source_kind, source_id);
CREATE INDEX living_links_target_idx ON public.living_record_links (target_kind, target_id);

-- ---------------------------------------------------------------------
-- 5. living_resource_tags
--    Deliberately NO foreign key to any resource table: retired or
--    unavailable resources must remain historically legible.
-- ---------------------------------------------------------------------
CREATE TABLE public.living_resource_tags (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_kind      text NOT NULL,
  target_id        uuid NOT NULL,
  resource_family  text NOT NULL,
  resource_id      uuid NOT NULL,
  title_snapshot   text NOT NULL,
  noticed_after    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT living_tags_target_kind_chk CHECK (target_kind IN ('state','moment','pattern','pattern_evidence')),
  CONSTRAINT living_tags_family_chk      CHECK (resource_family IN ('content_resource','healing_resource','course','lesson')),
  CONSTRAINT living_tags_title_len_chk   CHECK (char_length(title_snapshot) BETWEEN 1 AND 500),
  CONSTRAINT living_tags_noticed_len_chk CHECK (noticed_after IS NULL OR char_length(noticed_after) <= 2000)
);
CREATE UNIQUE INDEX living_tags_unique_idx ON public.living_resource_tags
  (user_id, target_kind, target_id, resource_family, resource_id);
CREATE INDEX living_tags_target_idx ON public.living_resource_tags (target_kind, target_id);

COMMENT ON COLUMN public.living_resource_tags.resource_id IS
  'Canonical resource id. Intentionally unconstrained by FK so historical tags stay legible after a resource is retired; the UI renders unresolvable tags muted.';
COMMENT ON COLUMN public.living_resource_tags.title_snapshot IS
  'Server-derived at tag time. Never accepted from the client.';

-- ---------------------------------------------------------------------
-- Privilege posture: service_role only. No PUBLIC/anon/authenticated.
-- ---------------------------------------------------------------------
REVOKE ALL ON public.living_states           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.living_patterns         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.living_pattern_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.living_record_links     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.living_resource_tags    FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.living_states           TO service_role;
GRANT ALL ON public.living_patterns         TO service_role;
GRANT ALL ON public.living_pattern_evidence TO service_role;
GRANT ALL ON public.living_record_links     TO service_role;
GRANT ALL ON public.living_resource_tags    TO service_role;

ALTER TABLE public.living_states           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_states           FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.living_patterns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_patterns         FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.living_pattern_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_pattern_evidence FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.living_record_links     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_record_links     FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.living_resource_tags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_resource_tags    FORCE  ROW LEVEL SECURITY;

-- Defence-in-depth owner-only policies. No table grants exist, so these are
-- inert for direct client access; they exist so any future grant cannot leak.
CREATE POLICY living_states_owner_only ON public.living_states
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY living_patterns_owner_only ON public.living_patterns
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY living_evidence_owner_only ON public.living_pattern_evidence
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.living_patterns p
    WHERE p.id = living_pattern_evidence.pattern_id AND p.user_id = auth.uid()));
CREATE POLICY living_links_owner_only ON public.living_record_links
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY living_tags_owner_only ON public.living_resource_tags
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- =====================================================================
-- Internal helpers (SECURITY DEFINER, not client-callable)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.living_caller()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'living_unauthenticated' USING ERRCODE = '28000';
  END IF;
  IF NOT public.has_full_temple_access(v_uid) THEN
    RAISE EXCEPTION 'living_forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.living_owns_record(_uid uuid, _kind text, _id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE _kind
    WHEN 'state'   THEN EXISTS (SELECT 1 FROM public.living_states s   WHERE s.id = _id AND s.user_id = _uid)
    WHEN 'moment'  THEN EXISTS (SELECT 1 FROM public.temple_moments m  WHERE m.id = _id AND m.user_id = _uid)
    WHEN 'pattern' THEN EXISTS (SELECT 1 FROM public.living_patterns p WHERE p.id = _id AND p.user_id = _uid)
    WHEN 'pattern_evidence' THEN EXISTS (
      SELECT 1 FROM public.living_pattern_evidence e
      JOIN public.living_patterns p ON p.id = e.pattern_id
      WHERE e.id = _id AND p.user_id = _uid)
    ELSE false
  END;
$$;

-- Returns the member-readable title only when the resource exists AND is
-- currently published; NULL otherwise. Caller already passed the full
-- Temple access gate.
CREATE OR REPLACE FUNCTION public.living_resource_title(_family text, _resource_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE _family
    WHEN 'content_resource' THEN
      (SELECT r.title FROM public.content_resources r WHERE r.id = _resource_id AND r.status = 'published')
    WHEN 'healing_resource' THEN
      (SELECT r.title FROM public.healing_resources r WHERE r.id = _resource_id AND r.status = 'published')
    WHEN 'course' THEN
      (SELECT c.title FROM public.courses c WHERE c.id = _resource_id AND c.is_published)
    WHEN 'lesson' THEN
      (SELECT l.title FROM public.lessons l JOIN public.courses c ON c.id = l.course_id
        WHERE l.id = _resource_id AND c.is_published)
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.living_caller() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.living_owns_record(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.living_resource_title(text, uuid) FROM PUBLIC, anon, authenticated;

-- =====================================================================
-- Living States RPCs
-- =====================================================================
CREATE OR REPLACE FUNCTION public.living_state_create(
  _occurred_at timestamptz DEFAULT NULL,
  _feeling jsonb DEFAULT '{}'::jsonb,
  _body jsonb DEFAULT '{}'::jsonb,
  _capacity jsonb DEFAULT '{}'::jsonb,
  _desired_state jsonb DEFAULT '{}'::jsonb,
  _receive jsonb DEFAULT '{}'::jsonb,
  _reorient jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_states;
BEGIN
  IF jsonb_typeof(coalesce(_feeling,'{}'::jsonb)) <> 'object'
     OR jsonb_typeof(coalesce(_body,'{}'::jsonb)) <> 'object'
     OR jsonb_typeof(coalesce(_capacity,'{}'::jsonb)) <> 'object'
     OR jsonb_typeof(coalesce(_desired_state,'{}'::jsonb)) <> 'object'
     OR jsonb_typeof(coalesce(_receive,'{}'::jsonb)) <> 'object'
     OR jsonb_typeof(coalesce(_reorient,'{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.living_states (user_id, occurred_at, feeling, body, capacity, desired_state, receive, reorient)
  VALUES (v_uid, coalesce(_occurred_at, now()),
          coalesce(_feeling,'{}'::jsonb), coalesce(_body,'{}'::jsonb), coalesce(_capacity,'{}'::jsonb),
          coalesce(_desired_state,'{}'::jsonb), coalesce(_receive,'{}'::jsonb), coalesce(_reorient,'{}'::jsonb))
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_state_update(
  _id uuid,
  _expected_revision integer,
  _occurred_at timestamptz DEFAULT NULL,
  _feeling jsonb DEFAULT NULL,
  _body jsonb DEFAULT NULL,
  _capacity jsonb DEFAULT NULL,
  _desired_state jsonb DEFAULT NULL,
  _receive jsonb DEFAULT NULL,
  _reorient jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_states;
BEGIN
  IF _id IS NULL OR _expected_revision IS NULL THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.living_states
   WHERE id = _id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.content_revision <> _expected_revision THEN
    RAISE EXCEPTION 'living_revision_conflict' USING ERRCODE = '55000';
  END IF;

  UPDATE public.living_states SET
    occurred_at      = coalesce(_occurred_at, occurred_at),
    feeling          = coalesce(_feeling, feeling),
    body             = coalesce(_body, body),
    capacity         = coalesce(_capacity, capacity),
    desired_state    = coalesce(_desired_state, desired_state),
    receive          = coalesce(_receive, receive),
    reorient         = coalesce(_reorient, reorient),
    content_revision = content_revision + 1,
    updated_at       = now()
  WHERE id = _id AND user_id = v_uid
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_state_get(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_states;
BEGIN
  SELECT * INTO v_row FROM public.living_states WHERE id = _id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_states_list(
  _cursor_occurred_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL,
  _limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_n integer := least(greatest(coalesce(_limit,20),1),100); v_rows jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(x ORDER BY (x->>'occurred_at') DESC, (x->>'id') DESC), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT to_jsonb(s) - 'user_id' AS x
    FROM public.living_states s
    WHERE s.user_id = v_uid
      AND (_cursor_occurred_at IS NULL OR (s.occurred_at, s.id) < (_cursor_occurred_at, _cursor_id))
    ORDER BY s.occurred_at DESC, s.id DESC
    LIMIT v_n
  ) q;
  RETURN jsonb_build_object('records', v_rows);
END;
$$;

-- =====================================================================
-- Living Patterns RPCs
-- =====================================================================
CREATE OR REPLACE FUNCTION public.living_pattern_create(
  _label text, _commitment text DEFAULT NULL, _content jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_patterns;
BEGIN
  IF _label IS NULL OR char_length(btrim(_label)) = 0 OR char_length(_label) > 120
     OR jsonb_typeof(coalesce(_content,'{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.living_patterns (user_id, label, commitment, content)
  VALUES (v_uid, btrim(_label), _commitment, coalesce(_content,'{}'::jsonb))
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_pattern_update(
  _id uuid, _expected_revision integer,
  _label text DEFAULT NULL, _commitment text DEFAULT NULL, _content jsonb DEFAULT NULL,
  _rechoose boolean DEFAULT false, _retire boolean DEFAULT false, _unretire boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_patterns;
BEGIN
  IF _id IS NULL OR _expected_revision IS NULL
     OR (_label IS NOT NULL AND (char_length(btrim(_label)) = 0 OR char_length(_label) > 120))
     OR (_content IS NOT NULL AND jsonb_typeof(_content) <> 'object')
     OR (_retire AND _unretire) THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.living_patterns WHERE id = _id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.content_revision <> _expected_revision THEN
    RAISE EXCEPTION 'living_revision_conflict' USING ERRCODE = '55000';
  END IF;

  UPDATE public.living_patterns SET
    label            = coalesce(btrim(_label), label),
    commitment       = coalesce(_commitment, commitment),
    content          = coalesce(_content, content),
    rechosen_at      = CASE WHEN _rechoose THEN now() ELSE rechosen_at END,
    retired_at       = CASE WHEN _retire THEN now() WHEN _unretire THEN NULL ELSE retired_at END,
    content_revision = content_revision + 1,
    updated_at       = now()
  WHERE id = _id AND user_id = v_uid
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_pattern_get(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_patterns;
BEGIN
  SELECT * INTO v_row FROM public.living_patterns WHERE id = _id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_patterns_list(
  _include_retired boolean DEFAULT true,
  _cursor_chosen_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL,
  _limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_n integer := least(greatest(coalesce(_limit,20),1),100); v_rows jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(x ORDER BY (x->>'chosen_at') DESC, (x->>'id') DESC), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT to_jsonb(p) - 'user_id' AS x
    FROM public.living_patterns p
    WHERE p.user_id = v_uid
      AND (_include_retired OR p.retired_at IS NULL)
      AND (_cursor_chosen_at IS NULL OR (p.chosen_at, p.id) < (_cursor_chosen_at, _cursor_id))
    ORDER BY p.chosen_at DESC, p.id DESC
    LIMIT v_n
  ) q;
  RETURN jsonb_build_object('records', v_rows);
END;
$$;

-- =====================================================================
-- Pattern evidence RPCs (ownership derived through the Pattern)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.living_pattern_evidence_create(
  _pattern_id uuid, _occurred_at timestamptz DEFAULT NULL, _content jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_pattern_evidence;
BEGIN
  IF _pattern_id IS NULL OR jsonb_typeof(coalesce(_content,'{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;
  IF NOT public.living_owns_record(v_uid, 'pattern', _pattern_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.living_pattern_evidence (pattern_id, occurred_at, content)
  VALUES (_pattern_id, coalesce(_occurred_at, now()), coalesce(_content,'{}'::jsonb))
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_pattern_evidence_update(
  _id uuid, _expected_revision integer,
  _occurred_at timestamptz DEFAULT NULL, _content jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_pattern_evidence;
BEGIN
  IF _id IS NULL OR _expected_revision IS NULL
     OR (_content IS NOT NULL AND jsonb_typeof(_content) <> 'object') THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT e.* INTO v_row
  FROM public.living_pattern_evidence e
  JOIN public.living_patterns p ON p.id = e.pattern_id
  WHERE e.id = _id AND p.user_id = v_uid
  FOR UPDATE OF e;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.content_revision <> _expected_revision THEN
    RAISE EXCEPTION 'living_revision_conflict' USING ERRCODE = '55000';
  END IF;

  UPDATE public.living_pattern_evidence SET
    occurred_at      = coalesce(_occurred_at, occurred_at),
    content          = coalesce(_content, content),
    content_revision = content_revision + 1,
    updated_at       = now()
  WHERE id = _id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_pattern_evidence_list(
  _pattern_id uuid,
  _cursor_occurred_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL,
  _limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_n integer := least(greatest(coalesce(_limit,20),1),100); v_rows jsonb;
BEGIN
  IF NOT public.living_owns_record(v_uid, 'pattern', _pattern_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  SELECT coalesce(jsonb_agg(x ORDER BY (x->>'occurred_at') DESC, (x->>'id') DESC), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT to_jsonb(e) AS x
    FROM public.living_pattern_evidence e
    WHERE e.pattern_id = _pattern_id
      AND (_cursor_occurred_at IS NULL OR (e.occurred_at, e.id) < (_cursor_occurred_at, _cursor_id))
    ORDER BY e.occurred_at DESC, e.id DESC
    LIMIT v_n
  ) q;
  RETURN jsonb_build_object('records', v_rows);
END;
$$;

-- =====================================================================
-- Record links
-- =====================================================================
CREATE OR REPLACE FUNCTION public.living_link_create(
  _source_kind text, _source_id uuid, _target_kind text, _target_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_record_links;
BEGIN
  IF _source_kind IS NULL OR _target_kind IS NULL OR _source_id IS NULL OR _target_id IS NULL
     OR _source_kind NOT IN ('state','moment','pattern')
     OR _target_kind NOT IN ('state','moment','pattern') THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;
  IF _source_kind = _target_kind AND _source_id = _target_id THEN
    RAISE EXCEPTION 'living_self_link' USING ERRCODE = '22023';
  END IF;
  -- Both polymorphic endpoints must belong to the caller.
  IF NOT public.living_owns_record(v_uid, _source_kind, _source_id)
     OR NOT public.living_owns_record(v_uid, _target_kind, _target_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  BEGIN
    INSERT INTO public.living_record_links (user_id, source_kind, source_id, target_kind, target_id, note)
    VALUES (v_uid, _source_kind, _source_id, _target_kind, _target_id, _note)
    RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'living_duplicate_link' USING ERRCODE = '23505';
  END;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_link_delete(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_n integer;
BEGIN
  DELETE FROM public.living_record_links WHERE id = _id AND user_id = v_uid;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object('deleted', true, 'id', _id);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_links_list(_kind text, _id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_rows jsonb;
BEGIN
  IF NOT public.living_owns_record(v_uid, _kind, _id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(l) - 'user_id' ORDER BY l.created_at DESC), '[]'::jsonb)
    INTO v_rows
  FROM public.living_record_links l
  WHERE l.user_id = v_uid
    AND ((l.source_kind = _kind AND l.source_id = _id)
      OR (l.target_kind = _kind AND l.target_id = _id));
  RETURN jsonb_build_object('records', v_rows);
END;
$$;

-- =====================================================================
-- Resource tags
-- =====================================================================
CREATE OR REPLACE FUNCTION public.living_resource_tag_add(
  _target_kind text, _target_id uuid, _resource_family text, _resource_id uuid,
  _noticed_after text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_title text; v_row public.living_resource_tags;
BEGIN
  IF _target_kind IS NULL OR _target_id IS NULL OR _resource_family IS NULL OR _resource_id IS NULL
     OR _target_kind NOT IN ('state','moment','pattern','pattern_evidence')
     OR _resource_family NOT IN ('content_resource','healing_resource','course','lesson') THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;
  IF NOT public.living_owns_record(v_uid, _target_kind, _target_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Server-derived title snapshot; unpublished/unknown resources cannot be tagged.
  v_title := public.living_resource_title(_resource_family, _resource_id);
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
$$;

CREATE OR REPLACE FUNCTION public.living_resource_tag_remove(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_n integer;
BEGIN
  DELETE FROM public.living_resource_tags WHERE id = _id AND user_id = v_uid;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object('deleted', true, 'id', _id);
END;
$$;

-- Historical tags stay legible: still_available = false renders muted; the
-- stored title_snapshot is never substituted.
CREATE OR REPLACE FUNCTION public.living_resource_tags_list(_target_kind text, _target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_rows jsonb;
BEGIN
  IF NOT public.living_owns_record(v_uid, _target_kind, _target_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  SELECT coalesce(jsonb_agg(
           (to_jsonb(t) - 'user_id')
           || jsonb_build_object('still_available',
                public.living_resource_title(t.resource_family, t.resource_id) IS NOT NULL)
           ORDER BY t.created_at DESC), '[]'::jsonb)
    INTO v_rows
  FROM public.living_resource_tags t
  WHERE t.user_id = v_uid AND t.target_kind = _target_kind AND t.target_id = _target_id;
  RETURN jsonb_build_object('records', v_rows);
END;
$$;

-- =====================================================================
-- 6. living_thread_page — owner-only keyset union reader
-- =====================================================================
CREATE OR REPLACE FUNCTION public.living_thread_page(
  _cursor_occurred_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid  uuid := public.living_caller();
  v_rows jsonb;
  v_last_at timestamptz;
  v_last_id uuid;
  v_count integer;
BEGIN
  IF (_cursor_occurred_at IS NULL) <> (_cursor_id IS NULL) THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _living_thread_noop () ON COMMIT DROP;

  WITH u AS (
    SELECT 'state'::text AS kind, s.id, s.occurred_at, NULL::uuid AS parent_id,
           NULL::text AS label, s.content_revision, s.created_at, s.updated_at
      FROM public.living_states s WHERE s.user_id = v_uid
    UNION ALL
    SELECT 'moment', m.id, m.occurred_at, NULL::uuid,
           m.label, 0, m.created_at, m.updated_at
      FROM public.temple_moments m WHERE m.user_id = v_uid AND m.archived_at IS NULL
    UNION ALL
    SELECT 'pattern', p.id, p.chosen_at, NULL::uuid,
           p.label, p.content_revision, p.created_at, p.updated_at
      FROM public.living_patterns p WHERE p.user_id = v_uid
    UNION ALL
    SELECT 'pattern_evidence', e.id, e.occurred_at, e.pattern_id,
           NULL::text, e.content_revision, e.created_at, e.updated_at
      FROM public.living_pattern_evidence e
      JOIN public.living_patterns p2 ON p2.id = e.pattern_id
     WHERE p2.user_id = v_uid
  ), page AS (
    SELECT * FROM u
     WHERE (_cursor_occurred_at IS NULL OR (u.occurred_at, u.id) < (_cursor_occurred_at, _cursor_id))
     ORDER BY u.occurred_at DESC, u.id DESC
     LIMIT 20
  )
  SELECT coalesce(jsonb_agg(to_jsonb(page) ORDER BY page.occurred_at DESC, page.id DESC), '[]'::jsonb),
         count(*)::integer,
         min(page.occurred_at),
         (SELECT p3.id FROM page p3 ORDER BY p3.occurred_at ASC, p3.id ASC LIMIT 1)
    INTO v_rows, v_count, v_last_at, v_last_id
  FROM page;

  RETURN jsonb_build_object(
    'records', v_rows,
    'next_cursor', CASE WHEN v_count = 20
      THEN jsonb_build_object('occurred_at', v_last_at, 'id', v_last_id)
      ELSE NULL END
  );
END;
$$;

DROP FUNCTION IF EXISTS public.living_thread_page(timestamptz, uuid);

CREATE OR REPLACE FUNCTION public.living_thread_page(
  _cursor_occurred_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid  uuid := public.living_caller();
  v_rows jsonb;
  v_last_at timestamptz;
  v_last_id uuid;
  v_count integer;
BEGIN
  IF (_cursor_occurred_at IS NULL) <> (_cursor_id IS NULL) THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  WITH u AS (
    SELECT 'state'::text AS kind, s.id AS rid, s.occurred_at AS oat, NULL::uuid AS parent_id,
           NULL::text AS label, s.content_revision AS rev, s.created_at AS cat, s.updated_at AS uat
      FROM public.living_states s WHERE s.user_id = v_uid
    UNION ALL
    SELECT 'moment', m.id, m.occurred_at, NULL::uuid,
           m.label, 0, m.created_at, m.updated_at
      FROM public.temple_moments m WHERE m.user_id = v_uid AND m.archived_at IS NULL
    UNION ALL
    SELECT 'pattern', p.id, p.chosen_at, NULL::uuid,
           p.label, p.content_revision, p.created_at, p.updated_at
      FROM public.living_patterns p WHERE p.user_id = v_uid
    UNION ALL
    SELECT 'pattern_evidence', e.id, e.occurred_at, e.pattern_id,
           NULL::text, e.content_revision, e.created_at, e.updated_at
      FROM public.living_pattern_evidence e
      JOIN public.living_patterns p2 ON p2.id = e.pattern_id
     WHERE p2.user_id = v_uid
  ), page AS (
    SELECT * FROM u
     WHERE (_cursor_occurred_at IS NULL OR (u.oat, u.rid) < (_cursor_occurred_at, _cursor_id))
     ORDER BY u.oat DESC, u.rid DESC
     LIMIT 20
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
      'kind', page.kind, 'id', page.rid, 'occurred_at', page.oat,
      'parent_id', page.parent_id, 'label', page.label,
      'content_revision', page.rev, 'created_at', page.cat, 'updated_at', page.uat
    ) ORDER BY page.oat DESC, page.rid DESC), '[]'::jsonb),
    count(*)::integer
  INTO v_rows, v_count
  FROM page;

  IF v_count = 20 THEN
    v_last_at := (v_rows -> 19 ->> 'occurred_at')::timestamptz;
    v_last_id := (v_rows -> 19 ->> 'id')::uuid;
  END IF;

  RETURN jsonb_build_object(
    'records', v_rows,
    'next_cursor', CASE WHEN v_count = 20
      THEN jsonb_build_object('occurred_at', v_last_at, 'id', v_last_id)
      ELSE NULL END
  );
END;
$$;

-- =====================================================================
-- Function ACLs: PUBLIC revoked, authenticated only.
-- =====================================================================
DO $acl$
DECLARE f text;
BEGIN
  FOR f IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN (
         'living_state_create','living_state_update','living_state_get','living_states_list',
         'living_pattern_create','living_pattern_update','living_pattern_get','living_patterns_list',
         'living_pattern_evidence_create','living_pattern_evidence_update','living_pattern_evidence_list',
         'living_link_create','living_link_delete','living_links_list',
         'living_resource_tag_add','living_resource_tag_remove','living_resource_tags_list',
         'living_thread_page')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END
$acl$;
