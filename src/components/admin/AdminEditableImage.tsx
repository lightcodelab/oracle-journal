import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { Images, Loader2, Pencil, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ImageLibraryDialog from '@/components/admin/ImageLibraryDialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AdminEditableImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  imageKey?: string;
  onSave?: (url: string) => Promise<void>;
  wrapperClassName?: string;
  pencilAlwaysVisible?: boolean;
}

const stopInteraction = (event: React.SyntheticEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

export function AdminEditableImage({
  src,
  imageKey,
  onSave,
  wrapperClassName,
  pencilAlwaysVisible,
  className,
  alt = '',
  ...imageProps
}: AdminEditableImageProps) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setCurrentSrc(src), [src]);

  useEffect(() => {
    if (!imageKey) return;
    let active = true;
    void supabase
      .from('site_images')
      .select('image_url')
      .eq('image_key', imageKey)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.image_url) setCurrentSrc(data.image_url);
      });
    return () => {
      active = false;
    };
  }, [imageKey]);

  const save = async (url: string) => {
    const previous = currentSrc;
    setCurrentSrc(url);
    setSaving(true);
    try {
      if (onSave) {
        await onSave(url);
      } else if (imageKey) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('site_images').upsert({
          image_key: imageKey,
          image_url: url,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        });
        if (error) throw error;
      }
      toast({ title: 'Image updated', description: 'The new artwork is now shown across the site.' });
    } catch (error) {
      setCurrentSrc(previous);
      toast({
        title: 'Image not updated',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Choose an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Image is too large', description: 'Choose an image under 10MB.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { compressImage, isCompressibleImage } = await import('@/lib/imageCompression');
      const processed = isCompressibleImage(file) ? await compressImage(file) : file;
      const extension = processed.name.split('.').pop() || 'webp';
      const fileName = `site-${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('content-images').upload(fileName, processed);
      if (error) throw error;
      const url = supabase.storage.from('content-images').getPublicUrl(fileName).data.publicUrl;
      await save(url);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      setSaving(false);
    }
  };

  return (
    <div className={cn('group/admin-image relative', wrapperClassName)}>
      <img src={currentSrc} alt={alt} className={className} {...imageProps} />
      {isAdmin && (imageKey || onSave) ? (
        <div
          className={cn(
            'pointer-events-auto absolute right-2 top-2 z-30',
            pencilAlwaysVisible
              ? 'opacity-100'
              : 'opacity-100 transition-opacity sm:opacity-0 sm:group-hover/admin-image:opacity-100 sm:group-focus-within/admin-image:opacity-100',
          )}
          onClick={stopInteraction}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-9 w-9 border border-border bg-background/95 shadow-md"
                aria-label={`Change ${alt || 'image'}`}
                title="Change image"
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => window.setTimeout(() => fileInputRef.current?.click(), 0)}>
                <Upload className="mr-2 h-4 w-4" /> Upload replacement
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLibraryOpen(true)}>
                <Images className="mr-2 h-4 w-4" /> Choose from library
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
      {isAdmin ? (
        <div onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} className="contents">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = '';
            }}
          />
          <ImageLibraryDialog open={libraryOpen} onOpenChange={setLibraryOpen} onSelect={(url) => void save(url)} />
        </div>
      ) : null}
    </div>
  );
}