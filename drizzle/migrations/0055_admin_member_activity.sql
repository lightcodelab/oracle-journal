CREATE OR REPLACE FUNCTION public.admin_member_activity(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  SELECT jsonb_build_object(
    'spreads', COALESCE((SELECT jsonb_agg(t) FROM (
      SELECT coalesce(spread_name, spread_type) AS name, count(*) AS readings, count(DISTINCT user_id) AS people
      FROM saved_readings
      WHERE spread_type IS NOT NULL AND created_at >= _from AND created_at < _to
        AND NOT public.has_role(user_id, 'admin'::app_role)
      GROUP BY 1 ORDER BY 2 DESC) t), '[]'),
    'decks', COALESCE((SELECT jsonb_agg(t) FROM (
      SELECT coalesce(d.name, 'Unknown deck') AS name, count(*) AS draws, count(DISTINCT cd.user_id) AS people
      FROM card_draws cd LEFT JOIN decks d ON d.id = cd.deck_id
      WHERE cd.drawn_at >= _from AND cd.drawn_at < _to
        AND NOT public.has_role(cd.user_id, 'admin'::app_role)
      GROUP BY 1 ORDER BY 2 DESC) t), '[]')
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_member_activity(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_member_activity(timestamptz, timestamptz) TO authenticated;