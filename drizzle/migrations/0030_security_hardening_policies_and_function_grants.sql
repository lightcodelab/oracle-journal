-- 1. Fix mutable search_path on remaining functions
ALTER FUNCTION public._stripe_webhook_stale_after() SET search_path = public;
ALTER FUNCTION public.founding_members_enforce_monotonic() SET search_path = public;

-- 2. Revoke EXECUTE from anon/authenticated on trigger + internal test functions
REVOKE EXECUTE ON FUNCTION public.affiliates_guard_privileged_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.entitlements_enforce_grace_invariant() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.entitlements_mirror_trigger() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_of_signup() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_membership_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.founding_members_enforce_monotonic() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._oracle_access_run_tests() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._phase3_2_run_tests() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._phase3_2c_run_tests() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._stripe_webhook_stale_after() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_test_webhook_event(text) FROM anon, authenticated;

-- 3. Revoke anon EXECUTE on member-only / admin-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.admin_launch_stats(timestamp with time zone, timestamp with time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_launch_stats_is_authorised() FROM anon;
REVOKE EXECUTE ON FUNCTION public.attribute_affiliate_referral(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_unpaid_accounts(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_deck_purchases_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_entitlements() FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_active_patterns(boolean, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_invitation_hide(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_invitation_hides_list() FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_invitation_unhide(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_invitations(boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_record_row(uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_record_themes(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_theme_attach(uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_theme_create(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_theme_delete(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_theme_detach(uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_theme_records(uuid, timestamp with time zone, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_theme_update(uuid, integer, text, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.living_themes_list(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pattern_common_themes(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pattern_record_create(text, text[], text, text[], text, text, text, text, text, text, text, text, text, timestamp with time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pattern_record_get(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pattern_record_update(uuid, integer, text, text[], text, text[], text, text, text, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pattern_records_awaiting_return(interval) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pattern_records_list(timestamp with time zone, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pattern_return_create(uuid, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pattern_return_update(uuid, integer, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recompute_profile_active_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.remembrance_join() FROM anon;
REVOKE EXECUTE ON FUNCTION public.remembrance_mark_read(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.remembrance_save_reflection(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_temple(text) FROM anon;

-- 4. affiliate_settings: no longer world-readable
DROP POLICY IF EXISTS "Anyone can read settings" ON public.affiliate_settings;
CREATE POLICY "Signed-in users can read settings"
  ON public.affiliate_settings FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.affiliate_settings FROM anon;

-- 5. launch_events: validate event names and field sizes
DROP POLICY IF EXISTS "Anyone can record a launch event" ON public.launch_events;
CREATE POLICY "Anyone can record a valid launch event"
  ON public.launch_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    event IN (
      'sales_page_view',
      'hero_enter_temple_clicked',
      'midpage_enter_temple_clicked',
      'final_enter_temple_clicked',
      'faq_opened',
      'membership_checkout_started',
      'membership_checkout_completed'
    )
    AND (session_id IS NULL OR length(session_id) <= 100)
    AND (path IS NULL OR length(path) <= 500)
    AND (referrer IS NULL OR length(referrer) <= 500)
    AND (referrer_host IS NULL OR length(referrer_host) <= 255)
    AND (utm_source IS NULL OR length(utm_source) <= 120)
    AND (utm_medium IS NULL OR length(utm_medium) <= 120)
    AND (utm_campaign IS NULL OR length(utm_campaign) <= 120)
    AND (affiliate_code IS NULL OR length(affiliate_code) <= 64)
    AND pg_column_size(metadata) <= 2000
  );

-- 6. quiz_events: only valid event types on published quizzes
DROP POLICY IF EXISTS "Anyone can insert quiz event" ON public.quiz_events;
CREATE POLICY "Anyone can insert a valid quiz event"
  ON public.quiz_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    event_type IN ('view', 'start', 'complete', 'optin')
    AND EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_events.quiz_id AND q.status = 'published'
    )
  );

-- 7. quiz_responses: submissions only through the server-side quiz-submit function
DROP POLICY IF EXISTS "Anyone can insert a response" ON public.quiz_responses;
REVOKE INSERT ON public.quiz_responses FROM anon, authenticated;

-- 8. Storage attachments: exact object path matching instead of wildcard LIKE
DROP POLICY IF EXISTS "Entitled members can view published attachments" ON storage.objects;
CREATE POLICY "Entitled members can view published attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'content-attachments'
    AND public.has_full_temple_access(auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.content_resource_attachments a
        JOIN public.content_resources r ON r.id = a.resource_id
        WHERE r.status = 'published'
          AND right(a.file_url, length(objects.name) + 1) = '/' || objects.name
      )
      OR EXISTS (
        SELECT 1 FROM public.content_lesson_attachments la
        JOIN public.content_lessons l ON l.id = la.lesson_id
        WHERE l.status = 'published'
          AND right(la.file_url, length(objects.name) + 1) = '/' || objects.name
      )
    )
  );