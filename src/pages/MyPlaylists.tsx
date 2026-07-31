import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ListMusic,
  Plus,
  Music,
  Trash2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Pencil,
  Check,
  X,
  Headphones,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { usePlaylists, PlaylistTrack } from '@/hooks/usePlaylists';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MyPlaylists = () => {
  const navigate = useNavigate();
  const {
    playlists,
    loading,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    removeTrackFromPlaylist,
    reorderTracks,
    fetchPlaylistTracks,
  } = usePlaylists();

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate('/auth');
    };
    checkAuth();
  }, [navigate]);

  // Auto-select first playlist
  useEffect(() => {
    if (!selectedPlaylistId && playlists.length > 0) {
      setSelectedPlaylistId(playlists[0].id);
    }
  }, [playlists, selectedPlaylistId]);

  const loadTracks = useCallback(async (playlistId: string) => {
    setTracksLoading(true);
    const data = await fetchPlaylistTracks(playlistId);
    setTracks(data);
    setTracksLoading(false);
  }, [fetchPlaylistTracks]);

  useEffect(() => {
    if (selectedPlaylistId) {
      loadTracks(selectedPlaylistId);
      setCurrentTrackIndex(null);
      setIsPlaying(false);
    }
  }, [selectedPlaylistId, loadTracks]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const pl = await createPlaylist(newPlaylistName.trim());
    if (pl) {
      setSelectedPlaylistId(pl.id);
      setNewPlaylistName('');
      setShowCreateInput(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await renamePlaylist(id, editName.trim());
    setEditingId(null);
  };

  const handleDeletePlaylist = async () => {
    if (!deleteTarget) return;
    await deletePlaylist(deleteTarget);
    if (selectedPlaylistId === deleteTarget) {
      setSelectedPlaylistId(null);
      setTracks([]);
    }
    setDeleteTarget(null);
  };

  const handleRemoveTrack = async (trackId: string) => {
    await removeTrackFromPlaylist(trackId);
    if (selectedPlaylistId) loadTracks(selectedPlaylistId);
  };

  const moveTrack = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= tracks.length) return;

    const reordered = [...tracks];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setTracks(reordered);

    // Keep the currently playing track highlighted after the move
    setCurrentTrackIndex((prev) => {
      if (prev === null) return prev;
      if (prev === index) return target;
      if (prev === target) return index;
      return prev;
    });

    const ok = await reorderTracks(reordered.map((t) => t.id));
    if (!ok && selectedPlaylistId) loadTracks(selectedPlaylistId);
  };

  // Audio controls
  const playTrack = (index: number) => {
    if (!tracks[index]?.audio_url) return;
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    setTimeout(() => {
      audioRef.current?.play();
    }, 100);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    if (currentTrackIndex === null || currentTrackIndex >= tracks.length - 1) return;
    playTrack(currentTrackIndex + 1);
  };

  const prevTrack = () => {
    if (currentTrackIndex === null || currentTrackIndex <= 0) return;
    playTrack(currentTrackIndex - 1);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;
  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <PageBreadcrumb items={[{ label: 'My Playlists' }]} />
          <ProfileDropdown />
        </div>
      </header>

      <main className="container max-w-5xl px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <ListMusic className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-serif text-foreground mb-2">My Playlists</h1>
          <p className="text-muted-foreground">Curate your personal audio collections</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar: Playlists */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Playlists</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowCreateInput(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {showCreateInput && (
              <div className="flex gap-2">
                <Input
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="New playlist..."
                  className="h-9 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                />
                <Button size="sm" className="h-9" onClick={handleCreatePlaylist}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-9" onClick={() => { setShowCreateInput(false); setNewPlaylistName(''); }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
            ) : playlists.length === 0 ? (
              <div className="text-center py-8">
                <Music className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No playlists yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowCreateInput(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create Playlist
                </Button>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-1">
                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
                        selectedPlaylistId === pl.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => setSelectedPlaylistId(pl.id)}
                    >
                      {editingId === pl.id ? (
                        <div className="flex-1 flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleRename(pl.id)}
                          />
                          <Button size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRename(pl.id)}>
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Music className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{pl.name}</p>
                            <p className="text-xs text-muted-foreground">{pl.track_count} tracks</p>
                          </div>
                          <div className="hidden group-hover:flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => { setEditingId(pl.id); setEditName(pl.name); }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => setDeleteTarget(pl.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Main: Tracks */}
          <div className="space-y-4">
            {selectedPlaylist ? (
              <>
                <h2 className="font-serif text-xl">{selectedPlaylist.name}</h2>

                {tracksLoading ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">Loading tracks...</p>
                ) : tracks.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-lg">
                    <Headphones className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No tracks in this playlist yet.</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Add audio resources from the Door of Devotion.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {tracks.map((track, idx) => (
                      <motion.div
                        key={track.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors group ${
                          currentTrackIndex === idx
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <button
                          onClick={() => (currentTrackIndex === idx && isPlaying ? togglePlayPause() : playTrack(idx))}
                          className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors"
                          disabled={!track.audio_url}
                        >
                          {currentTrackIndex === idx && isPlaying ? (
                            <Pause className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-primary ml-0.5" />
                          )}
                        </button>

                        {track.display_image_url && (
                          <img
                            src={track.display_image_url}
                            alt=""
                            className="w-10 h-10 rounded object-cover shrink-0"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{track.title}</p>
                          {!track.audio_url && (
                            <p className="text-xs text-destructive">No audio file</p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemoveTrack(track.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>

                        <div className="flex flex-col shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Move track up"
                            className="h-5 w-7 text-muted-foreground hover:text-foreground"
                            disabled={idx === 0}
                            onClick={() => moveTrack(idx, -1)}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Move track down"
                            className="h-5 w-7 text-muted-foreground hover:text-foreground"
                            disabled={idx === tracks.length - 1}
                            onClick={() => moveTrack(idx, 1)}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <ListMusic className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Select or create a playlist to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Audio Player */}
        {currentTrack && currentTrack.audio_url && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur z-50"
          >
            <div className="container max-w-5xl mx-auto px-4 py-3">
              <div className="flex items-center gap-4">
                {currentTrack.display_image_url && (
                  <img
                    src={currentTrack.display_image_url}
                    alt=""
                    className="w-12 h-12 rounded object-cover shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{currentTrack.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground w-10 text-right">{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      value={currentTime}
                      onChange={(e) => {
                        const t = Number(e.target.value);
                        if (audioRef.current) audioRef.current.currentTime = t;
                        setCurrentTime(t);
                      }}
                      className="flex-1 h-1 accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground w-10">{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={prevTrack} disabled={currentTrackIndex === 0}>
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={togglePlayPause}>
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={nextTrack} disabled={currentTrackIndex === null || currentTrackIndex >= tracks.length - 1}>
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={currentTrack.audio_url}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
              onEnded={nextTrack}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </motion.div>
        )}
      </main>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this playlist and all its tracks. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlaylist} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyPlaylists;
