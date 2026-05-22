
CREATE TABLE public.snail_mail_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  postal_address TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_month INT NOT NULL DEFAULT 1 CHECK (current_month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.snail_mail_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.snail_mail_subscribers(id) ON DELETE CASCADE,
  month_number INT NOT NULL CHECK (month_number BETWEEN 1 AND 12),
  theme TEXT NOT NULL,
  card_ids UUID[] NOT NULL DEFAULT '{}',
  card_snapshot JSONB,
  draft_content TEXT,
  final_content TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  model_used TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_snail_mail_letters_subscriber ON public.snail_mail_letters(subscriber_id, month_number);

ALTER TABLE public.snail_mail_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snail_mail_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage subscribers" ON public.snail_mail_subscribers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage letters" ON public.snail_mail_letters
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_snail_subs_updated BEFORE UPDATE ON public.snail_mail_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_snail_letters_updated BEFORE UPDATE ON public.snail_mail_letters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
