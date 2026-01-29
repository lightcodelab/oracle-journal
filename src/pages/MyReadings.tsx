import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Sparkles, 
  Search, 
  Trash2, 
  Edit3, 
  Save, 
  X,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { supabase } from '@/integrations/supabase/client';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { useSavedReadings, useDeleteSavedReading, useUpdateReadingNotes, SavedReading } from '@/hooks/useSavedReadings';
import { useToast } from '@/hooks/use-toast';

const MyReadings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [readingToDelete, setReadingToDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const { data: readings = [], isLoading: readingsLoading } = useSavedReadings();
  const deleteReading = useDeleteSavedReading();
  const updateNotes = useUpdateReadingNotes();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Filter readings by search
  const filteredReadings = readings.filter((reading) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      reading.card_title.toLowerCase().includes(query) ||
      reading.deck_name?.toLowerCase().includes(query) ||
      reading.notes?.toLowerCase().includes(query)
    );
  });

  const handleDeleteClick = (id: string) => {
    setReadingToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!readingToDelete) return;
    try {
      await deleteReading.mutateAsync(readingToDelete);
      toast({
        title: 'Reading Deleted',
        description: 'The reading has been removed from your collection.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete the reading.',
        variant: 'destructive',
      });
    }
    setDeleteDialogOpen(false);
    setReadingToDelete(null);
  };

  const handleEditClick = (reading: SavedReading) => {
    setEditingId(reading.id);
    setEditNotes(reading.notes || '');
  };

  const handleSaveNotes = async (id: string) => {
    try {
      await updateNotes.mutateAsync({ id, notes: editNotes });
      toast({
        title: 'Notes Updated',
        description: 'Your notes have been saved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notes.',
        variant: 'destructive',
      });
    }
    setEditingId(null);
    setEditNotes('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNotes('');
  };

  if (loading || readingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading your readings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PageBreadcrumb items={[{ label: 'My Readings' }]} />
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <ProfileDropdown />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your readings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl font-bold text-foreground">{readings.length}</div>
            <div className="text-sm text-muted-foreground">Total Readings</div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl font-bold text-foreground">
              {new Set(readings.map(r => r.deck_name).filter(Boolean)).size}
            </div>
            <div className="text-sm text-muted-foreground">Decks Used</div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl font-bold text-foreground">
              {readings.filter(r => r.notes).length}
            </div>
            <div className="text-sm text-muted-foreground">With Notes</div>
          </div>
        </div>

        {/* Readings Grid */}
        <AnimatePresence mode="popLayout">
          {filteredReadings.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              {filteredReadings.map((reading, index) => (
                <motion.div
                  key={reading.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
                >
                  {/* Card Image */}
                  <div className="aspect-[3/4] relative">
                    {reading.image_file_name ? (
                      <img
                        src={`/cards/${reading.image_file_name}`}
                        alt={reading.card_title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-xl font-bold">{reading.card_title}</span>
                      </div>
                    )}
                    
                    {/* Action Buttons Overlay */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-background/90 backdrop-blur"
                        onClick={() => handleEditClick(reading)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-background/90 backdrop-blur text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(reading.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-serif text-lg font-medium text-foreground truncate">
                      {reading.card_title}
                    </h3>
                    {reading.deck_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        {reading.deck_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(reading.saved_at), 'MMM d, yyyy • h:mm a')}
                    </p>

                    {/* Notes Section */}
                    {editingId === reading.id ? (
                      <div className="space-y-2 pt-2">
                        <Textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Add notes..."
                          rows={3}
                          className="resize-none text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveNotes(reading.id)}
                            disabled={updateNotes.isPending}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : reading.notes ? (
                      <p className="text-sm text-foreground/80 line-clamp-3 pt-2 border-t border-border">
                        {reading.notes}
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-16">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery ? 'No readings found' : 'No Saved Readings Yet'}
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Draw cards from the Oracle decks and save your meaningful readings here.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate('/decks')}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Explore Decks
                </Button>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reading?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this reading from your collection. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyReadings;
