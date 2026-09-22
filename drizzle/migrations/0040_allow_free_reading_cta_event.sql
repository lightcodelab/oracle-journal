-- Allow the free reading call to action to be recorded on the sales funnel.
DROP POLICY IF EXISTS "Anyone can record a valid launch event" ON public.launch_events;
CREATE POLICY "Anyone can record a valid launch event"
ON public.launch_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event = ANY (ARRAY[
    'sales_page_view',
    'hero_enter_temple_clicked',
    'midpage_enter_temple_clicked',
    'final_enter_temple_clicked',
    'faq_opened',
    'membership_checkout_started',
    'membership_checkout_completed',
    'free_reading_cta'
  ])
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
