import { OracleCard } from "@/data/oracleCards";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { CardDetail } from "./CardDetail";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";

interface CardDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: OracleCard | null;
  deckId?: string;
  hideActions?: boolean;
  showBackToSpread?: boolean;
}

const CardDetailDialog = ({ open, onOpenChange, card, deckId = "", hideActions = false, showBackToSpread = false }: CardDetailDialogProps) => {
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <VisuallyHidden>
          <DialogTitle>{card.card_title}</DialogTitle>
        </VisuallyHidden>
        {showBackToSpread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="absolute left-4 top-4 z-10 gap-1.5 text-muted-foreground hover:text-foreground text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Spread
          </Button>
        )}
        <CardDetail
          card={card}
          onDrawAnother={() => onOpenChange(false)}
          hasPremiumAccess={false}
          isStarterDeck={false}
          deckId={deckId}
          hideActions={hideActions}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CardDetailDialog;
