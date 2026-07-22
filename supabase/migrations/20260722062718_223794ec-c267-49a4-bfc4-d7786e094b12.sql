
-- Add thumbnail_url to decks
ALTER TABLE public.decks ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Reuse course_tags as canonical tag taxonomy for all content types.
-- New assignment tables link course_tags to content_resources and decks.

CREATE TABLE IF NOT EXISTS public.content_resource_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.content_resources(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.course_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_crta_resource ON public.content_resource_tag_assignments(resource_id);
CREATE INDEX IF NOT EXISTS idx_crta_tag ON public.content_resource_tag_assignments(tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_resource_tag_assignments TO authenticated;
GRANT SELECT ON public.content_resource_tag_assignments TO anon;
GRANT ALL ON public.content_resource_tag_assignments TO service_role;

ALTER TABLE public.content_resource_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage content resource tags"
  ON public.content_resource_tag_assignments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view tags for published resources"
  ON public.content_resource_tag_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content_resources r
      WHERE r.id = content_resource_tag_assignments.resource_id
        AND r.status = 'published'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TABLE IF NOT EXISTS public.deck_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.course_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deck_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_dta_deck ON public.deck_tag_assignments(deck_id);
CREATE INDEX IF NOT EXISTS idx_dta_tag ON public.deck_tag_assignments(tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deck_tag_assignments TO authenticated;
GRANT SELECT ON public.deck_tag_assignments TO anon;
GRANT ALL ON public.deck_tag_assignments TO service_role;

ALTER TABLE public.deck_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage deck tags"
  ON public.deck_tag_assignments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view deck tag assignments"
  ON public.deck_tag_assignments
  FOR SELECT
  USING (true);
