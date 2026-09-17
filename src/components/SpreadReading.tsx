import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Bookmark, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { REMEMBRANCE_REFLECTION_QUESTIONS } from "@/lib/remembranceThemes";
import type { SpreadType } from "./SpreadSelection";
import type { OracleCard } from "@/data/oracleCards";

export type SpreadJournalAnswers = {
  asking_to_be_seen: string;
  invited_to_shift: string;
  how_i_will_live_it: string;
};

interface SpreadReadingProps {
  spread: SpreadType;
  cards: OracleCard[];
  onSelectCard: (card: OracleCard, positionIndex: number) => void;
  onBackToDecks: () => void;
  revealedPositions: number[];
  onSaveSpread?: () => void;
  saving?: boolean;
  generatedReading?: string | null;
  generating?: boolean;
  generationError?: string | null;
  onRetryGeneration?: () => void;
  journalAnswers?: SpreadJournalAnswers;
  onJournalAnswerChange?: (key: keyof SpreadJournalAnswers, value: string) => void;
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
  onSaveSpread,
  saving = false,
  generatedReading,
  generating = false,
  generationError,
  onRetryGeneration,
  journalAnswers,
  onJournalAnswerChange,
}: SpreadReadingProps) => {
  const allRevealed = revealedPositions.length === spread.cardCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center space-y-8 max-w-5xl mx-auto min-h-[80vh] flex flex-col justify-center py-8"
    >

      <div className="w-full flex justify-start">
        <Button
          variant="outline"
          onClick={onBackToDecks}
          className="font-sans"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Spreads
        </Button>
      </div>

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

      {/* All revealed shared reading + save button */}
      {allRevealed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {generating && (
            <div className="border-y border-border py-8" role="status">
              <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin text-primary" />
              <p className="font-serif text-lg text-foreground">Your shared reading is being written…</p>
              <p className="mt-1 text-sm text-muted-foreground">The common thread between your cards is coming into view.</p>
            </div>
          )}
          {generationError && !generating && (
            <div className="border-y border-destructive/40 py-6 space-y-3" role="alert">
              <p className="text-sm text-destructive">{generationError}</p>
              {onRetryGeneration && (
                <Button variant="outline" onClick={onRetryGeneration}>
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </Button>
              )}
            </div>
          )}
          {generatedReading && !generating && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto border-y border-border py-8 text-left"
              aria-labelledby="shared-reading-title"
            >
              <div className="flex items-center justify-center gap-2 mb-5 text-primary">
                <Sparkles className="w-4 h-4" />
                <h2 id="shared-reading-title" className="font-serif text-2xl text-foreground">Your Card Reading</h2>
              </div>
              <div className="whitespace-pre-line font-serif text-base sm:text-lg leading-8 text-foreground/85">
                {generatedReading}
              </div>
            </motion.section>
          )}
          {generatedReading && journalAnswers && onJournalAnswerChange && (
            <section
              aria-labelledby="spread-journal-title"
              className="max-w-3xl mx-auto rounded-xl border border-border bg-card p-5 sm:p-6 text-left"
            >
              <h2 id="spread-journal-title" className="font-serif text-xl text-foreground">
                Write with this reading
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Private to you. Your writing is saved with the cards and your reading.
              </p>

              <div className="mt-5 space-y-5">
                {REMEMBRANCE_REFLECTION_QUESTIONS.map((q) => (
                  <div key={q.key}>
                    <label htmlFor={`spread-${q.key}`} className="block font-serif text-base text-foreground">
                      {q.label}
                    </label>
                    <p className="mt-0.5 text-xs text-muted-foreground">{q.help}</p>
                    <Textarea
                      id={`spread-${q.key}`}
                      value={journalAnswers[q.key]}
                      onChange={(e) => onJournalAnswerChange(q.key, e.target.value)}
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
          {generatedReading && <p className="text-foreground/70 text-sm italic">Select any card to explore its full wisdom.</p>}
          {generatedReading && onSaveSpread && (
            <Button
              onClick={onSaveSpread}
              disabled={saving}
              className="font-sans"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save This Reading
                </>
              )}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};
