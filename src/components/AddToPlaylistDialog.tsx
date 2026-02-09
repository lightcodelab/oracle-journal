import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListMusic, Plus, Music, Check } from 'lucide-react';
import { usePlaylists } from '@/hooks/usePlaylists';

interface AddToPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: string;
  resourceTitle: string;
}

const AddToPlaylistDialog = ({
  open,
  onOpenChange,
  resourceId,
  resourceTitle,
}: AddToPlaylistDialogProps) => {
  const { playlists, loading, createPlaylist, addTrackToPlaylist } = usePlaylists();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const handleAdd = async (playlistId: string) => {
    setAdding(playlistId);
    await addTrackToPlaylist(playlistId, resourceId);
    setAdded(prev => new Set(prev).add(playlistId));
    setAdding(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const playlist = await createPlaylist(newName.trim());
    if (playlist) {
      await addTrackToPlaylist(playlist.id, resourceId);
      setAdded(prev => new Set(prev).add(playlist.id));
      setNewName('');
      setShowCreate(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <ListMusic className="w-5 h-5 text-primary" />
            Add to Playlist
          </DialogTitle>
          <DialogDescription className="text-sm">
            Add "<span className="text-foreground font-medium">{resourceTitle}</span>" to a playlist
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Existing playlists */}
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading playlists...</p>
          ) : playlists.length === 0 && !showCreate ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No playlists yet. Create one below!
            </p>
          ) : (
            <ScrollArea className="max-h-[240px]">
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAdd(playlist.id)}
                    disabled={adding === playlist.id || added.has(playlist.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/50 transition-colors text-left disabled:opacity-60"
                  >
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Music className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{playlist.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {playlist.track_count} {playlist.track_count === 1 ? 'track' : 'tracks'}
                      </p>
                    </div>
                    {added.has(playlist.id) ? (
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                    ) : adding === playlist.id ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : null}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Create new playlist */}
          {showCreate ? (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Playlist name..."
                className="flex-1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setNewName(''); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Playlist
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToPlaylistDialog;
