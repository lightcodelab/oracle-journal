ALTER TABLE public.decks ADD COLUMN is_published boolean DEFAULT false;
UPDATE public.decks SET is_published = true;
ALTER TABLE public.decks ALTER COLUMN is_published SET NOT NULL;

DROP POLICY IF EXISTS "Anyone can view decks" ON public.decks;
CREATE POLICY "Published decks are visible and admins can preview drafts"
ON public.decks
FOR SELECT
TO public
USING (is_published = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can view accessible cards" ON public.cards;
CREATE POLICY "Users can view accessible cards from published decks"
ON public.cards
FOR SELECT
TO public
USING (public.can_view_card(auth.uid(), deck_id));

CREATE OR REPLACE FUNCTION public.can_view_card(_user_id uuid, _deck_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'admin'
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.decks
        WHERE id = _deck_id AND is_published = true
      )
      AND (
        EXISTS (
          SELECT 1 FROM public.deck_purchases
          WHERE user_id = _user_id AND deck_id = _deck_id AND verified = true
        )
        OR (_user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.decks
          WHERE id = _deck_id AND (is_free = true OR is_starter = true)
        ))
        OR public.has_full_temple_access(_user_id)
      )
    );
$function$;

DO $migration$
DECLARE
  def text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'search_temple'
     AND pg_get_function_identity_arguments(p.oid) = '_q text';

  IF def IS NULL THEN
    RAISE EXCEPTION 'public.search_temple(text) was not found';
  END IF;

  def := replace(
    def,
    'FROM decks d, pats p',
    'FROM (SELECT * FROM decks WHERE is_published = true OR public.has_role(auth.uid(), ''admin''::public.app_role)) d, pats p'
  );
  def := replace(
    def,
    'JOIN decks dk ON dk.id = c.deck_id',
    'JOIN (SELECT * FROM decks WHERE is_published = true OR public.has_role(auth.uid(), ''admin''::public.app_role)) dk ON dk.id = c.deck_id'
  );

  EXECUTE def;
END;
$migration$;

GRANT SELECT ON public.decks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decks TO authenticated;
GRANT ALL ON public.decks TO service_role;
GRANT SELECT ON public.cards TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;