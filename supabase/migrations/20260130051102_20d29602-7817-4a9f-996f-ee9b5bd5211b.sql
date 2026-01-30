-- Create live_sessions table for scheduling Zoom meetings
CREATE TABLE public.live_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  capacity INTEGER DEFAULT 100,
  zoom_meeting_id TEXT,
  zoom_join_url TEXT,
  zoom_start_url TEXT,
  zoom_password TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  host_user_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create session_registrations table for RSVPs
CREATE TABLE public.session_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'waitlist', 'attended', 'cancelled')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attended_at TIMESTAMPTZ,
  calendar_added BOOLEAN DEFAULT false,
  UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_registrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for live_sessions
CREATE POLICY "Anyone can view scheduled sessions"
  ON public.live_sessions
  FOR SELECT
  USING (status IN ('scheduled', 'live'));

CREATE POLICY "Admins can manage all sessions"
  ON public.live_sessions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for session_registrations
CREATE POLICY "Users can view their own registrations"
  ON public.session_registrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can register for sessions"
  ON public.session_registrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registration"
  ON public.session_registrations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all registrations"
  ON public.session_registrations
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all registrations"
  ON public.session_registrations
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for efficient queries
CREATE INDEX idx_live_sessions_scheduled_at ON public.live_sessions(scheduled_at);
CREATE INDEX idx_live_sessions_status ON public.live_sessions(status);
CREATE INDEX idx_session_registrations_session_id ON public.session_registrations(session_id);
CREATE INDEX idx_session_registrations_user_id ON public.session_registrations(user_id);