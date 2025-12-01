import { AspectRatio } from "@/components/ui/aspect-ratio";

interface VimeoEmbedProps {
  videoId: string;
  title?: string;
  className?: string;
}

export const VimeoEmbed = ({ videoId, title = "Video", className = "" }: VimeoEmbedProps) => {
  if (!videoId) return null;

  const embedUrl = `https://player.vimeo.com/video/${videoId}`;

  return (
    <div className={`w-full ${className}`}>
      <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title}
        />
      </AspectRatio>
    </div>
  );
};
