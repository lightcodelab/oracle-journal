-- TL-1B correction 2: accept `audio/x-m4a` (the practical Chromium MIME for
-- iPhone voice memos, same M4A container as audio/mp4). Nothing else about the
-- private media model changes: 50 MB / 600 s audio limits, server-derived
-- duration verification, owner-only storage and signed reads all stay.

ALTER TABLE public.living_media_attachments
  DROP CONSTRAINT living_media_mime_chk;

ALTER TABLE public.living_media_attachments
  ADD CONSTRAINT living_media_mime_chk CHECK (
    (media_kind = 'image' AND mime_type IN ('image/jpeg','image/png','image/webp'))
    OR (media_kind = 'audio' AND mime_type IN ('audio/mpeg','audio/mp4','audio/x-m4a','audio/webm','audio/ogg','audio/wav'))
    OR (media_kind = 'video' AND mime_type IN ('video/mp4','video/webm','video/quicktime'))
  );

-- prepare(): extension fallback map gains x-m4a.
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
      WHEN 'audio/mpeg' THEN 'mp3' WHEN 'audio/mp4' THEN 'm4a' WHEN 'audio/x-m4a' THEN 'm4a'
      WHEN 'audio/webm' THEN 'weba'
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

-- finalize_verified(): audio allowlist gains x-m4a; limits unchanged.
CREATE OR REPLACE FUNCTION public.living_media_finalize_verified(
  _id uuid,
  _user_id uuid,
  _duration_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.living_media_attachments;
  v_size bigint;
  v_mime text;
  v_limit bigint;
  v_max_seconds integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'living_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_row FROM public.living_media_attachments
   WHERE id = _id AND user_id = _user_id;
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
  v_max_seconds := CASE v_row.media_kind
    WHEN 'audio' THEN 600 WHEN 'video' THEN 180 ELSE NULL END;

  IF v_size > v_limit
     OR (v_row.media_kind = 'image' AND v_mime NOT IN ('image/jpeg','image/png','image/webp'))
     OR (v_row.media_kind = 'audio' AND v_mime NOT IN ('audio/mpeg','audio/mp4','audio/x-m4a','audio/webm','audio/ogg','audio/wav'))
     OR (v_row.media_kind = 'video' AND v_mime NOT IN ('video/mp4','video/webm','video/quicktime'))
  THEN
    DELETE FROM public.living_media_attachments WHERE id = v_row.id;
    RAISE EXCEPTION 'living_media_invalid' USING ERRCODE = '22023';
  END IF;

  IF v_max_seconds IS NOT NULL
     AND (_duration_seconds IS NULL OR _duration_seconds <= 0 OR _duration_seconds > v_max_seconds) THEN
    DELETE FROM public.living_media_attachments WHERE id = v_row.id;
    RAISE EXCEPTION 'living_media_too_long' USING ERRCODE = '22023';
  END IF;

  UPDATE public.living_media_attachments
     SET status = 'ready',
         byte_size = v_size,
         duration_seconds = CASE WHEN v_max_seconds IS NULL THEN NULL ELSE _duration_seconds END,
         content_revision = content_revision + 1
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('attachment', to_jsonb(v_row) - 'user_id');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.living_media_finalize_verified(uuid, uuid, integer) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.living_media_finalize_verified(uuid, uuid, integer) TO service_role;
