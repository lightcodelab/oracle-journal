-- Create session_replays table
CREATE TABLE public.session_replays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  replay_type TEXT NOT NULL CHECK (replay_type IN ('reading', 'class', 'workshop')),
  video_url TEXT, -- External URL (YouTube/Vimeo)
  video_file_path TEXT, -- Storage path for uploaded file
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.session_replays ENABLE ROW LEVEL SECURITY;

-- Public can view published replays
CREATE POLICY "Anyone can view published replays"
  ON public.session_replays
  FOR SELECT
  USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage replays"
  ON public.session_replays
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_session_replays_updated_at
  BEFORE UPDATE ON public.session_replays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for replay videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-replays', 'session-replays', false);

-- Storage policies for replay videos
CREATE POLICY "Admins can upload replay videos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'session-replays' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update replay videos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'session-replays' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete replay videos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'session-replays' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authenticated users can view replay videos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'session-replays');

-- Create index for faster queries
CREATE INDEX idx_session_replays_type ON public.session_replays(replay_type);
CREATE INDEX idx_session_replays_published ON public.session_replays(is_published);
CREATE INDEX idx_session_replays_session_id ON public.session_replays(session_id);