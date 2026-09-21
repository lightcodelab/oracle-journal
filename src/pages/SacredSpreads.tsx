import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SpreadSelection, type SpreadType } from "@/components/SpreadSelection";
import { SpreadReading, EMPTY_SPREAD_JOURNAL_ANSWERS, type SpreadJournalAnswers } from "@/components/SpreadReading";

import CardDetailDialog from "@/components/CardDetailDialog";
import MembershipInvite from "@/components/MembershipInvite";
import { useFreeAccess } from "@/hooks/useFreeAccess";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { DoorOpen, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import type { OracleCard } from "@/data/oracleCards";

const SacredSpreads = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSpread, setActiveSpread] = useState<SpreadType | null>(null);
  const [spreadCards, setSpreadCards] = useState<OracleCard[]>([]);
  const [spreadRevealedPositions, setSpreadRevealedPositions] = useState<number[]>([]);
  const [showSpreadReading, setShowSpreadReading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<OracleCard | null>(null);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [generatedReading, setGeneratedReading] = useState<string | null>(null);
  const [generatedReadingModel, setGeneratedReadingModel] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const emptyJournalAnswers: SpreadJournalAnswers = { ...EMPTY_SPREAD_JOURNAL_ANSWERS };
  const [journalAnswers, setJournalAnswers] = useState<SpreadJournalAnswers>(emptyJournalAnswers);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading: accessLoading, hasFullAccess, isFreeAccount, freeReadingUsed, refresh: refreshAccess } = useFreeAccess();

  // Free accounts get one Past, Present, Future reading and nothing else.
  const FREE_SPREAD_ID = "past-present-future";
  const autoSavedRef = useRef(false);
  const allowedSpreadIds = hasFullAccess ? undefined : [FREE_SPREAD_ID];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const initializeSpreadReading = async (spread: SpreadType) => {
    if (!user) return;

    // Free accounts draw through a server-side draw so the decks themselves
    // stay closed until they join.
    if (!hasFullAccess) {
      const { data, error } = await supabase.rpc('draw_free_spread_cards', { _count: spread.cardCount });
      const drawn = Array.isArray(data) ? (data as Record<string, any>[]) : [];
      if (error || drawn.length !== spread.cardCount) {
        toast({
          title: "Your reading could not be drawn",
          description: error?.message || "Please try again in a moment.",
          variant: "destructive",
        });
        return;
      }
      const freeCards = drawn.map((card) => ({
        ...card,
        deck_name: card.deck_name || card.deck_name_resolved || null,
        content_sections: (card.content_sections as Record<string, any>) || null,
      })) as OracleCard[];

      setActiveSpread(spread);
      setSpreadCards(freeCards);
      setSpreadRevealedPositions([]);
      setJournalAnswers({ ...EMPTY_SPREAD_JOURNAL_ANSWERS });
      setShowSpreadReading(true);
      return;
    }

    const { data: allDecks } = await supabase
      .from('decks')
      .select('id')
      .eq('is_published', true)
      .eq('is_starter', false);

    if (!allDecks || allDecks.length === 0) return;

    const deckIds = allDecks.map(d => d.id);
    const { data: allCards } = await supabase
      .from('cards')
      .select('*, decks(name)')
      .in('deck_id', deckIds);

    if (!allCards || allCards.length < spread.cardCount) {
      toast({
        title: "Not enough cards",
        description: "There aren't enough cards available for this spread.",
        variant: "destructive",
      });
      return;
    }

    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, spread.cardCount);

    const mappedCards = selected.map(card => ({
      ...card,
      deck_name: card.deck_name || card.decks?.name || null,
      content_sections: (card.content_sections as Record<string, any>) || null,
    })) as OracleCard[];

    setActiveSpread(spread);
    setSpreadCards(mappedCards);
    setSpreadRevealedPositions([]);
    setJournalAnswers({ ...EMPTY_SPREAD_JOURNAL_ANSWERS });
    setShowSpreadReading(true);
  };

  const handleSelectSpread = async (spread: SpreadType) => {
    if (!hasFullAccess) {
      if (spread.id !== FREE_SPREAD_ID) {
        toast({
          title: "Included with membership",
          description: "This spread opens when you join THE TEMPLE.",
        });
        return;
      }
      if (freeReadingUsed) {
        toast({
          title: "Your free reading has been drawn",
          description: "You can revisit it any time in My Readings.",
        });
        return;
      }
    }
    await initializeSpreadReading(spread);
  };

  const generateSharedReading = useCallback(async () => {
    if (!activeSpread || spreadCards.length !== activeSpread.cardCount || generating || generatedReading) return;
    setGenerating(true);
    setGenerationError(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sacred-spread-reading', {
        body: {
          spreadType: activeSpread.id,
          cardIds: spreadCards.map((card) => card.id),
        },
      });
      if (error) {
        let message = error.message;
        const context = 'context' in error ? error.context : null;
        if (context instanceof Response) {
          const payload = await context.clone().json().catch(() => null);
          if (payload && typeof payload.error === 'string') message = payload.error;
        }
        throw new Error(message);
      }
      if (!data?.reading) throw new Error('The reading returned no content.');
      setGeneratedReading(data.reading);
      setGeneratedReadingModel(data.model || null);
      // A free account's single reading is now spent.
      if (!hasFullAccess) void refreshAccess();
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Your reading could not be written. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [activeSpread, spreadCards, generating, generatedReading]);

  useEffect(() => {
    if (activeSpread && spreadRevealedPositions.length === activeSpread.cardCount && !generatedReading && !generationError) {
      void generateSharedReading();
    }
  }, [activeSpread, spreadRevealedPositions.length, generatedReading, generationError, generateSharedReading]);

  const handleSelectSpreadCard = (card: OracleCard, positionIndex: number) => {
    if (!spreadRevealedPositions.includes(positionIndex)) {
      setSpreadRevealedPositions(prev => [...prev, positionIndex]);
      return;
    }
    // Open card detail as popup dialog
    setSelectedCard(card);
    setCardDialogOpen(true);
  };

  const handleSaveSpread = async () => {
    if (!user || !activeSpread || spreadCards.length === 0) return;
    setSaving(true);

    try {
      const spreadCardsData = spreadCards.map((card, index) => ({
        position: activeSpread.positions[index] || `Card ${index + 1}`,
        card_id: card.id,
        card_title: card.card_title,
        deck_name: card.deck_name || null,
        image_file_name: card.image_file_name || null,
        card_number: card.card_number,
      }));

      const { error } = await supabase
        .from('saved_readings')
        .insert({
          user_id: user.id,
          card_title: activeSpread.name,
          spread_type: activeSpread.id,
          spread_name: activeSpread.name,
          spread_cards: spreadCardsData,
          image_file_name: spreadCards[0]?.image_file_name || null,
          deck_name: 'Spread',
          generated_reading: generatedReading,
          generated_reading_model: generatedReadingModel,
          journal_answers: journalAnswers,
          saved_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Spread Saved',
        description: `Your "${activeSpread.name}" reading has been saved to My Readings.`,
      });
    } catch (err) {
      console.error('Error saving spread:', err);
      toast({
        title: 'Error',
        description: 'Failed to save your spread reading.',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  // A free account gets one reading, so it is kept for them automatically.
  useEffect(() => {
    if (hasFullAccess || !generatedReading || !activeSpread || autoSavedRef.current) return;
    autoSavedRef.current = true;
    void handleSaveSpread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFullAccess, generatedReading, activeSpread]);

  const handleBackToSpreads = () => {
    setActiveSpread(null);
    setSpreadCards([]);
    setSpreadRevealedPositions([]);
    setShowSpreadReading(false);
    setCardDialogOpen(false);
    setSelectedCard(null);
    setGeneratedReading(null);
    setGeneratedReadingModel(null);
    setGenerating(false);
    setGenerationError(null);
    setJournalAnswers({ ...EMPTY_SPREAD_JOURNAL_ANSWERS });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  const breadcrumbItems = activeSpread
    ? [
        { label: 'The Door of Remembrance', onClick: () => navigate('/remembrance'), icon: DoorOpen },
        { label: 'Sacred Spreads', onClick: handleBackToSpreads },
        { label: activeSpread.name }
      ]
    : [
        { label: 'The Door of Remembrance', onClick: () => navigate('/remembrance'), icon: DoorOpen },
        { label: 'Sacred Spreads' }
      ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />

      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <PageBreadcrumb items={breadcrumbItems} />
        <ProfileDropdown />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Spread selection */}
        {!activeSpread && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-12"
          >
            <div className="text-center mb-10">
              <div className="text-3xl mb-2">✦</div>
              <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
                Sacred Spreads
              </h1>
              <p className="font-bold text-primary font-sans text-base mb-3">
                Multi-Card Readings for Deeper Guidance
              </p>
              <div className="text-muted-foreground font-sans text-base max-w-2xl mx-auto space-y-3">
                <p>
                  Choose a spread to draw cards from across your available decks.
                  Each position in the spread holds a mirror to a different aspect of your inquiry.
                </p>
                <p>Let your intuition guide which spread is calling you today.</p>
              </div>
            </div>

            {isFreeAccount && !accessLoading && (
              <div className="max-w-3xl mx-auto mb-8">
                {freeReadingUsed ? (
                  <MembershipInvite
                    heading="Your free reading has been drawn"
                    body="Your Past, Present, Future reading is saved to your account and stays yours to read and write in. Membership opens the other five spreads, every card deck, the courses, the Remembrance Letters, Living Pattern and your private journal."
                  />
                ) : (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 text-center">
                    <p className="text-sm text-foreground/85 leading-relaxed">
                      Your free account includes one <strong>Past, Present, Future</strong> reading.
                      Take your time with it — the other spreads open with membership.
                    </p>
                  </div>
                )}
              </div>
            )}

            <SpreadSelection
              onSelectSpread={handleSelectSpread}
              allowedSpreadIds={allowedSpreadIds}
            />
          </motion.div>
        )}

        {/* Spread reading */}
        {activeSpread && showSpreadReading && (
          <SpreadReading
            spread={activeSpread}
            cards={spreadCards}
            onSelectCard={handleSelectSpreadCard}
            onBackToDecks={handleBackToSpreads}
            revealedPositions={spreadRevealedPositions}
            onSaveSpread={handleSaveSpread}
            saving={saving}
            generatedReading={generatedReading}
            generating={generating}
            generationError={generationError}
            onRetryGeneration={() => {
              setGenerationError(null);
              void generateSharedReading();
            }}
            journalAnswers={journalAnswers}
            onJournalAnswerChange={(key, value) =>
              setJournalAnswers((prev) => ({ ...prev, [key]: value }))
            }
          />
        )}

        {activeSpread && showSpreadReading && isFreeAccount && generatedReading && (
          <div className="max-w-3xl mx-auto mt-10">
            <MembershipInvite />
          </div>
        )}
      </div>

      {/* Card detail popup */}
      <CardDetailDialog
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        card={selectedCard}
        hideActions
        showBackToSpread
      />
    </div>
  );
};

export default SacredSpreads;
