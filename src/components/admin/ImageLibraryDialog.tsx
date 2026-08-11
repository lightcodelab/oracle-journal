import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const BUCKETS = ['content-images', 'content-thumbnails', 'healing-resource-images'] as const;

interface StoredImage {
  bucket: string;
  name: string;
  url: string;
  createdAt: string;
}

interface ImageLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}

export default function ImageLibraryDialog({ open, onOpenChange, onSelect }: ImageLibraryDialogProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<StoredImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        BUCKETS.map(async (bucket) => {
          const { data, error } = await supabase.storage
            .from(bucket)
            .list('', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });
          if (error) return [] as StoredImage[];
          return (data || [])
            .filter((f) => f.id && /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(f.name))
            .map((f) => ({
              bucket,
              name: f.name,
              url: supabase.storage.from(bucket).getPublicUrl(f.name).data.publicUrl,
              createdAt: (f as any).created_at || '',
            }));
        })
      );
      const flat = results.flat().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setImages(flat);
    } catch (error: any) {
      toast({
        title: 'Could not load image library',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelected(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = images.filter((img) =>
    query ? img.name.toLowerCase().includes(query.toLowerCase()) : true
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Image library</DialogTitle>
          <DialogDescription>
            Every image previously uploaded, whether or not it is attached to a resource.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by file name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="button" variant="outline" size="icon" onClick={load} title="Refresh">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        <ScrollArea className="h-[420px] pr-2">
          {loading && images.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No images found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((img) => (
                <button
                  type="button"
                  key={`${img.bucket}/${img.name}`}
                  onClick={() => setSelected(img.url)}
                  onDoubleClick={() => {
                    onSelect(img.url);
                    onOpenChange(false);
                  }}
                  className={cn(
                    'group overflow-hidden rounded-md border text-left transition-colors',
                    selected === img.url ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="aspect-square w-full bg-muted">
                    <img
                      src={img.url}
                      alt={img.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="truncate px-2 py-1 text-xs text-muted-foreground">{img.name}</p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onSelect(selected);
                onOpenChange(false);
              }
            }}
          >
            Insert image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}