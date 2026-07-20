-- Purge test-environment rows created during Phase 3.2c Sandbox verification.
DELETE FROM public.entitlements WHERE stripe_environment = 'test';
DELETE FROM public.subscriptions WHERE stripe_environment = 'test';
DELETE FROM public.stripe_webhook_events WHERE stripe_environment = 'test';
DELETE FROM public.founder_price_audit WHERE stripe_environment = 'test';
DELETE FROM public.founding_members WHERE stripe_environment = 'test';
DELETE FROM public.stripe_webhook_env_mismatches WHERE event_id = '__p32_env_mismatch__';

-- Confirm kill switch remains OFF.
UPDATE public.app_settings SET value = 'false' WHERE key = 'use_new_entitlement_model';