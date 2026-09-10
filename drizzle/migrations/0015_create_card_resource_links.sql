CREATE TABLE public.card_resource_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  resource_kind TEXT NOT NULL CHECK (resource_kind IN ('content', 'healing', 'course')),
  resource_id UUID NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (card_id, resource_kind, resource_id)
);

CREATE INDEX idx_card_resource_links_card ON public.card_resource_links(card_id);

GRANT SELECT ON public.card_resource_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_resource_links TO authenticated;
GRANT ALL ON public.card_resource_links TO service_role;

ALTER TABLE public.card_resource_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Card resource links are viewable by everyone"
ON public.card_resource_links FOR SELECT
USING (true);

CREATE POLICY "Admins manage card resource links"
ON public.card_resource_links FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));