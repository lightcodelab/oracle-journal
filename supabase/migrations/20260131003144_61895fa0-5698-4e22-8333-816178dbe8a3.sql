-- Create tier code enum
CREATE TYPE public.tier_code AS ENUM ('T1', 'T2', 'T3');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete');

-- Create cadence enum
CREATE TYPE public.billing_cadence AS ENUM ('monthly', 'yearly');

-- Create payment provider enum
CREATE TYPE public.payment_provider AS ENUM ('stripe', 'paypal');

-- Create audit source enum
CREATE TYPE public.audit_source AS ENUM ('webhook', 'admin', 'member');

-- Create tiers table
CREATE TABLE public.tiers (
  code VARCHAR(2) PRIMARY KEY,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert tier data
INSERT INTO public.tiers (code, name, rank) VALUES
  ('T1', 'The Seeker', 1),
  ('T2', 'The Devotee', 2),
  ('T3', 'The Initiate', 3);

-- Create content_buckets table
CREATE TABLE public.content_buckets (
  key VARCHAR(100) PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert content buckets
INSERT INTO public.content_buckets (key, name, description) VALUES
  ('remembrance', 'The Door of Remembrance', 'Access to remembrance content and practices'),
  ('devotion', 'The Door of Devotion', 'Access to devotion courses and deeper teachings'),
  ('communion', 'The Door of Communion', 'Access to live sessions, workshops, and community');

-- Create tier_bucket_access table (using is_granted instead of grant which is reserved)
CREATE TABLE public.tier_bucket_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_code VARCHAR(2) NOT NULL REFERENCES public.tiers(code) ON DELETE CASCADE,
  bucket_key VARCHAR(100) NOT NULL REFERENCES public.content_buckets(key) ON DELETE CASCADE,
  is_granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tier_code, bucket_key)
);

-- Insert tier-bucket mappings
INSERT INTO public.tier_bucket_access (tier_code, bucket_key, is_granted) VALUES
  ('T1', 'remembrance', true),
  ('T2', 'remembrance', true),
  ('T2', 'devotion', true),
  ('T3', 'remembrance', true),
  ('T3', 'devotion', true),
  ('T3', 'communion', true);

-- Create plans table
CREATE TABLE public.plans (
  code VARCHAR(2) PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert plans
INSERT INTO public.plans (code, name, description) VALUES
  ('T1', 'The Seeker', 'Begin your journey with access to The Door of Remembrance'),
  ('T2', 'The Devotee', 'Deepen your practice with The Door of Devotion'),
  ('T3', 'The Initiate', 'Full access including live sessions and community');

-- Create prices table
CREATE TABLE public.prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(2) NOT NULL REFERENCES public.plans(code) ON DELETE CASCADE,
  cadence billing_cadence NOT NULL,
  provider payment_provider NOT NULL,
  provider_product_id TEXT,
  provider_price_id TEXT,
  currency VARCHAR(3) DEFAULT 'USD',
  unit_amount_cents INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, provider_price_id)
);

-- Insert USD prices (Stripe IDs to be updated after product creation)
INSERT INTO public.prices (plan_code, cadence, provider, unit_amount_cents, currency) VALUES
  ('T1', 'monthly', 'stripe', 1000, 'USD'),
  ('T1', 'yearly', 'stripe', 10000, 'USD'),
  ('T2', 'monthly', 'stripe', 3500, 'USD'),
  ('T2', 'yearly', 'stripe', 35000, 'USD'),
  ('T3', 'monthly', 'stripe', 9500, 'USD'),
  ('T3', 'yearly', 'stripe', 95000, 'USD'),
  ('T1', 'monthly', 'paypal', 1000, 'USD'),
  ('T1', 'yearly', 'paypal', 10000, 'USD'),
  ('T2', 'monthly', 'paypal', 3500, 'USD'),
  ('T2', 'yearly', 'paypal', 35000, 'USD'),
  ('T3', 'monthly', 'paypal', 9500, 'USD'),
  ('T3', 'yearly', 'paypal', 95000, 'USD');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider payment_provider NOT NULL,
  provider_subscription_id TEXT UNIQUE,
  plan_code VARCHAR(2) NOT NULL REFERENCES public.plans(code),
  cadence billing_cadence NOT NULL,
  status subscription_status NOT NULL DEFAULT 'incomplete',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_invoice_id TEXT UNIQUE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  amount_due_cents INTEGER NOT NULL,
  amount_paid_cents INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  provider payment_provider NOT NULL,
  provider_payment_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscription_events table for webhook idempotency
CREATE TABLE public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider payment_provider NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_status TEXT DEFAULT 'pending',
  error_message TEXT
);

-- Create membership_audit table
CREATE TABLE public.membership_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_tier_code VARCHAR(2),
  new_tier_code VARCHAR(2),
  source audit_source NOT NULL,
  reason TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

-- Add membership columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS member_tier_code VARCHAR(2),
  ADD COLUMN IF NOT EXISTS plan_cadence TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Enable RLS on all new tables
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_bucket_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tiers (public read)
CREATE POLICY "Anyone can view active tiers" ON public.tiers
  FOR SELECT USING (is_active = true);

-- RLS Policies for content_buckets (public read)
CREATE POLICY "Anyone can view content buckets" ON public.content_buckets
  FOR SELECT USING (true);

-- RLS Policies for tier_bucket_access (public read)
CREATE POLICY "Anyone can view tier bucket access" ON public.tier_bucket_access
  FOR SELECT USING (true);

-- RLS Policies for plans (public read)
CREATE POLICY "Anyone can view active plans" ON public.plans
  FOR SELECT USING (active = true);

-- RLS Policies for prices (public read)
CREATE POLICY "Anyone can view active prices" ON public.prices
  FOR SELECT USING (active = true);

-- RLS Policies for subscriptions (user can view own, admin can view all)
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for invoices
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payments (via invoice ownership)
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    invoice_id IN (SELECT id FROM public.invoices WHERE profile_id = auth.uid())
  );

CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subscription_events (admin only)
CREATE POLICY "Admins can view subscription events" ON public.subscription_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for membership_audit (admin only)
CREATE POLICY "Admins can view membership audit" ON public.membership_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_subscriptions_profile_id ON public.subscriptions(profile_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_invoices_profile_id ON public.invoices(profile_id);
CREATE INDEX idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX idx_subscription_events_event_id ON public.subscription_events(event_id);
CREATE INDEX idx_prices_plan_cadence ON public.prices(plan_code, cadence, active);

-- Create function to check tier access
CREATE OR REPLACE FUNCTION public.has_bucket_access(bucket_key_param VARCHAR(100))
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.tier_bucket_access tba ON tba.tier_code = p.member_tier_code
    WHERE p.id = auth.uid()
      AND tba.bucket_key = bucket_key_param
      AND tba.is_granted = true
      AND p.subscription_status IN ('active', 'trialing')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Create function to get user entitlements
CREATE OR REPLACE FUNCTION public.get_user_entitlements()
RETURNS TABLE (
  tier_code VARCHAR(2),
  tier_name TEXT,
  cadence TEXT,
  status TEXT,
  period_end TIMESTAMPTZ,
  bucket_access JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.member_tier_code,
    t.name,
    p.plan_cadence,
    p.subscription_status,
    p.current_period_end,
    COALESCE(
      (
        SELECT jsonb_object_agg(tba.bucket_key, tba.is_granted)
        FROM public.tier_bucket_access tba
        WHERE tba.tier_code = p.member_tier_code
      ),
      '{}'::jsonb
    )
  FROM public.profiles p
  LEFT JOIN public.tiers t ON t.code = p.member_tier_code
  WHERE p.id = auth.uid()
$$;