-- Align living_theme_update revision-conflict signalling with the accepted
-- Living Pattern convention (55000), which the API layer does not retry.
CREATE OR REPLACE FUNCTION public.living_theme_update(_id uuid, _expected_revision integer, _label text DEFAULT NULL, _note text DEFAULT NULL, _clear_note boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := public.living_caller(); v_row public.living_themes;
BEGIN
  SELECT * INTO v_row FROM public.living_themes WHERE id=_id AND user_id=v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'living_not_found' USING ERRCODE='P0002'; END IF;
  IF v_row.content_revision <> _expected_revision THEN
    RAISE EXCEPTION 'living_revision_conflict' USING ERRCODE='55000';
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