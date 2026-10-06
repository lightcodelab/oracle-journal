ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_focus text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS focus_prompted_at timestamptz;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_primary_focus_check CHECK (primary_focus IS NULL OR primary_focus IN ('devotion','remembrance','becoming','communion'));