ALTER TABLE public.content_categories DROP CONSTRAINT content_categories_page_check;
ALTER TABLE public.content_categories ADD CONSTRAINT content_categories_page_check CHECK (page IN ('devotion','remembrance','becoming','communion')) NOT VALID;
ALTER TABLE public.content_categories VALIDATE CONSTRAINT content_categories_page_check;
ALTER TABLE public.decks ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.content_categories(id);
CREATE INDEX IF NOT EXISTS decks_location_id_idx ON public.decks(location_id);
COMMENT ON COLUMN public.decks.location_id IS 'Optional Door section placement; null retains the default Draw your Mirror placement in Remembrance.';