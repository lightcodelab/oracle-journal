
-- Nervous System Anchoring — multi-tool toolset
-- 1) Daily Anchoring Sessions
CREATE TABLE public.nervous_anchoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes SMALLINT NOT NULL CHECK (duration_minutes IN (2,3,5)),
  completed BOOLEAN NOT NULL DEFAULT false,
  reflection TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nervous_anchoring_sessions TO authenticated;
GRANT ALL ON public.nervous_anchoring_sessions TO service_role;
ALTER TABLE public.nervous_anchoring_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own anchoring sessions"
  ON public.nervous_anchoring_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_nas_user_created ON public.nervous_anchoring_sessions(user_id, created_at DESC);

-- 2) Body Anchor Maps
CREATE TABLE public.nervous_anchor_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_anchor TEXT,
  secondary_anchors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ratings JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { "Lower Ribs": 8, ... }
  sensations JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "Lower Ribs": ["warm","grounded"], ... }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nervous_anchor_maps TO authenticated;
GRANT ALL ON public.nervous_anchor_maps TO service_role;
ALTER TABLE public.nervous_anchor_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own anchor maps"
  ON public.nervous_anchor_maps FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_nam_user_created ON public.nervous_anchor_maps(user_id, created_at DESC);

-- 3) Baseline Stability Check-ins
CREATE TABLE public.nervous_stability_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  body_connection SMALLINT NOT NULL CHECK (body_connection BETWEEN 1 AND 10),
  regulation SMALLINT NOT NULL CHECK (regulation BETWEEN 1 AND 10),
  truth_connection SMALLINT NOT NULL CHECK (truth_connection BETWEEN 1 AND 10),
  capacity SMALLINT NOT NULL CHECK (capacity BETWEEN 1 AND 10),
  score NUMERIC(4,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nervous_stability_checkins TO authenticated;
GRANT ALL ON public.nervous_stability_checkins TO service_role;
ALTER TABLE public.nervous_stability_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stability checkins"
  ON public.nervous_stability_checkins FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_nsc_user_date ON public.nervous_stability_checkins(user_id, entry_date DESC);

-- 4) Weekly Anchoring Log
CREATE TABLE public.nervous_anchoring_weekly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  body_response TEXT,
  best_tool TEXT CHECK (best_tool IN ('orient','breath','anchor_point','truth') OR best_tool IS NULL),
  truth TEXT,
  return_strategy TEXT,
  next_week_focus TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nervous_anchoring_weekly TO authenticated;
GRANT ALL ON public.nervous_anchoring_weekly TO service_role;
ALTER TABLE public.nervous_anchoring_weekly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own weekly anchoring logs"
  ON public.nervous_anchoring_weekly FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_naw_user_week ON public.nervous_anchoring_weekly(user_id, week_start DESC);

-- updated_at triggers
CREATE TRIGGER nas_updated BEFORE UPDATE ON public.nervous_anchoring_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER nam_updated BEFORE UPDATE ON public.nervous_anchor_maps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER nsc_updated BEFORE UPDATE ON public.nervous_stability_checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER naw_updated BEFORE UPDATE ON public.nervous_anchoring_weekly
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Register the tool so it appears in the Tools list and routes via /tools/:slug
INSERT INTO public.transformation_tools (
  slug, title, short_description, purpose, when_to_use, intro_microcopy,
  save_button_label, icon_name, display_order, is_published, score_formula
) VALUES (
  'nervous-system-anchoring',
  'Nervous System Anchoring',
  'Build a progressively more stable nervous system baseline through daily anchoring, body mapping, stability tracking, and weekly reflection.',
  'Train your nervous system to return to itself — not just regulate in difficult moments, but live from a steadier baseline.',
  'When you feel scattered, activated, or disconnected from your body — and as a daily practice to deepen your baseline stability.',
  'Four tools work together: the Daily Anchoring Timer builds the habit, Body Anchor Mapping personalises the practice, the Baseline Stability Tracker measures change over time, and the Weekly Anchoring Log creates reflection and pattern awareness.',
  'Save',
  'Anchor',
  COALESCE((SELECT MAX(display_order) FROM public.transformation_tools), 0) + 1,
  true,
  '{"type":"none"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
