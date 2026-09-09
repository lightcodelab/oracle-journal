CREATE TABLE public.card_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.course_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (card_id, tag_id)
);

CREATE INDEX idx_card_tag_assignments_card ON public.card_tag_assignments(card_id);
CREATE INDEX idx_card_tag_assignments_tag ON public.card_tag_assignments(tag_id);

GRANT SELECT ON public.card_tag_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_tag_assignments TO authenticated;
GRANT ALL ON public.card_tag_assignments TO service_role;

ALTER TABLE public.card_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Card tag assignments are viewable by everyone"
  ON public.card_tag_assignments FOR SELECT
  USING (true);

CREATE POLICY "Admins manage card tag assignments"
  ON public.card_tag_assignments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));