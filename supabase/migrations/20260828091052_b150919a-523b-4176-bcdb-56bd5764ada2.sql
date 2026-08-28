-- LP-C.2 — private, owner-only Field Notes media foundation.

CREATE TABLE public.living_media_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_note_id uuid NOT NULL REFERENCES public.living_field_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_kind text NOT NULL,
  object_path text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  declared_byte_size bigint NOT NULL,
  byte_size bigint,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'pending',
  schema_version integer NOT NULL DEFAULT 1,
  content_revision integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  CONSTRAINT living_media_kind_chk CHECK (media_kind IN ('image','audio','video')),
  CONSTRAINT living_media_status_chk CHECK (status IN ('pending','ready')),
  CONSTRAINT living_media_schema_version_chk CHECK (schema_version > 0),
  CONSTRAINT living_media_revision_chk CHECK (content_revision >= 0),
  CONSTRAINT living_media_filename_chk CHECK (char_length(original_filename) BETWEEN 1 AND 300),
  CONSTRAINT living_media_mime_chk CHECK (
    (media_kind = 'image' AND mime_type IN ('image/jpeg','image/png','image/webp'))
    OR (media_kind = 'audio' AND mime_type IN ('audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav'))
    OR (media_kind = 'video' AND mime_type IN ('video/mp4','video/webm','video/quicktime'))
  ),
  CONSTRAINT living_media_declared_size_chk CHECK (
    declared_byte_size > 0 AND declared_byte_size <= CASE media_kind
      WHEN 'image' THEN 15728640 WHEN 'audio' THEN 52428800 ELSE 157286400 END
  ),
  CONSTRAINT living_media_size_chk CHECK (
    byte_size IS NULL OR (byte_size > 0 AND byte_size <= CASE media_kind
      WHEN 'image' THEN 15728640 WHEN 'audio' THEN 52428800 ELSE 157286400 END)
  ),
  CONSTRAINT living_media_duration_chk CHECK (
    duration_seconds IS NULL OR (
      duration_seconds > 0 AND duration_seconds <= CASE media_kind
        WHEN 'image' THEN 0 WHEN 'audio' THEN 600 ELSE 120 END
    )
  ),
  CONSTRAINT living_media_path_chk CHECK (
    object_path = user_id::text || '/' || field_note_id::text || '/' || id::text
      || substring(object_path from '\.[A-Za-z0-9]{1,8}$')
    AND object_path ~ '\.[A-Za-z0-9]{1,8}$'
  )
);

CREATE INDEX living_media_attachments_note_idx
  ON public.living_media_attachments (field_note_id, created_at, id);
CREATE INDEX living_media_attachments_user_idx
  ON public.living_media_attachments (user_id);

-- No grants to anon or authenticated: the RPCs below are the only door.
GRANT ALL ON public.living_media_attachments TO service_role;
ALTER TABLE public.living_media_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_media_attachments FORCE ROW LEVEL SECURITY;

-- Internal cleanup queue for physical objects (cascade + explicit deletion).
CREATE TABLE public.living_media_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_path text NOT NULL,
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text
);
CREATE INDEX living_media_deletions_queue_idx ON public.living_media_deletions (enqueued_at);
GRANT ALL ON public.living_media_deletions TO service_role;
ALTER TABLE public.living_media_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.living_media_deletions FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.living_media_enqueue_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.living_media_deletions (object_path) VALUES (OLD.object_path);
  RETURN OLD;
END;
$$;

CREATE TRIGGER living_media_attachments_enqueue_delete
AFTER DELETE ON public.living_media_attachments
FOR EACH ROW EXECUTE FUNCTION public.living_media_enqueue_deletion();

CREATE OR REPLACE FUNCTION public.living_media_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER living_media_attachments_touch
BEFORE UPDATE ON public.living_media_attachments
FOR EACH ROW EXECUTE FUNCTION public.living_media_touch_updated_at();

CREATE OR REPLACE FUNCTION public.living_media_cap_per_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (SELECT count(*) FROM public.living_media_attachments
      WHERE field_note_id = NEW.field_note_id) >= 10 THEN
    RAISE EXCEPTION 'living_media_limit' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER living_media_attachments_cap
BEFORE INSERT ON public.living_media_attachments
FOR EACH ROW EXECUTE FUNCTION public.living_media_cap_per_note();

-- ---------------------------------------------------------------- RPC surface

CREATE OR REPLACE FUNCTION public.living_media_prepare(
  _field_note_id uuid,
  _media_kind text,
  _filename text,
  _mime_type text,
  _byte_size bigint,
  _duration_seconds integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := public.living_caller();
  v_id uuid := gen_random_uuid();
  v_ext text;
  v_row public.living_media_attachments;
BEGIN
  IF _field_note_id IS NULL OR _media_kind IS NULL OR _mime_type IS NULL
     OR _filename IS NULL OR btrim(_filename) = '' OR _byte_size IS NULL THEN
    RAISE EXCEPTION 'living_invalid' USING ERRCODE = '22023';
  END IF;

  IF NOT public.living_owns_record(v_uid, 'field_note', _field_note_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_ext := lower(coalesce(substring(_filename from '\.([A-Za-z0-9]{1,8})$'), ''));
  IF v_ext = '' THEN
    v_ext := CASE _mime_type
      WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' WHEN 'image/webp' THEN 'webp'
      WHEN 'audio/mpeg' THEN 'mp3' WHEN 'audio/mp4' THEN 'm4a' WHEN 'audio/webm' THEN 'weba'
      WHEN 'audio/ogg' THEN 'ogg' WHEN 'audio/wav' THEN 'wav'
      WHEN 'video/mp4' THEN 'mp4' WHEN 'video/webm' THEN 'webm' WHEN 'video/quicktime' THEN 'mov'
      ELSE 'bin' END;
  END IF;

  INSERT INTO public.living_media_attachments (
    id, field_note_id, user_id, media_kind, object_path, original_filename,
    mime_type, declared_byte_size, duration_seconds
  ) VALUES (
    v_id, _field_note_id, v_uid, _media_kind,
    v_uid::text || '/' || _field_note_id::text || '/' || v_id::text || '.' || v_ext,
    left(btrim(_filename), 300), _mime_type, _byte_size, _duration_seconds
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'attachment', to_jsonb(v_row) - 'user_id',
    'bucket', 'living-field-note-media'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.living_media_finalize(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := public.living_caller();
  v_row public.living_media_attachments;
  v_size bigint;
  v_mime text;
  v_limit bigint;
BEGIN
  SELECT * INTO v_row FROM public.living_media_attachments
   WHERE id = _id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT (o.metadata->>'size')::bigint, o.metadata->>'mimetype'
    INTO v_size, v_mime
  FROM storage.objects o
  WHERE o.bucket_id = 'living-field-note-media' AND o.name = v_row.object_path;

  IF v_size IS NULL THEN
    RAISE EXCEPTION 'living_media_missing_object' USING ERRCODE = 'P0002';
  END IF;

  v_limit := CASE v_row.media_kind
    WHEN 'image' THEN 15728640 WHEN 'audio' THEN 52428800 ELSE 157286400 END;

  IF v_size > v_limit
     OR (v_row.media_kind = 'image' AND v_mime NOT IN ('image/jpeg','image/png','image/webp'))
     OR (v_row.media_kind = 'audio' AND v_mime NOT IN ('audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav'))
     OR (v_row.media_kind = 'video' AND v_mime NOT IN ('video/mp4','video/webm','video/quicktime')) THEN
    DELETE FROM public.living_media_attachments WHERE id = v_row.id;
    RAISE EXCEPTION 'living_media_rejected' USING ERRCODE = '22023';
  END IF;

  UPDATE public.living_media_attachments
     SET byte_size = v_size, mime_type = v_mime, status = 'ready',
         finalized_at = now(), content_revision = content_revision + 1
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

CREATE OR REPLACE FUNCTION public.living_media_list(_field_note_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_rows jsonb;
BEGIN
  IF NOT public.living_owns_record(v_uid, 'field_note', _field_note_id) THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(a) - 'user_id' ORDER BY a.created_at ASC, a.id ASC), '[]'::jsonb)
    INTO v_rows
  FROM public.living_media_attachments a
  WHERE a.field_note_id = _field_note_id AND a.user_id = v_uid;

  RETURN jsonb_build_object('records', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.living_media_delete(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := public.living_caller(); v_count integer;
BEGIN
  DELETE FROM public.living_media_attachments WHERE id = _id AND user_id = v_uid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object('deleted', true);
END;
$$;

REVOKE ALL ON FUNCTION public.living_media_prepare(uuid, text, text, text, bigint, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.living_media_finalize(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.living_media_list(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.living_media_delete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.living_media_prepare(uuid, text, text, text, bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_media_finalize(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_media_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.living_media_delete(uuid) TO authenticated;

-- ------------------------------------------------- storage object access rules

CREATE POLICY "Owner reads her own Field Note media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'living-field-note-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.has_full_temple_access(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.living_media_attachments a
    WHERE a.object_path = storage.objects.name AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Owner uploads her own Field Note media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'living-field-note-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.has_full_temple_access(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.living_media_attachments a
    WHERE a.object_path = storage.objects.name AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Owner deletes her own Field Note media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'living-field-note-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.has_full_temple_access(auth.uid())
);
