CREATE OR REPLACE FUNCTION public._caller_may_check(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    _user_id = auth.uid()
    OR coalesce(auth.role(), '') = 'service_role'
    OR session_user IN ('postgres','supabase_admin')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
$$;
REVOKE ALL ON FUNCTION public._caller_may_check(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public._caller_may_check(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_view_card(_user_id uuid, _deck_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT public._caller_may_check(_user_id) AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.decks WHERE id = _deck_id AND is_published = true)
      AND (
        EXISTS (SELECT 1 FROM public.deck_purchases WHERE user_id = _user_id AND deck_id = _deck_id AND verified = true)
        OR EXISTS (SELECT 1 FROM public.decks WHERE id = _deck_id AND (is_free = true OR is_starter = true))
        OR public.has_full_temple_access(_user_id)
      )
    ));
$function$;

CREATE OR REPLACE FUNCTION public.can_view_lesson(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT public._caller_may_check(_user_id) AND public.has_full_temple_access(_user_id); $function$;

CREATE OR REPLACE FUNCTION public.can_view_lesson_by_door(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT public._caller_may_check(_user_id) AND public.has_full_temple_access(_user_id); $function$;

CREATE OR REPLACE FUNCTION public.has_active_membership(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT public._caller_may_check(_user_id) AND public.has_full_temple_access(_user_id); $function$;

CREATE OR REPLACE FUNCTION public.has_bucket_access(_user_id uuid, _bucket_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT public._caller_may_check(_user_id) AND public.has_full_temple_access(_user_id); $function$;

CREATE OR REPLACE FUNCTION public.has_free_spread_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT public._caller_may_check(_user_id)
    AND NOT public.has_full_temple_access(_user_id)
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND free_reading_used_at IS NULL);
$function$;