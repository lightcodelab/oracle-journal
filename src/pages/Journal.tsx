import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter,
  ArrowLeft,
  BookOpen,
  Pin,
  Calendar,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import JournalEditor from '@/components/journal/JournalEditor';
import JournalEntryCard from '@/components/journal/JournalEntryCard';
import TagPicker from '@/components/journal/TagPicker';
import { 
  useJournalEntries, 
  useCreateJournalEntry, 
  useUpdateJournalEntry,
  useDeleteJournalEntry,
  useTogglePinEntry,
  type JournalEntry 
} from '@/hooks/useJournalEntries';
import { 
  useEntryTags, 
  useAssignTagToEntry, 
  useRemoveTagFromEntry 
} from '@/hooks/useJournalTags';
import type { Json } from '@/integrations/supabase/types';

type ViewMode = 'list' | 'editor';
type FilterType = 'all' | 'pinned' | 'card' | 'lesson' | 'course';

const Journal = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [entryTitle, setEntryTitle] = useState('');

  // Queries and mutations
  const { data: entries = [], isLoading: entriesLoading } = useJournalEntries();
  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const togglePin = useTogglePinEntry();
  
  const { data: entryTags = [] } = useEntryTags(selectedEntry?.id);
  const assignTag = useAssignTagToEntry();
  const removeTag = useRemoveTagFromEntry();

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

  // Filter and search entries
  const filteredEntries = entries.filter((entry) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = entry.title?.toLowerCase().includes(query);
      const matchesContent = entry.content_text?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesContent) return false;
    }

    // Type filter
    switch (filterType) {
      case 'pinned':
        return entry.is_pinned;
      case 'card':
        return entry.context_type === 'card';
      case 'lesson':
        return entry.context_type === 'lesson';
      case 'course':
        return entry.context_type === 'course';
      default:
        return true;
    }
  });

  // Sort: pinned first, then by date
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime();
  });

  const handleNewEntry = async () => {
    const newEntry = await createEntry.mutateAsync({
      title: '',
      content_json: { type: 'doc', content: [] },
      content_text: '',
      is_quick_capture: true,
    });
    setSelectedEntry(newEntry);
    setEntryTitle('');
    setViewMode('editor');
  };

  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setEntryTitle(entry.title || '');
    setViewMode('editor');
  };

  const handleAutoSave = async (content: Json, contentText: string) => {
    if (!selectedEntry) return;
    await updateEntry.mutateAsync({
      id: selectedEntry.id,
      title: entryTitle || null,
      content_json: content,
      content_text: contentText,
    });
  };

  const handleTitleChange = (title: string) => {
    setEntryTitle(title);
    if (selectedEntry) {
      updateEntry.mutate({
        id: selectedEntry.id,
        title: title || null,
      });
    }
  };

  const handleTagToggle = async (tagId: string) => {
    if (!selectedEntry) return;
    const isSelected = entryTags.some((t: { tag_id: string }) => t.tag_id === tagId);
    if (isSelected) {
      await removeTag.mutateAsync({ entryId: selectedEntry.id, tagId });
    } else {
      await assignTag.mutateAsync({ entryId: selectedEntry.id, tagId });
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedEntry(null);
    setEntryTitle('');
  };

  if (loading || entriesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading your journal...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {viewMode === 'editor' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="text-foreground/70 hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <PageBreadcrumb items={[{ label: 'My Journal' }]} />
            )}
            {viewMode === 'list' && (
              <BookOpen className="h-5 w-5 text-primary" />
            )}
          </div>
          <ProfileDropdown />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {viewMode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search your journal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entries</SelectItem>
                    <SelectItem value="pinned">
                      <div className="flex items-center gap-2">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </div>
                    </SelectItem>
                    <SelectItem value="card">Card Reflections</SelectItem>
                    <SelectItem value="lesson">Lesson Notes</SelectItem>
                    <SelectItem value="course">Course Notes</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleNewEntry} disabled={createEntry.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Entry
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold text-foreground">{entries.length}</div>
                  <div className="text-sm text-muted-foreground">Total Entries</div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold text-foreground">
                    {entries.filter(e => e.is_pinned).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pinned</div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold text-foreground">
                    {entries.filter(e => e.context_type === 'card').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Card Reflections</div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold text-foreground">
                    {entries.filter(e => e.context_type === 'lesson').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Lesson Notes</div>
                </div>
              </div>

              {/* Entries List */}
              {sortedEntries.length > 0 ? (
                <div className="grid gap-4">
                  {sortedEntries.map((entry) => (
                    <JournalEntryCard
                      key={entry.id}
                      entry={entry}
                      onSelect={handleSelectEntry}
                      onPin={(id, isPinned) => togglePin.mutate({ id, isPinned })}
                      onDelete={(id) => deleteEntry.mutate(id)}
                      isSelected={selectedEntry?.id === entry.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchQuery || filterType !== 'all'
                      ? 'No entries found'
                      : 'Start Your Journey'}
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    {searchQuery || filterType !== 'all'
                      ? 'Try adjusting your search or filter'
                      : 'Capture your reflections, insights, and moments of growth. Your journal awaits.'}
                  </p>
                  {!searchQuery && filterType === 'all' && (
                    <Button onClick={handleNewEntry}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Entry
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Entry Title */}
              <Input
                value={entryTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Entry title (optional)"
                className="text-xl font-serif border-0 border-b rounded-none px-0 mb-4 focus-visible:ring-0"
              />

              {/* Tags */}
              <div className="mb-4">
                <TagPicker
                  selectedTagIds={entryTags.map((t: { tag_id: string }) => t.tag_id)}
                  onTagToggle={handleTagToggle}
                />
              </div>

              {/* Context indicator */}
              {selectedEntry?.context_title && (
                <div className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Linked to: {selectedEntry.context_title}
                </div>
              )}

              {/* Editor */}
              <JournalEditor
                initialContent={selectedEntry?.content_json}
                onAutoSave={handleAutoSave}
                placeholder="Begin your reflection..."
                isSaving={updateEntry.isPending}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Journal;
