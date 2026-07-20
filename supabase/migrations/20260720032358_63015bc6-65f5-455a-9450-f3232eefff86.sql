
-- Phase 1: additive entitlement + founder model. Nothing dropped.

-- 1. app_settings (server-side config, public-read for non-sensitive keys)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public settings readable" ON public.app_settings
  FOR SELECT USING (is_public = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manages settings" ON public.app_settings
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed defaults (values to be filled in by admin later; placeholders)
INSERT INTO public.app_settings (key, value, is_public) VALUES
  ('founding_beta_starts_at', 'null'::jsonb, true),
  ('founding_beta_ends_at',   'null'::jsonb, true),
  ('founding_price_id',       'null'::jsonb, false),
  ('standard_price_id',       'null'::jsonb, false),
  ('failed_payment_grace_days', '10'::jsonb, false),
  ('use_new_entitlement_model','true'::jsonb, false)
ON CONFLICT (key) DO NOTHING;

-- 2. entitlements ledger
CREATE TABLE IF NOT EXISTS public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('stripe','shopify','manual','admin')),
  source_ref text,
  product_kind text NOT NULL DEFAULT 'app_membership',
  status text NOT NULL CHECK (status IN ('active','in_grace','canceled','expired','paused')),
  starts_at timestamptz,
  ends_at timestamptz,
  grace_until timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_ref)
);
CREATE INDEX IF NOT EXISTS entitlements_user_status_idx
  ON public.entitlements (user_id, status);
GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own entitlements" ON public.entitlements
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER entitlements_updated_at BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. founding_members
CREATE TABLE IF NOT EXISTS public.founding_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_founding_member boolean NOT NULL DEFAULT true,
  founding_member_since timestamptz NOT NULL DEFAULT now(),
  founder_badge_awarded_at timestamptz NOT NULL DEFAULT now(),
  founding_subscription_id text,
  founding_price_eligibility_status text NOT NULL DEFAULT 'active'
    CHECK (founding_price_eligibility_status IN ('active','in_grace','lost')),
  founding_price_lost_at timestamptz,
  founding_price_lost_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.founding_members TO authenticated;
GRANT ALL ON public.founding_members TO service_role;
ALTER TABLE public.founding_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own founder row" ON public.founding_members
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manages founders" ON public.founding_members
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER founding_members_updated_at BEFORE UPDATE ON public.founding_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. founder_price_audit
CREATE TABLE IF NOT EXISTS public.founder_price_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor uuid,
  from_status text,
  to_status text,
  reason text,
  at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.founder_price_audit TO authenticated;
GRANT ALL ON public.founder_price_audit TO service_role;
ALTER TABLE public.founder_price_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads founder audit" ON public.founder_price_audit
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- 5. profiles additive columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active_member boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_member_since timestamptz;

-- 6. subscriptions: ordering guard column
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz;

-- 7. canonical entitlement function
CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.entitlements
      WHERE user_id = _user_id
        AND product_kind = 'app_membership'
        AND status IN ('active','in_grace')
        AND (ends_at IS NULL OR ends_at > now())
    )
    OR EXISTS (
      SELECT 1 FROM public.manual_access_grants
      WHERE user_id = _user_id
        AND starts_at <= now() AND ends_at > now()
    );
$$;

CREATE OR REPLACE FUNCTION public.get_member_state(_user_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'is_active_member', public.is_active_member(_user_id),
    'is_founding_member', COALESCE((SELECT is_founding_member FROM public.founding_members WHERE user_id = _user_id), false),
    'founder_badge', EXISTS(SELECT 1 FROM public.founding_members WHERE user_id = _user_id),
    'founding_price_status', (SELECT founding_price_eligibility_status FROM public.founding_members WHERE user_id = _user_id),
    'founding_member_since', (SELECT founding_member_since FROM public.founding_members WHERE user_id = _user_id),
    'subscription_status', (SELECT subscription_status FROM public.profiles WHERE id = _user_id),
    'current_period_end', (SELECT current_period_end FROM public.profiles WHERE id = _user_id),
    'is_admin', EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
  );
$$;

-- 8. Rewrite legacy access checks so all buckets open for active members.
-- Bodies changed; signatures preserved so existing RLS policies keep working.

CREATE OR REPLACE FUNCTION public.has_bucket_access(bucket_key_param character varying)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_active_member(auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.can_view_lesson(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_active_member(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_view_lesson_by_door(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_active_member(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_view_card(_user_id uuid, _deck_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_active_member(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.deck_purchases
      WHERE user_id = _user_id AND deck_id = _deck_id AND verified = true
    )
    OR (_user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.decks WHERE id = _deck_id AND (is_free = true OR is_starter = true)
    ));
$$;

CREATE OR REPLACE FUNCTION public.has_active_membership(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_active_member(_user_id)
$$;

-- 9. Backfill entitlements from existing subscriptions
INSERT INTO public.entitlements (user_id, source, source_ref, product_kind, status, starts_at, ends_at, metadata)
SELECT
  s.profile_id,
  'stripe',
  COALESCE(s.provider_subscription_id, 'legacy:'||s.id::text),
  'app_membership',
  CASE
    WHEN s.status::text IN ('active','trialing') THEN 'active'
    WHEN s.status::text = 'past_due' THEN 'in_grace'
    WHEN s.status::text = 'paused' THEN 'paused'
    ELSE 'canceled'
  END,
  s.current_period_start,
  s.current_period_end,
  jsonb_build_object('backfilled', true, 'legacy_status', s.status::text)
FROM public.subscriptions s
WHERE s.profile_id IS NOT NULL
ON CONFLICT (source, source_ref) DO NOTHING;

-- Denormalise onto profiles
UPDATE public.profiles p
SET is_active_member = TRUE,
    active_member_since = COALESCE(active_member_since, now())
WHERE EXISTS (
  SELECT 1 FROM public.entitlements e
  WHERE e.user_id = p.id
    AND e.product_kind = 'app_membership'
    AND e.status IN ('active','in_grace')
);
