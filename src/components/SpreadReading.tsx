import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, RefreshCw, ArrowLeft, Check } from "lucide-react";
import type { SpreadType } from "./SpreadSelection";
import type { OracleCard } from "@/data/oracleCards";
import { cardImageSrc } from "@/lib/cardImage";
import { useCardImagesReady } from "@/hooks/useCardImagesReady";
import { ReadingReflectionPhases } from "@/components/ReadingReflectionPhases";

export type SpreadJournalAnswers = {
  asking_to_be_seen: string;
  invited_to_shift: string;
  how_i_will_live_it: string;
  invited_to_return: string;
  guiding_question: string;
  pattern_location: string;
  old_evidence: string;
  new_evidence: string;
  todays_choice: string;
  returned_evidence: string;
  regulation_experience: string;
  protection_prediction: string;
};

export const EMPTY_SPREAD_JOURNAL_ANSWERS: SpreadJournalAnswers = {
  asking_to_be_seen: "",
  invited_to_shift: "",
  how_i_will_live_it: "",
  invited_to_return: "",
  guiding_question: "",
  pattern_location: "",
  old_evidence: "",
  new_evidence: "",
  todays_choice: "",
  returned_evidence: "",
  regulation_experience: "",
  protection_prediction: "",
};

interface SpreadReadingProps {
  spread: SpreadType;
  cards: OracleCard[];
  onSelectCard: (card: OracleCard, positionIndex: number) => void;
  onBackToDecks: () => void;
  revealedPositions: number[];
  generatedReading?: string | null;
  generating?: boolean;
  generationError?: string | null;
  onRetryGeneration?: () => void;
  journalAnswers?: SpreadJournalAnswers;
  onJournalAnswerChange?: (key: keyof SpreadJournalAnswers, value: string) => void;
  ritualAction?: ReactNode;
  saved?: boolean;
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
  generatedReading,
  generating = false,
  generationError,
  onRetryGeneration,
  journalAnswers,
  onJournalAnswerChange,
  ritualAction,
  saved,
}: SpreadReadingProps) => {
  const allRevealed = revealedPositions.length === spread.cardCount;
  const images = useCardImagesReady(cards.map((card) => cardImageSrc(card.image_file_name)));

  if (!images.ready) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4" role="status" aria-busy={!images.error}>
        <p className="font-serif text-2xl text-foreground/80">{images.error || 'Preparing your cards…'}</p>
        {images.error && <Button variant="outline" onClick={images.retry}><RefreshCw className="w-4 h-4" />Try again</Button>}
        <Button variant="ghost" onClick={onBackToDecks}><ArrowLeft className="w-4 h-4" />Back to Spreads</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center space-y-8 max-w-5xl mx-auto min-h-[80vh] flex flex-col justify-center py-8"
    >

      <div className="w-full flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={onBackToDecks}
          className="font-sans"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Spreads
        </Button>
        {ritualAction}
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
        <ol className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground font-sans">
          <li>1. Set your focus</li>
          <li className={!allRevealed ? "text-primary font-semibold" : ""}>2. Reveal your cards</li>
          <li className={allRevealed ? "text-primary font-semibold" : ""}>3. Collect new evidence</li>
        </ol>
        {!allRevealed && (
          <p className="text-sm text-muted-foreground">
            Click each card to turn it over and reveal its message
          </p>
        )}
        {journalAnswers?.guiding_question?.trim() && (
          <p className="max-w-xl mx-auto font-serif italic text-foreground/75">“{journalAnswers.guiding_question.trim()}”</p>
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
                className="relative w-40 md:w-48 aspect-[7/10] cursor-pointer"
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
                        src={cardImageSrc(card.image_file_name)}
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
          {generatedReading && !generating && saved && (
            <p className="flex items-center justify-center gap-2 text-sm font-sans text-muted-foreground">
              <Check className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Your reading has been saved. Access it again in{" "}
                <Link
                  to="/readings"
                  className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  My Readings
                </Link>
                .
              </span>
            </p>
          )}
          {generatedReading && !generating && journalAnswers && onJournalAnswerChange && (
            <section className="max-w-3xl mx-auto text-left">
              <p className="mb-6 text-sm text-muted-foreground">Private to you. Your writing is saved with the cards and your reading.</p>
              <ReadingReflectionPhases idPrefix="spread" values={journalAnswers} onChange={(key, value) => onJournalAnswerChange(key as keyof SpreadJournalAnswers, value)} />
            </section>
          )}
          {!generating && <p className="text-foreground/70 text-sm italic">Click on any card to explore its full wisdom.</p>}
        </motion.div>
      )}
    </motion.div>
  );
};
