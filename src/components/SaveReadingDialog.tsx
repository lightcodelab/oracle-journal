import { useState } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { OracleCard } from '@/data/oracleCards';

interface SaveReadingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: OracleCard;
  deckId: string;
}

const SaveReadingDialog = ({ open, onOpenChange, card, deckId }: SaveReadingDialogProps) => {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to save your reading.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('saved_readings')
        .insert({
          user_id: session.user.id,
          card_id: card.id,
          deck_id: deckId,
          card_title: card.card_title,
          deck_name: card.deck_name || null,
          image_file_name: card.image_file_name || null,
          notes: notes.trim() || null,
          saved_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving reading:', error);
        toast({
          title: 'Error',
          description: 'Failed to save your reading. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Reading Saved',
          description: 'Your reading has been saved to My Readings.',
        });
        setNotes('');
        onOpenChange(false);
      }
    } catch (err) {
      console.error('Error saving reading:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Save This Reading
          </DialogTitle>
          <DialogDescription>
            Save "{card.card_title}" to your readings collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Card Preview */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            {card.image_file_name ? (
              <img
                src={`/cards/${card.image_file_name}`}
                alt={card.card_title}
                className="w-16 h-20 object-cover rounded-md border border-border"
              />
            ) : (
              <div className="w-16 h-20 bg-gradient-to-br from-purple-600 to-pink-500 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">{card.card_number}</span>
              </div>
            )}
            <div>
              <p className="font-medium text-foreground">{card.card_title}</p>
              {card.deck_name && (
                <p className="text-sm text-muted-foreground">{card.deck_name}</p>
              )}
            </div>
          </div>

          {/* Notes Input */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any thoughts or reflections about this reading..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 mr-2" />
                Save Reading
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveReadingDialog;
