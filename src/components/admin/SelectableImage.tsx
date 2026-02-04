import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Trash2, Replace } from 'lucide-react';
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SelectableImageProps extends NodeViewProps {
  onReplace?: (file: File) => Promise<string | null>;
}

const SelectableImage = ({ node, selected, deleteNode, updateAttributes }: SelectableImageProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReplace = () => {
    fileInputRef.current?.click();
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(fileName, file);

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

  return (
    <NodeViewWrapper className="relative inline-block my-4">
      <div
        className={`relative group transition-all ${
          selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg' : ''
        }`}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || 'Content image'}
          title={node.attrs.title || ''}
          className="max-w-full h-auto rounded-md cursor-pointer"
          draggable={false}
        />
        
        {/* Overlay controls - visible on hover or when selected */}
        <div
          className={`absolute top-2 right-2 flex gap-1 transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
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
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Delete</kbd> or <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Backspace</kbd> to remove
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
