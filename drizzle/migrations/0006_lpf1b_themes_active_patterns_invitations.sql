-- LP-F.1B — Active Patterns, member-named themes, transparent invitations.
-- Owner-only. No administrator policy, no anon/authenticated table grants,
-- no inference, no ranking, no Arrival path.

CREATE TABLE public.living_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 80),
  note text,
  content_revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX living_themes_owner_label_uniq
  ON public.living_themes (user_id, lower(btrim(label)));
CREATE INDEX living_themes_owner_idx ON public.living_themes (user_id, created_at DESC, id DESC);

CREATE TABLE public.living_theme_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES public.living_themes(id) ON DELETE CASCADE,
  target_kind text NOT NULL CHECK (target_kind IN ('state','moment','pattern','pattern_evidence','experiment','field_note')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX living_theme_attachments_uniq
  ON public.living_theme_attachments (user_id, theme_id, target_kind, target_id);
CREATE INDEX living_theme_attachments_target_idx
  ON public.living_theme_attachments (user_id, target_kind, target_id);
CREATE INDEX living_theme_attachments_theme_idx
  ON public.living_theme_attachments (theme_id, created_at DESC, id DESC);

CREATE TABLE public.living_invitation_hides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_key text NOT NULL CHECK (char_length(invitation_key) BETWEEN 1 AND 64),
  subject_key text NOT NULL CHECK (char_length(subject_key) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX living_invitation_hides_uniq
  ON public.living_invitation_hides (user_id, invitation_key, subject_key);

ALTER TABLE public.living_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_themes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.living_theme_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_theme_attachments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.living_invitation_hides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_invitation_hides FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.living_themes FROM anon, authenticated;
REVOKE ALL ON public.living_theme_attachments FROM anon, authenticated;
REVOKE ALL ON public.living_invitation_hides FROM anon, authenticated;
GRANT ALL ON public.living_themes TO service_role;
GRANT ALL ON public.living_theme_attachments TO service_role;
GRANT ALL ON public.living_invitation_hides TO service_role;

CREATE OR REPLACE FUNCTION public.living_record_row(_uid uuid, _kind text, _id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE _kind
    WHEN 'state' THEN (
      SELECT jsonb_build_object('kind','state','id',s.id,'occurred_at',s.occurred_at,'label',NULL,'parent_id',NULL)
      FROM public.living_states s WHERE s.id=_id AND s.user_id=_uid)
    WHEN 'moment' THEN (
      SELECT jsonb_build_object('kind','moment','id',m.id,'occurred_at',m.occurred_at,'label',m.label,'parent_id',NULL)
      FROM public.temple_moments m WHERE m.id=_id AND m.user_id=_uid)
    WHEN 'pattern' THEN (
      SELECT jsonb_build_object('kind','pattern','id',p.id,'occurred_at',p.chosen_at,'label',p.label,'parent_id',NULL)
      FROM public.living_patterns p WHERE p.id=_id AND p.user_id=_uid)
    WHEN 'pattern_evidence' THEN (
      SELECT jsonb_build_object('kind','pattern_evidence','id',e.id,'occurred_at',e.occurred_at,'label',NULL,'parent_id',e.pattern_id)
      FROM public.living_pattern_evidence e JOIN public.living_patterns p ON p.id=e.pattern_id
      WHERE e.id=_id AND p.user_id=_uid)
    WHEN 'experiment' THEN (
      SELECT jsonb_build_object('kind','experiment','id',x.id,'occurred_at',x.created_at,
        'label',coalesce(nullif(btrim(coalesce(x.own_experiment,'')),''), x.guide_key),'parent_id',NULL)
      FROM public.living_experiments x WHERE x.id=_id AND x.user_id=_uid)
    WHEN 'field_note' THEN (
      SELECT jsonb_build_object('kind','field_note','id',fn.id,'occurred_at',fn.recorded_at,'label',fn.phase,'parent_id',fn.experiment_id)
      FROM public.living_field_notes fn JOIN public.living_experiments x ON x.id=fn.experiment_id
      WHERE fn.id=_id AND x.user_id=_uid)
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.living_active_patterns(_include_retired boolean DEFAULT false, _limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller();
        v_n integer := least(greatest(coalesce(_limit,50),1),100);
        v_rows jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(r ORDER BY (r->>'chosen_at') DESC, (r->>'id') DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'label', p.label,
      'commitment', p.commitment,
      'content_revision', p.content_revision,
      'chosen_at', p.chosen_at,
      'rechosen_at', p.rechosen_at,
      'retired_at', p.retired_at,
      'evidence_count', (SELECT count(*) FROM public.living_pattern_evidence e WHERE e.pattern_id=p.id),
      'linked_count', (SELECT count(*) FROM public.living_record_links l WHERE l.user_id=v_uid
                        AND ((l.source_kind='pattern' AND l.source_id=p.id) OR (l.target_kind='pattern' AND l.target_id=p.id))),
      'experiment_count', (SELECT count(*) FROM public.living_experiments x WHERE x.user_id=v_uid AND x.pattern_id=p.id),
      'support_count', (SELECT count(*) FROM public.living_resource_tags t WHERE t.user_id=v_uid AND t.target_kind='pattern' AND t.target_id=p.id),
      'evidence', (SELECT coalesce(jsonb_agg(jsonb_build_object('kind','pattern_evidence','id',e.id,'occurred_at',e.occurred_at,'parent_id',p.id) ORDER BY e.occurred_at DESC), '[]'::jsonb)
                    FROM (SELECT * FROM public.living_pattern_evidence e2 WHERE e2.pattern_id=p.id ORDER BY e2.occurred_at DESC LIMIT 20) e),
      'links', (SELECT coalesce(jsonb_agg(jsonb_build_object('kind', CASE WHEN l.source_kind='pattern' AND l.source_id=p.id THEN l.target_kind ELSE l.source_kind END,
                                                             'id',   CASE WHEN l.source_kind='pattern' AND l.source_id=p.id THEN l.target_id ELSE l.source_id END,
                                                             'created_at', l.created_at) ORDER BY l.created_at DESC), '[]'::jsonb)
                 FROM (SELECT * FROM public.living_record_links l2 WHERE l2.user_id=v_uid
                        AND ((l2.source_kind='pattern' AND l2.source_id=p.id) OR (l2.target_kind='pattern' AND l2.target_id=p.id))
                        ORDER BY l2.created_at DESC LIMIT 20) l),
      'experiments', (SELECT coalesce(jsonb_agg(jsonb_build_object('kind','experiment','id',x.id,'label',coalesce(nullif(btrim(coalesce(x.own_experiment,'')),''),x.guide_key),'created_at',x.created_at) ORDER BY x.created_at DESC), '[]'::jsonb)
                       FROM (SELECT * FROM public.living_experiments x2 WHERE x2.user_id=v_uid AND x2.pattern_id=p.id ORDER BY x2.created_at DESC LIMIT 20) x),
      'supports', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title_snapshot,'resource_family',t.resource_family,'resource_id',t.resource_id) ORDER BY t.created_at DESC), '[]'::jsonb)
                    FROM (SELECT * FROM public.living_resource_tags t2 WHERE t2.user_id=v_uid AND t2.target_kind='pattern' AND t2.target_id=p.id ORDER BY t2.created_at DESC LIMIT 20) t)
    ) AS r
    FROM public.living_patterns p
    WHERE p.user_id=v_uid AND (_include_retired OR p.retired_at IS NULL)
    ORDER BY p.chosen_at DESC, p.id DESC
    LIMIT v_n
  ) q;
  RETURN jsonb_build_object('records', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_theme_create(_label text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_themes;
BEGIN
  IF _label IS NULL OR char_length(btrim(_label)) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE='22023';
  END IF;
  BEGIN
    INSERT INTO public.living_themes (user_id, label, note)
    VALUES (v_uid, btrim(_label), nullif(btrim(coalesce(_note,'')),''))
    RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'living_duplicate_theme' USING ERRCODE='23505';
  END;
  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_theme_update(_id uuid, _expected_revision integer, _label text DEFAULT NULL, _note text DEFAULT NULL, _clear_note boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_themes;
BEGIN
  SELECT * INTO v_row FROM public.living_themes WHERE id=_id AND user_id=v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'living_not_found' USING ERRCODE='P0002'; END IF;
  IF v_row.content_revision <> _expected_revision THEN
    RAISE EXCEPTION 'living_revision_conflict' USING ERRCODE='40001';
  END IF;
  IF _label IS NOT NULL AND char_length(btrim(_label)) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE='22023';
  END IF;
  BEGIN
    UPDATE public.living_themes SET
      label = coalesce(btrim(_label), label),
      note = CASE WHEN _clear_note THEN NULL WHEN _note IS NOT NULL THEN nullif(btrim(_note),'') ELSE note END,
      content_revision = content_revision + 1,
      updated_at = now()
    WHERE id=_id AND user_id=v_uid RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'living_duplicate_theme' USING ERRCODE='23505';
  END;
  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_theme_delete(_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM public.living_theme_attachments WHERE theme_id=_id AND user_id=v_uid;
  DELETE FROM public.living_themes WHERE id=_id AND user_id=v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'living_not_found' USING ERRCODE='P0002'; END IF;
  RETURN jsonb_build_object('deleted', true, 'detached', v_n);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_themes_list(_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_n integer := least(greatest(coalesce(_limit,50),1),200); v_rows jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(r ORDER BY lower(r->>'label')), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT (to_jsonb(t) - 'user_id') || jsonb_build_object(
      'attachment_count', (SELECT count(*) FROM public.living_theme_attachments a WHERE a.theme_id=t.id)) AS r
    FROM public.living_themes t WHERE t.user_id=v_uid
    ORDER BY lower(t.label) LIMIT v_n
  ) q;
  RETURN jsonb_build_object('records', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_theme_attach(_theme_id uuid, _target_kind text, _target_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_theme_attachments;
BEGIN
  IF _target_kind IS NULL OR _target_id IS NULL
     OR _target_kind NOT IN ('state','moment','pattern','pattern_evidence','experiment','field_note') THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.living_themes WHERE id=_theme_id AND user_id=v_uid) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE='P0002';
  END IF;
  IF NOT public.living_owns_record(v_uid, _target_kind, _target_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE='P0002';
  END IF;
  BEGIN
    INSERT INTO public.living_theme_attachments (user_id, theme_id, target_kind, target_id)
    VALUES (v_uid, _theme_id, _target_kind, _target_id) RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'living_duplicate_attachment' USING ERRCODE='23505';
  END;
  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_theme_detach(_theme_id uuid, _target_kind text, _target_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller();
BEGIN
  DELETE FROM public.living_theme_attachments
  WHERE user_id=v_uid AND theme_id=_theme_id AND target_kind=_target_kind AND target_id=_target_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'living_not_found' USING ERRCODE='P0002'; END IF;
  RETURN jsonb_build_object('detached', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_theme_records(_theme_id uuid, _cursor_created_at timestamptz DEFAULT NULL, _cursor_id uuid DEFAULT NULL, _limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_n integer := least(greatest(coalesce(_limit,20),1),100);
        v_rows jsonb; v_cnt integer; v_last_at timestamptz; v_last_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.living_themes WHERE id=_theme_id AND user_id=v_uid) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE='P0002';
  END IF;
  WITH page AS (
    SELECT a.created_at, a.id, a.target_kind, a.target_id
    FROM public.living_theme_attachments a
    WHERE a.user_id=v_uid AND a.theme_id=_theme_id
      AND (_cursor_created_at IS NULL OR (a.created_at, a.id) < (_cursor_created_at, _cursor_id))
    ORDER BY a.created_at DESC, a.id DESC LIMIT v_n
  ), shaped AS (
    SELECT p.created_at, p.id,
      jsonb_build_object('attachment_id', p.id, 'attached_at', p.created_at)
        || coalesce(public.living_record_row(v_uid, p.target_kind, p.target_id),
                    jsonb_build_object('kind', p.target_kind, 'id', p.target_id, 'occurred_at', p.created_at, 'label', NULL, 'parent_id', NULL)) AS row
    FROM page p
  )
  SELECT coalesce(jsonb_agg(row ORDER BY created_at DESC, id DESC), '[]'::jsonb), count(*),
         (array_agg(created_at ORDER BY created_at ASC, id ASC))[1],
         (array_agg(id ORDER BY created_at ASC, id ASC))[1]
    INTO v_rows, v_cnt, v_last_at, v_last_id
  FROM shaped;

  RETURN jsonb_build_object(
    'records', v_rows,
    'next_cursor', CASE WHEN v_cnt = v_n AND v_last_at IS NOT NULL
      THEN jsonb_build_object('created_at', v_last_at, 'id', v_last_id) ELSE NULL END);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_record_themes(_target_kind text, _target_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_rows jsonb;
BEGIN
  IF _target_kind NOT IN ('state','moment','pattern','pattern_evidence','experiment','field_note') THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE='22023';
  END IF;
  IF NOT public.living_owns_record(v_uid, _target_kind, _target_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE='P0002';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('theme_id', t.id, 'label', t.label, 'attached_at', a.created_at) ORDER BY lower(t.label)), '[]'::jsonb)
    INTO v_rows
  FROM public.living_theme_attachments a JOIN public.living_themes t ON t.id=a.theme_id
  WHERE a.user_id=v_uid AND a.target_kind=_target_kind AND a.target_id=_target_id;
  RETURN jsonb_build_object('records', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_invitation_hide(_invitation_key text, _subject_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller();
BEGIN
  IF _invitation_key IS NULL OR _subject_key IS NULL
     OR _invitation_key NOT IN ('support_repeated','pattern_rechosen','experiment_open','pattern_links','theme_named') THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.living_invitation_hides (user_id, invitation_key, subject_key)
  VALUES (v_uid, _invitation_key, _subject_key)
  ON CONFLICT (user_id, invitation_key, subject_key) DO NOTHING;
  RETURN jsonb_build_object('hidden', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_invitation_unhide(_invitation_key text, _subject_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller();
BEGIN
  DELETE FROM public.living_invitation_hides
  WHERE user_id=v_uid AND invitation_key=_invitation_key AND subject_key=_subject_key;
  RETURN jsonb_build_object('hidden', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_invitation_hides_list()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_rows jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object('invitation_key', h.invitation_key, 'subject_key', h.subject_key, 'created_at', h.created_at) ORDER BY h.created_at DESC), '[]'::jsonb)
    INTO v_rows FROM public.living_invitation_hides h WHERE h.user_id=v_uid;
  RETURN jsonb_build_object('records', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_invitations(_include_hidden boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_out jsonb := '[]'::jsonb; v_r record;
BEGIN
  FOR v_r IN
    SELECT t.resource_family, t.resource_id, count(*) AS n,
           max(t.title_snapshot) AS title,
           coalesce(jsonb_agg(jsonb_build_object('tag_id', t.id, 'kind', t.target_kind, 'id', t.target_id,
                     'noticed_after', t.noticed_after, 'created_at', t.created_at) ORDER BY t.created_at DESC), '[]'::jsonb) AS records
    FROM public.living_resource_tags t WHERE t.user_id=v_uid
    GROUP BY t.resource_family, t.resource_id HAVING count(*) >= 3
  LOOP
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'invitation_key','support_repeated',
      'subject_key', v_r.resource_family || ':' || v_r.resource_id,
      'n', v_r.n, 'title', v_r.title, 'records', v_r.records));
  END LOOP;

  FOR v_r IN
    SELECT p.id, p.label, p.rechosen_at,
      (SELECT coalesce(jsonb_agg(jsonb_build_object('kind','pattern_evidence','id',e.id,'occurred_at',e.occurred_at,'parent_id',p.id) ORDER BY e.occurred_at DESC), '[]'::jsonb)
         FROM public.living_pattern_evidence e WHERE e.pattern_id=p.id AND e.occurred_at >= p.rechosen_at) AS evidence,
      (SELECT coalesce(jsonb_agg(jsonb_build_object(
                'kind', CASE WHEN l.source_kind='pattern' AND l.source_id=p.id THEN l.target_kind ELSE l.source_kind END,
                'id',   CASE WHEN l.source_kind='pattern' AND l.source_id=p.id THEN l.target_id ELSE l.source_id END,
                'created_at', l.created_at) ORDER BY l.created_at DESC), '[]'::jsonb)
         FROM public.living_record_links l WHERE l.user_id=v_uid AND l.created_at >= p.rechosen_at
           AND ((l.source_kind='pattern' AND l.source_id=p.id) OR (l.target_kind='pattern' AND l.target_id=p.id))) AS links
    FROM public.living_patterns p
    WHERE p.user_id=v_uid AND p.retired_at IS NULL AND p.rechosen_at IS NOT NULL
  LOOP
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'invitation_key','pattern_rechosen', 'subject_key', v_r.id::text,
      'label', v_r.label, 'rechosen_at', v_r.rechosen_at,
      'records', v_r.evidence || v_r.links));
  END LOOP;

  FOR v_r IN
    SELECT x.id, coalesce(nullif(btrim(coalesce(x.own_experiment,'')),''), x.guide_key) AS label,
      (SELECT coalesce(jsonb_agg(jsonb_build_object('kind','field_note','id',fn.id,'label',fn.phase,'occurred_at',fn.recorded_at,'parent_id',x.id) ORDER BY fn.recorded_at DESC), '[]'::jsonb)
         FROM public.living_field_notes fn WHERE fn.experiment_id=x.id) AS notes
    FROM public.living_experiments x
    WHERE x.user_id=v_uid
      AND EXISTS (SELECT 1 FROM public.living_field_notes f WHERE f.experiment_id=x.id AND f.phase='try')
      AND NOT EXISTS (SELECT 1 FROM public.living_field_notes f WHERE f.experiment_id=x.id AND f.phase='return')
  LOOP
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'invitation_key','experiment_open', 'subject_key', v_r.id::text,
      'label', v_r.label,
      'records', jsonb_build_array(jsonb_build_object('kind','experiment','id',v_r.id,'label',v_r.label)) || v_r.notes));
  END LOOP;

  FOR v_r IN
    SELECT p.id, p.label, count(*) AS n,
      coalesce(jsonb_agg(jsonb_build_object(
        'kind', CASE WHEN l.source_kind='pattern' AND l.source_id=p.id THEN l.target_kind ELSE l.source_kind END,
        'id',   CASE WHEN l.source_kind='pattern' AND l.source_id=p.id THEN l.target_id ELSE l.source_id END,
        'created_at', l.created_at) ORDER BY l.created_at DESC), '[]'::jsonb) AS records
    FROM public.living_patterns p
    JOIN public.living_record_links l ON l.user_id=v_uid
      AND ((l.source_kind='pattern' AND l.source_id=p.id) OR (l.target_kind='pattern' AND l.target_id=p.id))
    WHERE p.user_id=v_uid
    GROUP BY p.id, p.label HAVING count(*) >= 3
  LOOP
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'invitation_key','pattern_links', 'subject_key', 'links:' || v_r.id::text,
      'label', v_r.label, 'n', v_r.n, 'records', v_r.records));
  END LOOP;

  FOR v_r IN
    SELECT t.id, t.label, count(a.id) AS n,
      coalesce(jsonb_agg(coalesce(public.living_record_row(v_uid, a.target_kind, a.target_id),
                jsonb_build_object('kind',a.target_kind,'id',a.target_id)) ORDER BY a.created_at DESC), '[]'::jsonb) AS records
    FROM public.living_themes t JOIN public.living_theme_attachments a ON a.theme_id=t.id AND a.user_id=v_uid
    WHERE t.user_id=v_uid GROUP BY t.id, t.label HAVING count(a.id) >= 3
  LOOP
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'invitation_key','theme_named', 'subject_key', v_r.id::text,
      'theme', v_r.label, 'n', v_r.n, 'records', v_r.records));
  END LOOP;

  IF NOT _include_hidden THEN
    SELECT coalesce(jsonb_agg(i), '[]'::jsonb) INTO v_out
    FROM jsonb_array_elements(v_out) i
    WHERE NOT EXISTS (SELECT 1 FROM public.living_invitation_hides h
      WHERE h.user_id=v_uid AND h.invitation_key = i->>'invitation_key' AND h.subject_key = i->>'subject_key');
  ELSE
    SELECT coalesce(jsonb_agg(i || jsonb_build_object('hidden', EXISTS (
      SELECT 1 FROM public.living_invitation_hides h
      WHERE h.user_id=v_uid AND h.invitation_key = i->>'invitation_key' AND h.subject_key = i->>'subject_key'))), '[]'::jsonb)
      INTO v_out FROM jsonb_array_elements(v_out) i;
  END IF;

  RETURN jsonb_build_object('records', coalesce(v_out,'[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.living_record_row(uuid,text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_active_patterns(boolean,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_theme_create(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_theme_update(uuid,integer,text,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_theme_delete(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_themes_list(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_theme_attach(uuid,text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_theme_detach(uuid,text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_theme_records(uuid,timestamptz,uuid,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_record_themes(text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_invitation_hide(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_invitation_unhide(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_invitation_hides_list() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_invitations(boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.living_active_patterns(boolean,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_theme_create(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_theme_update(uuid,integer,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_theme_delete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_themes_list(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_theme_attach(uuid,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_theme_detach(uuid,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_theme_records(uuid,timestamptz,uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_record_themes(text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_invitation_hide(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_invitation_unhide(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_invitation_hides_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_invitations(boolean) TO authenticated;