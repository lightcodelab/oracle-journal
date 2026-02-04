import { useState } from 'react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  Pin, 
  Trash2, 
  MoreHorizontal, 
  ChevronRight,
  FileText,
  BookOpen,
  Layers,
  Sparkles,
  FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { JournalEntry } from '@/hooks/useJournalEntries';
import { useJournalCategories } from '@/hooks/useJournalCategories';

interface JournalEntryCardProps {
  entry: JournalEntry;
  onSelect: (entry: JournalEntry) => void;
  onPin?: (id: string, isPinned: boolean) => void;
  onDelete?: (id: string) => void;
  onAddCategory?: (entryId: string, categoryId: string) => void;
  entryCategories?: string[];
  isSelected?: boolean;
}

const getContextIcon = (contextType: string | null) => {
  switch (contextType) {
    case 'card':
      return <Sparkles className="h-3 w-3" />;
    case 'lesson':
      return <BookOpen className="h-3 w-3" />;
    case 'course':
      return <Layers className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
};

const formatRelativeDate = (dateString: string) => {
  const date = parseISO(dateString);
  if (isToday(date)) return format(date, "'Today at' h:mm a");
  if (isYesterday(date)) return format(date, "'Yesterday at' h:mm a");
  if (isThisWeek(date)) return format(date, "EEEE 'at' h:mm a");
  if (isThisMonth(date)) return format(date, "MMM d 'at' h:mm a");
  return format(date, "MMM d, yyyy");
};

export default function JournalEntryCard({
  entry,
  onSelect,
  onPin,
  onDelete,
  onAddCategory,
  entryCategories = [],
  isSelected = false,
}: JournalEntryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { data: categories = [] } = useJournalCategories();

  const title = entry.title || entry.content_text?.slice(0, 50) || 'Untitled Entry';
  const preview = entry.content_text?.slice(0, 150) || '';

  const hasActions = onPin || onDelete || onAddCategory;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative p-4 rounded-lg border cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border hover:border-primary/50 hover:shadow-sm bg-card'
      )}
      onClick={() => onSelect(entry)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Pin indicator */}
      {entry.is_pinned && (
        <div className="absolute -top-1 -right-1">
          <Pin className="h-4 w-4 text-primary fill-primary" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-muted-foreground">
            {getContextIcon(entry.context_type)}
          </span>
          <h3 className="font-medium text-foreground truncate">{title}</h3>
        </div>

        {/* Actions - Always visible */}
        {hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 p-0 transition-opacity",
                  isHovered || isSelected ? "opacity-100" : "opacity-50"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onPin && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onPin(entry.id, !entry.is_pinned);
                  }}
                >
                  <Pin className="h-4 w-4 mr-2" />
                  {entry.is_pinned ? 'Unpin' : 'Pin'} Entry
                </DropdownMenuItem>
              )}
              
              {onAddCategory && categories.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Add to Category
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    {categories.map((category) => {
                      const isInCategory = entryCategories.includes(category.id);
                      return (
                        <DropdownMenuItem
                          key={category.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isInCategory) {
                              onAddCategory(entry.id, category.id);
                            }
                          }}
                          disabled={isInCategory}
                          className={isInCategory ? 'opacity-50' : ''}
                        >
                          {category.emoji && <span className="mr-2">{category.emoji}</span>}
                          {category.name}
                          {isInCategory && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(entry.id);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Entry
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Preview text */}
      {preview && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {preview}...
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{formatRelativeDate(entry.captured_at)}</span>
          {entry.context_title && (
            <>
              <span>·</span>
              <Badge variant="outline" className="text-xs font-normal">
                {entry.context_title}
              </Badge>
            </>
          )}
        </div>
        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  );
}
