import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CardBack } from "./CardBack";
import { ShoppingBag, ChevronLeft } from "lucide-react";
import sacredRewriteCardBack from "@/assets/card-back-v2.png";
import mnlCardBack from "@/assets/mnl-card-back.png";
import areekeeraCardBack from "@/assets/areekeera-card-back.png";
import taoshCardBack from "@/assets/taosh-card-back.png";
import type { OracleCard } from "@/data/oracleCards";

interface StarterCardSpreadProps {
  cards: OracleCard[];
  onSelectCard: (card: OracleCard) => void;
  onBackToDecks: () => void;
  viewedCardIds: string[];
  canReadToday: boolean;
  onBuyDecks: () => void;
}

export const StarterCardSpread = ({ 
  cards, 
  onSelectCard, 
  onBackToDecks,
  viewedCardIds,
  canReadToday,
  onBuyDecks
}: StarterCardSpreadProps) => {
  
  // Get the appropriate card back image based on deck name
  const getCardBackForDeck = (deckName: string | null | undefined) => {
    if (!deckName) return sacredRewriteCardBack;
    
    if (deckName.toLowerCase().includes('magic not logic')) {
      return mnlCardBack;
    }
    if (deckName.toLowerCase().includes('areekeera')) {
      return areekeeraCardBack;
    }
    if (deckName.toLowerCase().includes('art of self-healing')) {
      return taoshCardBack;
    }
    
    return sacredRewriteCardBack;
  };

  // Get deck badge color based on deck name
  const getDeckBadgeClass = (deckName: string | null | undefined) => {
    if (!deckName) return "bg-primary/80 text-primary-foreground";
    if (deckName === 'The Sacred Rewrite') return "bg-purple-600/80 text-white";
    if (deckName === 'Magic not Logic') return "bg-indigo-600/80 text-white";
    if (deckName === 'AreekeerA') return "bg-emerald-600/80 text-white";
    if (deckName === 'The Art of Self-Healing') return "bg-amber-600/80 text-white";
    return "bg-primary/80 text-primary-foreground";
  };

  const isCardViewed = (cardId: string) => viewedCardIds.includes(cardId);
  const allCardsViewed = cards.every(card => isCardViewed(card.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center space-y-8 max-w-4xl mx-auto min-h-[80vh] flex flex-col justify-center py-8"
    >
      <Button
        onClick={onBackToDecks}
        variant="ghost"
        className="absolute top-4 left-4"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Decks
      </Button>

      <div className="space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground">
          Your Starter Reading
        </h1>
        <p className="text-lg text-foreground/70 max-w-xl mx-auto">
          Select a card to reveal its wisdom. You can explore all three cards from your daily reading.
        </p>
      </div>

      {!canReadToday && (
        <div className="bg-muted/50 border border-border rounded-lg p-4 max-w-md mx-auto">
          <p className="text-foreground/80">
            You've already had your free reading today. Come back tomorrow for a new spread, or purchase a deck for unlimited access.
          </p>
        </div>
      )}

      {/* Three Card Spread */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-8 py-8">
        {cards.map((card, index) => {
          const viewed = isCardViewed(card.id);
          
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30, rotate: -5 + index * 5 }}
              animate={{ opacity: 1, y: 0, rotate: -5 + index * 5 }}
              transition={{ delay: index * 0.2, duration: 0.5 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                className={`relative w-48 h-64 md:w-56 md:h-72 cursor-pointer ${!canReadToday && !viewed ? 'opacity-50 cursor-not-allowed' : ''}`}
                whileHover={canReadToday || viewed ? { scale: 1.05, rotate: 0 } : {}}
                whileTap={canReadToday || viewed ? { scale: 0.98 } : {}}
                onClick={() => (canReadToday || viewed) && onSelectCard(card)}
              >
                {viewed ? (
                  // Show card front if viewed
                  <div className="relative w-full h-full">
                    <img 
                      src={`/cards/${card.image_file_name}`} 
                      alt={card.card_title}
                      className="w-full h-full object-cover rounded-xl border-2 border-accent/50 shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black/10 rounded-xl" />
                    <Badge className="absolute top-2 right-2 bg-green-600/90 text-white text-xs">
                      Viewed
                    </Badge>
                  </div>
                ) : (
                  // Show card back if not viewed
                  <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border-2 border-accent/30">
                    <CardBack imageSrc={getCardBackForDeck(card.deck_name)} />
                  </div>
                )}
              </motion.div>
              
              {/* Deck origin badge */}
              <Badge className={`${getDeckBadgeClass(card.deck_name)} text-xs`}>
                {card.deck_name || 'Unknown Deck'}
              </Badge>
              
              {/* Card position label */}
              <span className="text-sm text-foreground/60">
                Card {index + 1}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Status message */}
      {allCardsViewed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <p className="text-foreground/80 text-lg">
            You've explored all three cards from your daily reading.
          </p>
        </motion.div>
      )}

      {/* Buy Decks Button */}
      <div className="pt-4">
        <Button
          onClick={onBuyDecks}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg shadow-glow"
        >
          <ShoppingBag className="w-5 h-5 mr-2" />
          Buy Full Decks
        </Button>
        <p className="text-sm text-foreground/60 mt-2">
          Get unlimited access to all card content
        </p>
      </div>
    </motion.div>
  );
};
