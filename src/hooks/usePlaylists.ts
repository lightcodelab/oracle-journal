import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  track_count?: number;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  resource_id: string;
  track_order: number;
  added_at: string;
  // Joined fields
  title?: string;
  audio_url?: string;
  display_image_url?: string;
}

export const usePlaylists = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlaylists = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('playlists')
      .select('*, playlist_tracks(id)')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching playlists:', error);
      return;
    }

    const mapped: Playlist[] = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      created_at: p.created_at,
      updated_at: p.updated_at,
      track_count: p.playlist_tracks?.length || 0,
    }));

    setPlaylists(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const createPlaylist = async (name: string, description?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from('playlists')
      .insert({ user_id: session.user.id, name, description: description || null })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create playlist.', variant: 'destructive' });
      return null;
    }

    await fetchPlaylists();
    toast({ title: 'Playlist Created', description: `"${name}" has been created.` });
    return data;
  };

  const deletePlaylist = async (playlistId: string) => {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete playlist.', variant: 'destructive' });
      return;
    }

    await fetchPlaylists();
    toast({ title: 'Playlist Deleted', description: 'Playlist has been removed.' });
  };

  const renamePlaylist = async (playlistId: string, name: string) => {
    const { error } = await supabase
      .from('playlists')
      .update({ name })
      .eq('id', playlistId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to rename playlist.', variant: 'destructive' });
      return;
    }

    await fetchPlaylists();
  };

  const addTrackToPlaylist = async (playlistId: string, resourceId?: string, lessonId?: string) => {
    // Get current max order
    const { data: existing } = await supabase
      .from('playlist_tracks')
      .select('track_order')
      .eq('playlist_id', playlistId)
      .order('track_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].track_order + 1 : 0;

    const insertData: any = { playlist_id: playlistId, track_order: nextOrder };
    if (resourceId) insertData.resource_id = resourceId;
    if (lessonId) insertData.lesson_id = lessonId;

    const { error } = await supabase
      .from('playlist_tracks')
      .insert(insertData);

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already Added', description: 'This track is already in the playlist.' });
      } else {
        toast({ title: 'Error', description: 'Failed to add track.', variant: 'destructive' });
      }
      return;
    }

    await fetchPlaylists();
    toast({ title: 'Track Added', description: 'Added to your playlist.' });
  };

  const removeTrackFromPlaylist = async (trackId: string) => {
    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('id', trackId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to remove track.', variant: 'destructive' });
      return;
    }

    await fetchPlaylists();
  };

  /** Persist a new ordering. Pass track ids in their desired order. */
  const reorderTracks = async (orderedTrackIds: string[]) => {
    const updates = orderedTrackIds.map((id, index) =>
      supabase.from('playlist_tracks').update({ track_order: index }).eq('id', id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast({ title: 'Error', description: 'Failed to reorder tracks.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const fetchPlaylistTracks = useCallback(async (playlistId: string): Promise<PlaylistTrack[]> => {
    const { data, error } = await supabase
      .from('playlist_tracks')
      .select(`
        id,
        playlist_id,
        resource_id,
        lesson_id,
        track_order,
        added_at,
        healing_resources (
          title,
          audio_file_url,
          display_image_url
        ),
        lessons (
          title,
          audio_url
        )
      `)
      .eq('playlist_id', playlistId)
      .order('track_order', { ascending: true });

    if (error) {
      console.error('Error fetching tracks:', error);
      return [];
    }

    return (data || []).map((t: any) => {
      const resource = t.healing_resources;
      const lesson = t.lessons;

      let audioUrl: string | null = null;
      let title = 'Unknown Track';
      let imageUrl: string | null = null;

      if (resource) {
        title = resource.title || title;
        audioUrl = resource.audio_file_url || null;
        if (audioUrl && !audioUrl.startsWith('http')) {
          const { data: urlData } = supabase.storage.from('healing-resource-images').getPublicUrl(audioUrl);
          audioUrl = urlData.publicUrl;
        }
        imageUrl = resource.display_image_url || null;
        if (imageUrl && !imageUrl.startsWith('http')) {
          const { data: urlData } = supabase.storage.from('healing-resource-images').getPublicUrl(imageUrl);
          imageUrl = urlData.publicUrl;
        }
      } else if (lesson) {
        title = lesson.title || title;
        audioUrl = lesson.audio_url || null;
        if (audioUrl && !audioUrl.startsWith('http') && !audioUrl.startsWith('/')) {
          const { data: urlData } = supabase.storage.from('content-main-media').getPublicUrl(audioUrl);
          audioUrl = urlData.publicUrl;
        }
      }

      return {
        id: t.id,
        playlist_id: t.playlist_id,
        resource_id: t.resource_id,
        track_order: t.track_order,
        added_at: t.added_at,
        title,
        audio_url: audioUrl,
        display_image_url: imageUrl,
      };
    });
  }, []);

  return {
    playlists,
    loading,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    reorderTracks,
    fetchPlaylistTracks,
    refetch: fetchPlaylists,
  };
};
