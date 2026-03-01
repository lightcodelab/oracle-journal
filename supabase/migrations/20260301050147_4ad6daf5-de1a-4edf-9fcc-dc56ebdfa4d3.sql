
CREATE TABLE public.bug_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  steps_to_reproduce text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  page_url text,
  browser_info text,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own bug reports
CREATE POLICY "Users can view own bug reports" ON public.bug_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own bug reports
CREATE POLICY "Users can insert own bug reports" ON public.bug_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all bug reports
CREATE POLICY "Admins can view all bug reports" ON public.bug_reports
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all bug reports (status, admin_notes)
CREATE POLICY "Admins can update all bug reports" ON public.bug_reports
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
