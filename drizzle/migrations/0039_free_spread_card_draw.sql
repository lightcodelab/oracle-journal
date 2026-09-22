-- Lets a free account draw the cards for its single Past, Present, Future
-- reading without opening the decks for general browsing.
CREATE OR REPLACE FUNCTION public.draw_free_spread_cards(_count integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to draw your reading.';
  END IF;

  IF _count IS NULL OR _count < 1 OR _count > 4 THEN
    RAISE EXCEPTION 'Invalid card count.';
  END IF;

  IF NOT public.has_free_spread_access(auth.uid()) THEN
    RAISE EXCEPTION 'Your free reading is not available.';
  END IF;

  SELECT jsonb_agg(row_to_json(picked))
    INTO _result
  FROM (
    SELECT c.*, d.name AS deck_name_resolved
    FROM public.cards c
    JOIN public.decks d ON d.id = c.deck_id
    WHERE d.is_published = true
      AND d.is_starter = false
    ORDER BY random()
    LIMIT _count
  ) picked;

  RETURN COALESCE(_result, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.draw_free_spread_cards(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.draw_free_spread_cards(integer) TO authenticated, service_role;
