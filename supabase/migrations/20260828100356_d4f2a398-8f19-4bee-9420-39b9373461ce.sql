ALTER TABLE public.living_media_attachments
  DROP CONSTRAINT living_media_duration_chk;

ALTER TABLE public.living_media_attachments
  ADD CONSTRAINT living_media_duration_chk CHECK (
    duration_seconds IS NULL OR (
      duration_seconds > 0 AND duration_seconds <= CASE media_kind
        WHEN 'image' THEN 0
        WHEN 'audio' THEN 600
        ELSE 180
      END
    )
  );