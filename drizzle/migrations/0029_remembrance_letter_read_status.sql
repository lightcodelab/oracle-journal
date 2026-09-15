-- Remembrance Letters: track which letters the member has opened.

ALTER TABLE public.remembrance_letters ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Mark a member's own letter as read. Idempotent: only sets read_at if null.
CREATE OR REPLACE FUNCTION public.remembrance_mark_read(_letter_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.remembrance_letters;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _row
  FROM public.remembrance_letters
  WHERE id = _letter_id AND user_id = _uid;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Letter not found';
  END IF;

  UPDATE public.remembrance_letters
  SET read_at = coalesce(read_at, now())
  WHERE id = _letter_id
  RETURNING * INTO _row;

  RETURN to_jsonb(_row);
END;
$$;

REVOKE ALL ON FUNCTION public.remembrance_mark_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remembrance_mark_read(uuid) TO authenticated;