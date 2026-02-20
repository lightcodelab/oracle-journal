import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SpreadSelection, type SpreadType } from "@/components/SpreadSelection";
import { SpreadReading } from "@/components/SpreadReading";
import { CardDetail } from "@/components/CardDetail";
import { OracleCardComponent } from "@/components/OracleCardComponent";
import { ShuffleAnimation } from "@/components/ShuffleAnimation";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { DoorOpen, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";
import sacredRewriteCardBack from "@/assets/card-back-v2.png";
import mnlCardBack from "@/assets/mnl-card-back.png";
import areekeeraCardBack from "@/assets/areekeera-card-back.png";
import taoshCardBack from "@/assets/taosh-card-back.png";
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
  const [showCard, setShowCard] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

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

  const getCardBackForDeck = (deckName: string | null | undefined) => {
    if (!deckName) return sacredRewriteCardBack;
    if (deckName.toLowerCase().includes('magic not logic')) return mnlCardBack;
    if (deckName.toLowerCase().includes('areekeera')) return areekeeraCardBack;
    if (deckName.toLowerCase().includes('art of self-healing')) return taoshCardBack;
    return sacredRewriteCardBack;
  };

  const getCardBackImage = () => {
    if (selectedCard?.deck_name) {
      return getCardBackForDeck(selectedCard.deck_name);
    }
    return sacredRewriteCardBack;
  };

  const initializeSpreadReading = async (spread: SpreadType) => {
    if (!user) return;

    const { data: allDecks } = await supabase
      .from('decks')
      .select('id')
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
      deck_name: card.deck_name || card.decks?.name || null
    })) as OracleCard[];

    setActiveSpread(spread);
    setSpreadCards(mappedCards);
    setSpreadRevealedPositions([]);
    setShowSpreadReading(true);
  };

  const handleSelectSpread = async (spread: SpreadType) => {
    await initializeSpreadReading(spread);
  };

  const handleSelectSpreadCard = (card: OracleCard, positionIndex: number) => {
    if (!spreadRevealedPositions.includes(positionIndex)) {
      setSpreadRevealedPositions(prev => [...prev, positionIndex]);
      return;
    }
    setSelectedCard(card);
    setShowSpreadReading(false);
    setShowCard(true);
    setIsRevealed(true);
  };

  const handleBackToSpreadReading = () => {
    setSelectedCard(null);
    setShowCard(false);
    setIsRevealed(false);
    setShowSpreadReading(true);
  };

  const handleDrawAnother = () => {
    if (activeSpread) {
      handleBackToSpreadReading();
      return;
    }
  };

  const handleBackToSpreads = () => {
    setActiveSpread(null);
    setSpreadCards([]);
    setSpreadRevealedPositions([]);
    setShowSpreadReading(false);
    setShowCard(false);
    setIsRevealed(false);
    setSelectedCard(null);
  };

  const handleReveal = () => {
    setIsRevealed(true);
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
        { label: 'Door of Remembrance', onClick: () => navigate('/decks'), icon: DoorOpen },
        { label: 'Sacred Spreads', onClick: handleBackToSpreads },
        { label: activeSpread.name }
      ]
    : [
        { label: 'Door of Remembrance', onClick: () => navigate('/decks'), icon: DoorOpen },
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

            <SpreadSelection onSelectSpread={handleSelectSpread} />
          </motion.div>
        )}

        {/* Spread reading */}
        {activeSpread && showSpreadReading && !showCard && (
          <SpreadReading
            spread={activeSpread}
            cards={spreadCards}
            onSelectCard={handleSelectSpreadCard}
            onBackToDecks={handleBackToSpreads}
            revealedPositions={spreadRevealedPositions}
          />
        )}

        {/* Card reveal (face-down) */}
        {showCard && selectedCard && !isRevealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="min-h-[80vh] flex flex-col justify-center items-center space-y-8"
          >
            <h2 className="font-serif text-4xl text-foreground mb-8">Your Card Awaits</h2>
            <OracleCardComponent
              card={selectedCard}
              isRevealed={isRevealed}
              onClick={handleReveal}
              cardBackImage={getCardBackImage()}
            />
            <p className="text-foreground/70 text-lg">Click the card to reveal</p>
          </motion.div>
        )}

        {/* Card detail */}
        {isRevealed && selectedCard && (
          <div className="pt-8">
            <CardDetail
              card={selectedCard}
              onDrawAnother={handleDrawAnother}
              hasPremiumAccess={false}
              isStarterDeck={false}
              deckId=""
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SacredSpreads;
