import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Check, Pencil, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseTag {
  id: string;
  name: string;
  color: string | null;
}

interface CourseTagPickerProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

const CourseTagPicker = ({ selectedTagIds, onChange }: CourseTagPickerProps) => {
  const { toast } = useToast();
  const [tags, setTags] = useState<CourseTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('course_tags')
      .select('*')
      .order('name');
    if (error) {
      toast({ title: 'Error', description: 'Failed to load tags.', variant: 'destructive' });
    } else if (data) {
      setTags(data as CourseTag[]);
    }
    setLoading(false);
  };

  const createTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      const { data, error } = await supabase
        .from('course_tags')
        .insert({ name, color })
        .select()
        .single();
      if (error) throw error;
      const newTag = data as CourseTag;
      setTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
      onChange([...selectedTagIds, newTag.id]);
      setNewTagName('');
      toast({ title: 'Created', description: `Tag "${name}" added.` });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message?.includes('duplicate') ? 'A tag with that name already exists.' : 'Failed to create tag.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const renameTag = async (tagId: string) => {
    const name = editingName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    const { error } = await supabase
      .from('course_tags')
      .update({ name })
      .eq('id', tagId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to rename tag.', variant: 'destructive' });
    } else {
      setTags((prev) =>
        prev.map((t) => (t.id === tagId ? { ...t, name } : t)).sort((a, b) => a.name.localeCompare(b.name))
      );
      toast({ title: 'Renamed', description: 'Tag updated.' });
    }
    setEditingId(null);
  };

  const deleteTag = async (tagId: string) => {
    const { error } = await supabase.from('course_tags').delete().eq('id', tagId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete tag.', variant: 'destructive' });
    } else {
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      onChange(selectedTagIds.filter((id) => id !== tagId));
      toast({ title: 'Deleted', description: 'Tag removed.' });
    }
  };

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <div className="flex flex-wrap items-center gap-2">
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="pr-1"
            style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined }}
          >
            <span style={{ color: tag.color || undefined }}>{tag.name}</span>
            <button
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="ml-1 rounded-full hover:bg-muted p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              {selectedTags.length === 0 ? 'Add Tag' : 'Manage'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="start">
            <div className="flex gap-1 mb-2">
              <Input
                placeholder="New tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    createTag();
                  }
                }}
                className="h-8 text-sm"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 px-2"
                onClick={createTag}
                disabled={!newTagName.trim() || creating}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            <div className="border-t pt-2 mt-2 max-h-64 overflow-y-auto space-y-1">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : tags.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No tags yet. Create one above.
                </p>
              ) : (
                tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  const isEditing = editingId === tag.id;
                  return (
                    <div
                      key={tag.id}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted',
                        isSelected && 'bg-muted/60'
                      )}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color || '#888' }}
                      />
                      {isEditing ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              renameTag(tag.id);
                            }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={() => renameTag(tag.id)}
                          autoFocus
                          className="h-6 flex-1 text-sm"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className="flex-1 text-left"
                        >
                          {tag.name}
                        </button>
                      )}
                      {isSelected && !isEditing && (
                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setEditingId(tag.id);
                          setEditingName(tag.name);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete tag "{tag.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the tag from all courses it's assigned to. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTag(tag.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default CourseTagPicker;
