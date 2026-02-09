import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Trash2, Replace, Maximize2, Minimize2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SelectableImageProps extends NodeViewProps {
  onReplace?: (file: File) => Promise<string | null>;
}

const sizeOptions = [
  { label: 'Small', value: '25%', width: '25%' },
  { label: 'Medium', value: '50%', width: '50%' },
  { label: 'Large', value: '75%', width: '75%' },
  { label: 'Full Width', value: '100%', width: '100%' },
];

const SelectableImage = ({ node, selected, deleteNode, updateAttributes }: SelectableImageProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);

  // Get current width or default to 100%
  const currentWidth = node.attrs.width || '100%';

  const handleReplace = () => {
    fileInputRef.current?.click();
  };

  const handleSizeChange = (width: string) => {
    updateAttributes({ width });
    setSizeMenuOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Images must be under 10MB.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Compress images before upload
      const { compressImage, isCompressibleImage } = await import('@/lib/imageCompression');
      const processedFile = isCompressibleImage(file) ? await compressImage(file) : file;

      const fileExt = processedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(fileName, processedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('content-images')
        .getPublicUrl(fileName);

      // Update the image src
      updateAttributes({ src: publicUrl });

      toast({
        title: 'Image replaced',
        description: 'The image has been updated.',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image.',
        variant: 'destructive',
      });
    }

    // Reset input
    e.target.value = '';
  };

  // Find current size label
  const currentSizeLabel = sizeOptions.find(s => s.width === currentWidth)?.label || 'Custom';

  return (
    <NodeViewWrapper className="relative my-4" style={{ width: currentWidth }}>
      <div
        className={`relative group transition-all ${
          selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg' : ''
        }`}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || 'Content image'}
          title={node.attrs.title || ''}
          className="w-full h-auto rounded-md cursor-pointer"
          draggable={false}
        />
        
        {/* Overlay controls - visible on hover or when selected */}
        <div
          className={`absolute top-2 right-2 flex gap-1 transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {/* Size dropdown */}
          <DropdownMenu open={sizeMenuOpen} onOpenChange={setSizeMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 px-2 bg-background/90 hover:bg-background shadow-md text-xs gap-1"
                title="Resize image"
              >
                <Maximize2 className="h-3 w-3" />
                {currentSizeLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[120px]">
              {sizeOptions.map((size) => (
                <DropdownMenuItem
                  key={size.value}
                  onClick={() => handleSizeChange(size.width)}
                  className={currentWidth === size.width ? 'bg-primary/10 text-primary' : ''}
                >
                  {size.label} ({size.value})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0 bg-background/90 hover:bg-background shadow-md"
            onClick={handleReplace}
            title="Replace image"
          >
            <Replace className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8 w-8 p-0 shadow-md"
            onClick={deleteNode}
            title="Delete image"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Selection hint */}
        {selected && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Delete</kbd> to remove
          </div>
        )}
      </div>

      {/* Hidden file input for replace */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </NodeViewWrapper>
  );
};

export default SelectableImage;
