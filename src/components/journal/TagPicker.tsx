import { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useJournalTags, useCreateTag, type JournalTag } from '@/hooks/useJournalTags';

interface TagPickerProps {
  selectedTagIds: string[];
  onTagToggle: (tagId: string) => void;
  onCreateTag?: (name: string) => Promise<JournalTag>;
  className?: string;
}

const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export default function TagPicker({
  selectedTagIds,
  onTagToggle,
  onCreateTag,
  className,
}: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: tags = [] } = useJournalTags();
  const createTag = useCreateTag();

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
  const availableTags = tags.filter((tag) => !selectedTagIds.includes(tag.id));

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setIsCreating(true);
    try {
      const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      const newTag = await createTag.mutateAsync({ name: newTagName.trim(), color: randomColor });
      if (onCreateTag) {
        await onCreateTag(newTagName.trim());
      } else {
        onTagToggle(newTag.id);
      }
      setNewTagName('');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Selected tags */}
      {selectedTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="cursor-pointer pr-1"
          style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined }}
        >
          <span style={{ color: tag.color || undefined }}>{tag.name}</span>
          <button
            onClick={() => onTagToggle(tag.id)}
            className="ml-1 rounded-full hover:bg-muted p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Add tag button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          {/* Create new tag */}
          <div className="flex gap-1 mb-2">
            <Input
              placeholder="New tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateTag();
                }
              }}
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              className="h-8 px-2"
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || isCreating}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Available tags */}
          {availableTags.length > 0 && (
            <div className="border-t pt-2 mt-2 max-h-40 overflow-y-auto space-y-1">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    onTagToggle(tag.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tag.color || '#888' }}
                  />
                  <span className="flex-1">{tag.name}</span>
                  {selectedTagIds.includes(tag.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}

          {availableTags.length === 0 && !newTagName && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Type to create a new tag
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
