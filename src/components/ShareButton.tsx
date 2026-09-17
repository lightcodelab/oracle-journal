import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface ShareButtonProps {
  title: string;
  /** Optional explicit URL. Defaults to the current page URL. */
  url?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Share the current page with a friend. Uses the native share sheet on
 * mobile (Messages, Messenger, Mail, etc.) and falls back to copying the
 * link. The link points at the members-only page, so recipients are asked
 * to sign in before they can view it.
 */
const ShareButton = ({
  title,
  url,
  label = 'Share',
  className,
  variant = 'outline',
  size = 'sm',
}: ShareButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = url || window.location.href;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch (err) {
        // User cancelled the share sheet, or sharing is unavailable.
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link copied',
        description: 'Paste it into a message or email. Your friend will be asked to sign in.',
      });
    } catch {
      toast({
        title: 'Could not copy the link',
        description: shareUrl,
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={className}
      aria-label={`Share ${title}`}
    >
      {copied ? <Check className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
      {copied ? 'Copied' : label}
    </Button>
  );
};

export default ShareButton;
