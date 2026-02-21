import { OracleCard } from "@/data/oracleCards";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { CardDetail } from "./CardDetail";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface CardDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: OracleCard | null;
  deckId?: string;
  hideActions?: boolean;
}

const CardDetailDialog = ({ open, onOpenChange, card, deckId = "", hideActions = false }: CardDetailDialogProps) => {
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <VisuallyHidden>
          <DialogTitle>{card.card_title}</DialogTitle>
        </VisuallyHidden>
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
