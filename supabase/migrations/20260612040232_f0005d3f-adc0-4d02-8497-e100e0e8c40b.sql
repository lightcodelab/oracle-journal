
CREATE TABLE public.emotional_somatic_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emotional_somatic_entries TO authenticated;
GRANT ALL ON public.emotional_somatic_entries TO service_role;
ALTER TABLE public.emotional_somatic_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own somatic" ON public.emotional_somatic_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_emotional_somatic_updated BEFORE UPDATE ON public.emotional_somatic_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.emotional_now_then_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_text text NOT NULL,
  intensity int NOT NULL,
  proportionate text NOT NULL,
  story text,
  felt_before text NOT NULL,
  result text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emotional_now_then_entries TO authenticated;
GRANT ALL ON public.emotional_now_then_entries TO service_role;
ALTER TABLE public.emotional_now_then_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nowthen" ON public.emotional_now_then_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_emotional_now_then_updated BEFORE UPDATE ON public.emotional_now_then_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.emotional_regulation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state text NOT NULL,
  tool_key text NOT NULL,
  tool_label text NOT NULL,
  regulated_score int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emotional_regulation_logs TO authenticated;
GRANT ALL ON public.emotional_regulation_logs TO service_role;
ALTER TABLE public.emotional_regulation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reglog" ON public.emotional_regulation_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_emotional_regulation_logs_updated BEFORE UPDATE ON public.emotional_regulation_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.emotional_translation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emotion text NOT NULL,
  need text NOT NULL,
  chosen_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emotional_translation_entries TO authenticated;
GRANT ALL ON public.emotional_translation_entries TO service_role;
ALTER TABLE public.emotional_translation_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own translation" ON public.emotional_translation_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_emotional_translation_updated BEFORE UPDATE ON public.emotional_translation_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.emotional_weekly_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emotion_most text,
  emotion_avoided text,
  trigger_taught text,
  regulated_before_reacting text,
  reacted_before_regulating text,
  need_discovered text,
  proud_of text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emotional_weekly_reflections TO authenticated;
GRANT ALL ON public.emotional_weekly_reflections TO service_role;
ALTER TABLE public.emotional_weekly_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weekly" ON public.emotional_weekly_reflections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_emotional_weekly_updated BEFORE UPDATE ON public.emotional_weekly_reflections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.emotional_capacity_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intensity int NOT NULL,
  activation_duration text NOT NULL,
  presence_score int NOT NULL,
  regulated_before_reacting boolean NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emotional_capacity_checkins TO authenticated;
GRANT ALL ON public.emotional_capacity_checkins TO service_role;
ALTER TABLE public.emotional_capacity_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own capacity" ON public.emotional_capacity_checkins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_emotional_capacity_updated BEFORE UPDATE ON public.emotional_capacity_checkins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.emotional_recovery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_text text NOT NULL,
  activation_at timestamptz NOT NULL DEFAULT now(),
  baseline_at timestamptz,
  recovery_minutes int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emotional_recovery_logs TO authenticated;
GRANT ALL ON public.emotional_recovery_logs TO service_role;
ALTER TABLE public.emotional_recovery_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recovery" ON public.emotional_recovery_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_emotional_recovery_updated BEFORE UPDATE ON public.emotional_recovery_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.transformation_tools (slug, title, short_description, purpose, when_to_use, intro_microcopy, save_button_label, icon_name, display_order, is_published, score_formula, recommended_resource_ids)
VALUES (
  'emotional-mastery-audit',
  'Emotional Mastery Audit',
  'A complete emotional mastery ecosystem: feel, locate, differentiate, regulate, translate, choose.',
  'Move through the methodology — Feel → Locate → Differentiate → Regulate → Translate → Choose — until it becomes automatic.',
  'When you are activated, overwhelmed, numb, or want to integrate what an emotion is teaching you.',
  'Take a breath. Where does this live in your body?',
  'Save',
  'Heart',
  20,
  true,
  '{"type":"none"}'::jsonb,
  ARRAY[]::uuid[]
)
ON CONFLICT (slug) DO NOTHING;
