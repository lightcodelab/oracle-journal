import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  const [isOpen, setIsOpen] = useState(false);
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
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Journal Reflections</span>
              {entries.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {entries.length}
                </span>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4">
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
                  variant="ghost"
                  className="w-full border border-dashed border-border hover:border-primary/50 mb-4"
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
                  <div className="text-center py-6 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No reflections yet.</p>
                    <p className="text-xs mt-1">Add one to capture your thoughts.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
