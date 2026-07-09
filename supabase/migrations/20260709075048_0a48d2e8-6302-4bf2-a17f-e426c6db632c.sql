
-- ============ QUIZZES ============
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  cover_image_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#c9a96e',
  accent_color TEXT NOT NULL DEFAULT '#8b6f47',
  button_label TEXT NOT NULL DEFAULT 'Start Quiz',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  access TEXT NOT NULL DEFAULT 'public' CHECK (access IN ('public','members')),
  require_email BOOLEAN NOT NULL DEFAULT true,
  collect_name BOOLEAN NOT NULL DEFAULT true,
  consent_text TEXT,
  mailerlite_group_id TEXT,
  seo_title TEXT,
  seo_description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quizzes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published quizzes"
  ON public.quizzes FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage quizzes"
  ON public.quizzes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ QUIZ RESULTS ============
CREATE TABLE public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  redirect_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_results TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_results TO authenticated;
GRANT ALL ON public.quiz_results TO service_role;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view results of published quizzes"
  ON public.quiz_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND (q.status = 'published' OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Admins manage quiz results"
  ON public.quiz_results FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_quiz_results_updated_at BEFORE UPDATE ON public.quiz_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ QUIZ QUESTIONS ============
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  help_text TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions of published quizzes"
  ON public.quiz_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND (q.status='published' OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Admins manage quiz questions"
  ON public.quiz_questions FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON public.quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ QUIZ OPTIONS ============
CREATE TABLE public.quiz_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  result_id UUID REFERENCES public.quiz_results(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_options TO authenticated;
GRANT ALL ON public.quiz_options TO service_role;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view options of published quizzes"
  ON public.quiz_options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = question_id AND (q.status='published' OR public.has_role(auth.uid(),'admin'))
  ));
CREATE POLICY "Admins manage quiz options"
  ON public.quiz_options FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_quiz_options_updated_at BEFORE UPDATE ON public.quiz_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ QUIZ RESPONSES ============
CREATE TABLE public.quiz_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  result_id UUID REFERENCES public.quiz_results(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed BOOLEAN NOT NULL DEFAULT false,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.quiz_responses TO anon;
GRANT SELECT, INSERT ON public.quiz_responses TO authenticated;
GRANT ALL ON public.quiz_responses TO service_role;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a response"
  ON public.quiz_responses FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Admins can view all responses"
  ON public.quiz_responses FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));

-- ============ QUIZ EVENTS ============
CREATE TABLE public.quiz_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view','start','complete','optin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.quiz_events TO anon;
GRANT SELECT, INSERT ON public.quiz_events TO authenticated;
GRANT ALL ON public.quiz_events TO service_role;
ALTER TABLE public.quiz_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert quiz event"
  ON public.quiz_events FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Admins can view quiz events"
  ON public.quiz_events FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_quiz_events_quiz ON public.quiz_events(quiz_id, event_type, created_at);
CREATE INDEX idx_quiz_responses_quiz ON public.quiz_responses(quiz_id, created_at DESC);
CREATE INDEX idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, position);
CREATE INDEX idx_quiz_options_question ON public.quiz_options(question_id, position);
CREATE INDEX idx_quiz_results_quiz ON public.quiz_results(quiz_id, position);
