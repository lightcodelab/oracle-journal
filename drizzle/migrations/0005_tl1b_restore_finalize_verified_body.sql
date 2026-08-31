-- Restore the accepted LP-C.2.2 finalize_verified body verbatim, changing only
-- the audio allowlist to include `audio/x-m4a`.
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

  -- Timed media must have a server-derived duration within the accepted limit.
  IF v_max_seconds IS NOT NULL
     AND (_duration_seconds IS NULL OR _duration_seconds < 1 OR _duration_seconds > v_max_seconds)
  THEN
    DELETE FROM public.living_media_attachments WHERE id = v_row.id;
    RAISE EXCEPTION 'living_media_duration' USING ERRCODE = '22023';
  END IF;

  UPDATE public.living_media_attachments
     SET byte_size = v_size,
         mime_type = v_mime,
         duration_seconds = CASE WHEN v_max_seconds IS NULL THEN NULL ELSE _duration_seconds END,
         status = 'ready',
         finalized_at = now(),
         content_revision = content_revision + 1
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$function$;

REVOKE ALL ON FUNCTION public.living_media_finalize_verified(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.living_media_finalize_verified(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.living_media_finalize_verified(uuid, uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.living_media_finalize_verified(uuid, uuid, integer) TO service_role;
