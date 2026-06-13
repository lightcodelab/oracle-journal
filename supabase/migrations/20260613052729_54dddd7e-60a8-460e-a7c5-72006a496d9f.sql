
-- ============ AFFILIATE SETTINGS (singleton) ============
CREATE TABLE public.affiliate_settings (
  id INT PRIMARY KEY DEFAULT 1,
  default_signup_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  default_recurring_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  cookie_window_days INT NOT NULL DEFAULT 60,
  min_payout_cents INT NOT NULL DEFAULT 5000,
  currency TEXT NOT NULL DEFAULT 'usd',
  terms_md TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
GRANT SELECT ON public.affiliate_settings TO authenticated, anon;
GRANT ALL ON public.affiliate_settings TO service_role;
ALTER TABLE public.affiliate_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.affiliate_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.affiliate_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.affiliate_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============ AFFILIATES ============
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','rejected')),
  referral_code TEXT NOT NULL UNIQUE,
  display_name TEXT,
  payout_email TEXT,
  payout_method TEXT NOT NULL DEFAULT 'manual' CHECK (payout_method IN ('manual','stripe_connect','paypal')),
  stripe_connect_account_id TEXT,
  commission_signup_pct NUMERIC(5,2),
  commission_recurring_pct NUMERIC(5,2),
  notes TEXT,
  terms_accepted_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.affiliates TO authenticated;
GRANT SELECT ON public.affiliates TO anon;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates view own" ON public.affiliates FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone can read active code lookup" ON public.affiliates FOR SELECT
  USING (status = 'active');
CREATE POLICY "Users apply" ON public.affiliates FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Affiliates update own non-status" ON public.affiliates FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete" ON public.affiliates FOR DELETE
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_affiliates_user ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_code ON public.affiliates(referral_code);

-- ============ AFFILIATE LINKS ============
CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  label TEXT,
  commission_model TEXT NOT NULL DEFAULT 'recurring' CHECK (commission_model IN ('one_time','recurring')),
  destination_path TEXT NOT NULL DEFAULT '/',
  clicks INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_links TO authenticated;
GRANT SELECT ON public.affiliate_links TO anon;
GRANT ALL ON public.affiliate_links TO service_role;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read links for redirect" ON public.affiliate_links FOR SELECT USING (true);
CREATE POLICY "Affiliates manage own links" ON public.affiliate_links FOR ALL
  USING (
    public.has_role(auth.uid(),'admin') OR
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );
CREATE INDEX idx_affiliate_links_code ON public.affiliate_links(code);
CREATE INDEX idx_affiliate_links_aff ON public.affiliate_links(affiliate_id);

-- ============ AFFILIATE REFERRALS ============
CREATE TABLE public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  referred_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  commission_model TEXT NOT NULL DEFAULT 'recurring' CHECK (commission_model IN ('one_time','recurring')),
  status TEXT NOT NULL DEFAULT 'signed_up' CHECK (status IN ('signed_up','converted','expired','refunded')),
  signed_up_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliate view own referrals" ON public.affiliate_referrals FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin') OR
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );
CREATE POLICY "Admin manage referrals" ON public.affiliate_referrals FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_affiliate_referrals_aff ON public.affiliate_referrals(affiliate_id);
CREATE INDEX idx_affiliate_referrals_user ON public.affiliate_referrals(referred_user_id);

-- ============ AFFILIATE COMMISSIONS ============
CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES public.affiliate_referrals(id) ON DELETE SET NULL,
  payout_id UUID,
  type TEXT NOT NULL CHECK (type IN ('signup','recurring','bonus','adjustment')),
  source_invoice_id TEXT,
  source_subscription_id TEXT,
  base_amount_cents INT NOT NULL DEFAULT 0,
  rate_pct NUMERIC(5,2),
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','void','refunded')),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_invoice_id, type)
);
GRANT SELECT, UPDATE ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliate view own commissions" ON public.affiliate_commissions FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin') OR
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );
CREATE POLICY "Admin manage commissions" ON public.affiliate_commissions FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_commissions_aff ON public.affiliate_commissions(affiliate_id, status);
CREATE INDEX idx_commissions_payout ON public.affiliate_commissions(payout_id);

-- ============ AFFILIATE PAYOUTS ============
CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed')),
  method TEXT NOT NULL DEFAULT 'manual' CHECK (method IN ('manual','stripe_connect','paypal')),
  reference TEXT,
  notes TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliate view own payouts" ON public.affiliate_payouts FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin') OR
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );
CREATE POLICY "Admin manage payouts" ON public.affiliate_payouts FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ updated_at triggers ============
CREATE TRIGGER trg_affiliates_updated BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_links_updated BEFORE UPDATE ON public.affiliate_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_referrals_updated BEFORE UPDATE ON public.affiliate_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_commissions_updated BEFORE UPDATE ON public.affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_payouts_updated BEFORE UPDATE ON public.affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_affiliate_settings_updated BEFORE UPDATE ON public.affiliate_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Click tracking RPC (public, no auth) ============
CREATE OR REPLACE FUNCTION public.track_affiliate_click(_code TEXT)
RETURNS TABLE(affiliate_id UUID, link_id UUID, destination_path TEXT, commission_model TEXT, referral_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_aff RECORD;
BEGIN
  SELECT * INTO v_link FROM public.affiliate_links WHERE code = _code LIMIT 1;
  IF NOT FOUND THEN
    -- try matching against affiliate referral_code as default link
    SELECT * INTO v_aff FROM public.affiliates WHERE referral_code = _code AND status = 'active' LIMIT 1;
    IF NOT FOUND THEN
      RETURN;
    END IF;
    RETURN QUERY SELECT v_aff.id, NULL::UUID, '/'::TEXT, 'recurring'::TEXT, v_aff.referral_code;
    RETURN;
  END IF;

  UPDATE public.affiliate_links SET clicks = clicks + 1 WHERE id = v_link.id;
  SELECT * INTO v_aff FROM public.affiliates WHERE id = v_link.affiliate_id;
  RETURN QUERY SELECT v_aff.id, v_link.id, v_link.destination_path, v_link.commission_model, v_aff.referral_code;
END;
$$;
GRANT EXECUTE ON FUNCTION public.track_affiliate_click(TEXT) TO anon, authenticated;

-- ============ Referral attribution RPC (called after signup) ============
CREATE OR REPLACE FUNCTION public.attribute_affiliate_referral(_code TEXT, _link_code TEXT DEFAULT NULL, _commission_model TEXT DEFAULT 'recurring')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_aff RECORD;
  v_link_id UUID;
  v_existing UUID;
  v_referral_id UUID;
BEGIN
  IF v_user IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_existing FROM public.affiliate_referrals WHERE referred_user_id = v_user;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  SELECT * INTO v_aff FROM public.affiliates WHERE referral_code = _code AND status = 'active' LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Don't self-refer
  IF v_aff.user_id = v_user THEN RETURN NULL; END IF;

  IF _link_code IS NOT NULL THEN
    SELECT id INTO v_link_id FROM public.affiliate_links WHERE code = _link_code AND affiliate_id = v_aff.id;
  END IF;

  INSERT INTO public.affiliate_referrals (affiliate_id, link_id, referred_user_id, commission_model)
  VALUES (v_aff.id, v_link_id, v_user, COALESCE(_commission_model,'recurring'))
  RETURNING id INTO v_referral_id;

  RETURN v_referral_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.attribute_affiliate_referral(TEXT, TEXT, TEXT) TO authenticated;
