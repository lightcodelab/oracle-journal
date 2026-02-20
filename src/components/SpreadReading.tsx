import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Sparkles } from "lucide-react";
import type { SpreadType } from "./SpreadSelection";
import type { OracleCard } from "@/data/oracleCards";

interface SpreadReadingProps {
  spread: SpreadType;
  cards: OracleCard[];
  onSelectCard: (card: OracleCard, positionIndex: number) => void;
  onBackToDecks: () => void;
  revealedPositions: number[];
}

const getDeckBadgeClass = (deckName: string | null | undefined) => {
  if (!deckName) return "bg-primary/80 text-primary-foreground";
  if (deckName === 'The Sacred Rewrite') return "bg-purple-600/80 text-white";
  if (deckName === 'Magic not Logic') return "bg-indigo-600/80 text-white";
  if (deckName === 'AreekeerA') return "bg-emerald-600/80 text-white";
  if (deckName === 'The Art of Self-Healing') return "bg-amber-600/80 text-white";
  return "bg-primary/80 text-primary-foreground";
};

export const SpreadReading = ({
  spread,
  cards,
  onSelectCard,
  onBackToDecks,
  revealedPositions,
}: SpreadReadingProps) => {
  const allRevealed = revealedPositions.length === spread.cardCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center space-y-8 max-w-5xl mx-auto min-h-[80vh] flex flex-col justify-center py-8"
    >
      <Button
        onClick={onBackToDecks}
        variant="ghost"
        className="absolute top-4 left-4"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back
      </Button>

      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 text-primary/60">
          {spread.icon}
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
          {spread.name}
        </h1>
        <p className="text-base text-foreground/70 max-w-xl mx-auto">
          {spread.description}
        </p>
        {!allRevealed && (
          <p className="text-sm text-muted-foreground">
            Select each card to reveal its message
          </p>
        )}
      </div>

      {/* Card Spread Layout */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-8 py-8">
        {cards.map((card, index) => {
          const isRevealed = revealedPositions.includes(index);
          const positionLabel = spread.positions[index] || `Card ${index + 1}`;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30, rotate: -3 + index * 2 }}
              animate={{ opacity: 1, y: 0, rotate: -3 + index * 2 }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="flex flex-col items-center gap-3"
            >
              {/* Position label above */}
              <span className="text-sm font-serif text-primary font-semibold tracking-wide uppercase">
                {positionLabel}
              </span>

              <motion.div
                className="relative w-40 h-56 md:w-48 md:h-64 cursor-pointer"
                whileHover={{ scale: 1.05, rotate: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectCard(card, index)}
              >
                <AnimatePresence mode="wait">
                  {isRevealed ? (
                    <motion.div
                      key="front"
                      initial={{ rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      transition={{ duration: 0.4 }}
                      className="relative w-full h-full"
                    >
                      <img
                        src={`/cards/${card.image_file_name}`}
                        alt={card.card_title}
                        className="w-full h-full object-cover rounded-xl border-2 border-accent/50 shadow-lg"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="back"
                      className="w-full h-full rounded-xl overflow-hidden shadow-lg border-2 border-accent/30 bg-gradient-to-br from-muted via-muted/80 to-muted"
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-primary/30" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Deck origin badge */}
              {isRevealed && (
                <Badge className={`${getDeckBadgeClass(card.deck_name)} text-xs`}>
                  {card.deck_name || 'Unknown Deck'}
                </Badge>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* All revealed message */}
      {allRevealed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          <p className="text-foreground/70 text-sm italic">
            All cards revealed. Select any card to explore its full wisdom.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};
