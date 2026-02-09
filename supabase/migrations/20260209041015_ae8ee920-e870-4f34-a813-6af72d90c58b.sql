
-- Create playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlist_tracks table
CREATE TABLE public.playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.healing_resources(id) ON DELETE CASCADE,
  track_order INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, resource_id)
);

-- Enable RLS
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Playlists policies
CREATE POLICY "Users can view their own playlists"
  ON public.playlists FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own playlists"
  ON public.playlists FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
  ON public.playlists FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
  ON public.playlists FOR DELETE USING (auth.uid() = user_id);

-- Playlist tracks policies
CREATE POLICY "Users can view tracks in their playlists"
  ON public.playlist_tracks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND user_id = auth.uid()));

CREATE POLICY "Users can add tracks to their playlists"
  ON public.playlist_tracks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND user_id = auth.uid()));

CREATE POLICY "Users can update tracks in their playlists"
  ON public.playlist_tracks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND user_id = auth.uid()));

CREATE POLICY "Users can remove tracks from their playlists"
  ON public.playlist_tracks FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
