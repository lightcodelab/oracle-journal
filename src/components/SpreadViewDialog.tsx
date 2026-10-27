import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Sparkles, Loader2, Save } from "lucide-react";
import { SPREAD_TYPES } from "./SpreadSelection";
import { SPREAD_JOURNAL_QUESTIONS } from "@/lib/remembranceThemes";
import CardDetailDialog from "./CardDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateJournalAnswers } from "@/hooks/useSavedReadings";
import { ReadingReflectionPhases } from "@/components/ReadingReflectionPhases";
import { useMemberState } from "@/hooks/useMemberState";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { OracleCard } from "@/data/oracleCards";
import { cardImageSrc } from "@/lib/cardImage";

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
  readingId?: string;
  spreadType: string;
  spreadName: string;
  spreadCards: SpreadCardData[];
  savedAt?: string;
  generatedReading?: string | null;
  journalAnswers?: Record<string, string> | null;
  onJournalSaved?: (answers: Record<string, string>) => void;
}

const getDeckBadgeClass = (deckName: string | null | undefined) => {
  if (!deckName) return "bg-primary/80 text-primary-foreground";
  if (deckName === 'The Sacred Rewrite') return "bg-purple-600/80 text-white";
  if (deckName === 'Magic not Logic') return "bg-indigo-600/80 text-white";
  if (deckName === 'AreekeerA') return "bg-emerald-600/80 text-white";
  if (deckName === 'The Art of Self-Healing') return "bg-amber-600/80 text-white";
  return "bg-primary/80 text-primary-foreground";
};

const emptyAnswers = () =>
  Object.fromEntries(SPREAD_JOURNAL_QUESTIONS.map((q) => [q.key, ""])) as Record<string, string>;

const SpreadViewDialog = ({ open, onOpenChange, readingId, spreadType, spreadName, spreadCards, savedAt, generatedReading, journalAnswers, onJournalSaved }: SpreadViewDialogProps) => {
  const [selectedCard, setSelectedCard] = useState<OracleCard | null>(null);
  const [cardDetailOpen, setCardDetailOpen] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const [journalDraft, setJournalDraft] = useState<Record<string, string>>(emptyAnswers);
  const updateJournalAnswers = useUpdateJournalAnswers();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasFullTempleAccess, loading: memberLoading } = useMemberState();
  const showJoinButton = Boolean(user) && !memberLoading && !hasFullTempleAccess;

  useEffect(() => {
    if (open) {
      setJournalDraft({ ...emptyAnswers(), ...(journalAnswers || {}) });
    }
  }, [open, readingId, journalAnswers]);

  const journalDirty = Object.keys(journalDraft).some(
    (key) => (journalDraft[key] || "") !== (journalAnswers?.[key] || "")
  );

  const handleSaveJournal = async () => {
    if (!readingId) return;
    try {
      await updateJournalAnswers.mutateAsync({ id: readingId, journalAnswers: journalDraft });
      onJournalSaved?.(journalDraft);
      toast({ title: "Writing Saved", description: "Your reflections have been saved with this reading." });
    } catch {
      toast({ title: "Error", description: "Your writing could not be saved. Please try again.", variant: "destructive" });
    }
  };

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

          {showJoinButton && (
            <div className="mt-2 flex justify-center">
              <Button asChild>
                <Link to="/#membership">Join THE TEMPLE</Link>
              </Button>
            </div>
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
                  className="relative w-36 md:w-44 aspect-[7/10] cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCardClick(cardData)}
                >
                  {cardData.image_file_name ? (
                    <img
                      src={cardImageSrc(cardData.image_file_name)}
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

          {generatedReading && (
            <section className="max-w-3xl mx-auto border-y border-border py-7" aria-labelledby="saved-shared-reading-title">
              <div className="flex items-center justify-center gap-2 mb-5 text-primary">
                <Sparkles className="w-4 h-4" />
                <h2 id="saved-shared-reading-title" className="font-serif text-2xl text-foreground">Your Card Reading</h2>
              </div>
              <div className="whitespace-pre-line font-serif text-base sm:text-lg leading-8 text-foreground/85">
                {generatedReading}
              </div>
              {showJoinButton && (
                <div className="mt-6 flex justify-center">
                  <Button asChild>
                    <Link to="/#membership">Join THE TEMPLE</Link>
                  </Button>
                </div>
              )}
            </section>
          )}

          {readingId && (
            <section className="max-w-3xl mx-auto py-6 mt-4" aria-labelledby="saved-spread-journal-title">
              <h2 id="saved-spread-journal-title" className="font-serif text-xl text-foreground">Write with this reading</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Private to you. You can return and add to your writing at any time.
              </p>
              {journalAnswers?.guiding_question?.trim() && (
                <p className="mt-4 font-serif italic text-foreground/80">Your guiding question: “{journalAnswers.guiding_question.trim()}”</p>
              )}
              <div className="mt-5">
                <ReadingReflectionPhases
                  idPrefix="saved-spread"
                  values={journalDraft}
                  onChange={(key, value) => setJournalDraft((prev) => ({ ...prev, [key]: value }))}
                />
              </div>
              <div className="mt-5 flex justify-end">
                <Button
                  onClick={handleSaveJournal}
                  disabled={!journalDirty || updateJournalAnswers.isPending}
                  className="font-sans"
                >
                  {updateJournalAnswers.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Your Writing
                    </>
                  )}
                </Button>
              </div>
            </section>
          )}

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
