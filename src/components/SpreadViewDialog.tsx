import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Sparkles } from "lucide-react";
import { SPREAD_TYPES } from "./SpreadSelection";
import CardDetailDialog from "./CardDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import type { OracleCard } from "@/data/oracleCards";

interface SpreadCardData {
  position: string;
  card_id: string;
  card_title: string;
  deck_name: string | null;
  image_file_name: string | null;
  card_number: number;
}

interface SpreadViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spreadType: string;
  spreadName: string;
  spreadCards: SpreadCardData[];
  savedAt?: string;
}

const getDeckBadgeClass = (deckName: string | null | undefined) => {
  if (!deckName) return "bg-primary/80 text-primary-foreground";
  if (deckName === 'The Sacred Rewrite') return "bg-purple-600/80 text-white";
  if (deckName === 'Magic not Logic') return "bg-indigo-600/80 text-white";
  if (deckName === 'AreekeerA') return "bg-emerald-600/80 text-white";
  if (deckName === 'The Art of Self-Healing') return "bg-amber-600/80 text-white";
  return "bg-primary/80 text-primary-foreground";
};

const SpreadViewDialog = ({ open, onOpenChange, spreadType, spreadName, spreadCards, savedAt }: SpreadViewDialogProps) => {
  const [selectedCard, setSelectedCard] = useState<OracleCard | null>(null);
  const [cardDetailOpen, setCardDetailOpen] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);

  const spreadDef = SPREAD_TYPES.find(s => s.id === spreadType);

  const handleCardClick = async (cardData: SpreadCardData) => {
    setLoadingCard(true);
    try {
      const { data } = await supabase
        .from('cards')
        .select('*, decks(name)')
        .eq('id', cardData.card_id)
        .single();

      if (data) {
        const fullCard = {
          ...data,
          deck_name: data.deck_name || data.decks?.name || cardData.deck_name,
          content_sections: (data.content_sections as Record<string, any>) || null,
        } as OracleCard;
        setSelectedCard(fullCard);
        setCardDetailOpen(true);
      }
    } catch (err) {
      console.error('Error fetching card:', err);
    }
    setLoadingCard(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogTitle className="font-serif text-2xl text-center flex items-center justify-center gap-2">
            {spreadDef?.icon}
            {spreadName}
          </DialogTitle>

          {savedAt && (
            <p className="text-center text-sm text-muted-foreground">
              {new Date(savedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-6 md:gap-8 py-6">
            {spreadCards.map((cardData, index) => (
              <motion.div
                key={cardData.card_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center gap-3"
              >
                <span className="text-sm font-serif text-primary font-semibold tracking-wide uppercase">
                  {cardData.position}
                </span>

                <motion.div
                  className="relative w-36 h-52 md:w-44 md:h-60 cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCardClick(cardData)}
                >
                  {cardData.image_file_name ? (
                    <img
                      src={`/cards/${cardData.image_file_name}`}
                      alt={cardData.card_title}
                      className="w-full h-full object-cover rounded-xl border-2 border-accent/50 shadow-lg"
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 border-2 border-accent/30 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-primary/50" />
                    </div>
                  )}
                  {loadingCard && (
                    <div className="absolute inset-0 bg-background/50 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  )}
                </motion.div>

                <p className="text-sm font-serif text-foreground text-center max-w-[10rem] truncate">
                  {cardData.card_title}
                </p>
                <Badge className={`${getDeckBadgeClass(cardData.deck_name)} text-xs`}>
                  {cardData.deck_name || 'Unknown'}
                </Badge>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground italic">
            Select any card to explore its full wisdom.
          </p>
        </DialogContent>
      </Dialog>

      <CardDetailDialog
        open={cardDetailOpen}
        onOpenChange={setCardDetailOpen}
        card={selectedCard}
        hideActions
        showBackToSpread
      />
    </>
  );
};

export default SpreadViewDialog;
