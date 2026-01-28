import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JournalEditor from '@/components/journal/JournalEditor';
import JournalEntryCard from '@/components/journal/JournalEntryCard';
import { 
  useJournalEntries, 
  useCreateJournalEntry, 
  useUpdateJournalEntry,
  type JournalEntry 
} from '@/hooks/useJournalEntries';
import type { Json } from '@/integrations/supabase/types';

interface ContextualJournalProps {
  contextType: 'card' | 'lesson' | 'course' | 'deck';
  contextId: string;
  contextTitle: string;
  placeholder?: string;
  className?: string;
}

export default function ContextualJournal({
  contextType,
  contextId,
  contextTitle,
  placeholder = 'Write your reflection...',
  className,
}: ContextualJournalProps) {
  const [isWriting, setIsWriting] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  const { data: entries = [], isLoading } = useJournalEntries({
    contextType,
    contextId,
  });

  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();

  const handleNewEntry = async () => {
    const newEntry = await createEntry.mutateAsync({
      title: null,
      content_json: { type: 'doc', content: [] },
      content_text: '',
      is_quick_capture: true,
      context_type: contextType,
      context_id: contextId,
      context_title: contextTitle,
    });
    setSelectedEntry(newEntry);
    setIsWriting(true);
  };

  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setIsWriting(true);
  };

  const handleAutoSave = async (content: Json, contentText: string) => {
    if (!selectedEntry) return;
    await updateEntry.mutateAsync({
      id: selectedEntry.id,
      content_json: content,
      content_text: contentText,
    });
  };

  const handleCloseEditor = () => {
    setIsWriting(false);
    setSelectedEntry(null);
  };

  return (
    <div className={className}>
      {/* Divider */}
      <div className="border-t border-border my-8" />
      
      {/* Journal Section with distinct styling */}
      <div className="bg-muted/30 border border-border rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-full bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-serif text-xl text-foreground">Journal Reflections</h3>
            <p className="text-sm text-muted-foreground">Your personal notes and insights</p>
          </div>
          {entries.length > 0 && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isWriting && selectedEntry ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Writing reflection...
                </span>
                <Button variant="ghost" size="sm" onClick={handleCloseEditor}>
                  Done
                </Button>
              </div>
              <JournalEditor
                initialContent={selectedEntry.content_json}
                onAutoSave={handleAutoSave}
                placeholder={placeholder}
                isSaving={updateEntry.isPending}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* New entry button */}
              <Button
                variant="outline"
                className="w-full border-dashed hover:border-primary/50 hover:bg-primary/5 mb-4"
                onClick={handleNewEntry}
                disabled={createEntry.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Reflection
              </Button>

              {/* Existing entries */}
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading...
                </div>
              ) : entries.length > 0 ? (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <JournalEntryCard
                      key={entry.id}
                      entry={entry}
                      onSelect={handleSelectEntry}
                      isSelected={selectedEntry?.id === entry.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No reflections yet.</p>
                  <p className="text-xs mt-1 opacity-70">Add one to capture your thoughts and insights.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Link to full journal */}
        <div className="mt-6 pt-4 border-t border-border/50 text-center">
          <Link 
            to="/journal" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            View all journal entries
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
