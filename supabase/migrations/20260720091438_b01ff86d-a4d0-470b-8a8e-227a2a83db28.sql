-- Phase 3.2c evidence reconciliation cleanup: remove synthetic webhook test rows.
DELETE FROM public.subscriptions WHERE provider_subscription_id = 'sub_1TvDH5S1OlJiqABwK6vz4oDD';
DELETE FROM public.stripe_webhook_events WHERE event_id LIKE 'evt_p32c_%' OR event_id LIKE '__p32_evt_%';
DELETE FROM public.stripe_webhook_env_mismatches WHERE event_id LIKE 'evt_p32c_%' OR event_id LIKE '__p32_env_mismatch__%';