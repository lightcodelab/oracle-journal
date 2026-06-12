
-- 1. Boundary Audit Journal entries
CREATE TABLE public.boundary_audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  situation TEXT,
  truth_status TEXT CHECK (truth_status IN ('yes','no','unsure','need_more_info')),
  truth_text TEXT,
  body_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  body_first_response TEXT,
  abandonment_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  abandonment_text TEXT,
  needed_boundary TEXT,
  next_time_script TEXT,
  relationship_category TEXT,
  integrity_rating SMALLINT CHECK (integrity_rating BETWEEN 0 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boundary_audit_entries TO authenticated;
GRANT ALL ON public.boundary_audit_entries TO service_role;
ALTER TABLE public.boundary_audit_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own boundary audit entries"
  ON public.boundary_audit_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_bae_user_created ON public.boundary_audit_entries(user_id, created_at DESC);

-- 2. Rehearsal scripts
CREATE TABLE public.boundary_rehearsal_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audit_entry_id UUID REFERENCES public.boundary_audit_entries(id) ON DELETE SET NULL,
  original_text TEXT,
  shorter_text TEXT,
  no_apology_text TEXT,
  no_overexplain_text TEXT,
  final_text TEXT,
  relationship_category TEXT,
  added_to_library BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boundary_rehearsal_scripts TO authenticated;
GRANT ALL ON public.boundary_rehearsal_scripts TO service_role;
ALTER TABLE public.boundary_rehearsal_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rehearsal scripts"
  ON public.boundary_rehearsal_scripts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_brs_user_created ON public.boundary_rehearsal_scripts(user_id, created_at DESC);

-- 3. Script library (seed + personal)
CREATE TABLE public.boundary_script_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = seeded shared script
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  is_seed BOOLEAN NOT NULL DEFAULT false,
  is_favourite BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boundary_script_library TO authenticated;
GRANT ALL ON public.boundary_script_library TO service_role;
ALTER TABLE public.boundary_script_library ENABLE ROW LEVEL SECURITY;
-- Anyone authenticated can read seeded scripts
CREATE POLICY "View seeded scripts"
  ON public.boundary_script_library FOR SELECT TO authenticated
  USING (is_seed = true OR user_id = auth.uid());
CREATE POLICY "Users insert own scripts"
  ON public.boundary_script_library FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_seed = false);
CREATE POLICY "Users update own scripts"
  ON public.boundary_script_library FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own scripts"
  ON public.boundary_script_library FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX idx_bsl_category ON public.boundary_script_library(category, display_order);
CREATE INDEX idx_bsl_user ON public.boundary_script_library(user_id);

-- 4. Daily integrity reflections
CREATE TABLE public.integrity_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('yes','mostly','partly','no','unsure')),
  held_text TEXT,
  wobbled_text TEXT,
  practise_text TEXT,
  resentment SMALLINT CHECK (resentment BETWEEN 0 AND 4),
  communication SMALLINT CHECK (communication BETWEEN 0 AND 4),
  exhaustion SMALLINT CHECK (exhaustion BETWEEN 0 AND 4),
  recovery_time TEXT CHECK (recovery_time IN ('under_5m','5_15m','15_60m','1_4h','all_day','longer') OR recovery_time IS NULL),
  boundary_outcome TEXT CHECK (boundary_outcome IN ('held','wobbled','collapsed','repaired') OR boundary_outcome IS NULL),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrity_reflections TO authenticated;
GRANT ALL ON public.integrity_reflections TO service_role;
ALTER TABLE public.integrity_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own integrity reflections"
  ON public.integrity_reflections FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_ir_user_created ON public.integrity_reflections(user_id, created_at DESC);

-- updated_at triggers
CREATE TRIGGER trg_bae_updated BEFORE UPDATE ON public.boundary_audit_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_brs_updated BEFORE UPDATE ON public.boundary_rehearsal_scripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bsl_updated BEFORE UPDATE ON public.boundary_script_library FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ir_updated BEFORE UPDATE ON public.integrity_reflections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
