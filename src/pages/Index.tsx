import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OracleCardComponent } from "@/components/OracleCardComponent";
import { CardDetail } from "@/components/CardDetail";
import { ShuffleAnimation } from "@/components/ShuffleAnimation";

import { DeckSelection } from "@/components/DeckSelection";
import { PurchaseVerification } from "@/components/PurchaseVerification";
import { CardNumberSelector } from "@/components/CardNumberSelector";
import { CardDropdownSelector } from "@/components/CardDropdownSelector";
import { SpreadReading } from "@/components/SpreadReading";
import type { SpreadType } from "@/components/SpreadSelection";
import { supabase } from "@/integrations/supabase/client";
import { Shuffle, Sparkles, DoorOpen } from "lucide-react";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";
import sacredRewriteCardBack from "@/assets/card-back-v2.png";
import mnlCardBack from "@/assets/mnl-card-back.png";
import areekeeraCardBack from "@/assets/areekeera-card-back.png";
import taoshCardBack from "@/assets/taosh-card-back.png";
import tsrBanner from "@/assets/tsr-banner.png";
import mnlBanner from "@/assets/mnl-banner.png";
import areekeeraBanner from "@/assets/areekeera-banner.png";
import taoshBanner from "@/assets/taosh-banner.png";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import type { OracleCard } from "@/data/oracleCards";

interface Deck {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  image_color: string;
  is_free: boolean;
  is_starter: boolean;
  woocommerce_product_id: string | null;
  woocommerce_product_id_premium: string | null;
}



const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [userPurchases, setUserPurchases] = useState<string[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [selectedCard, setSelectedCard] = useState<OracleCard | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [verifyDeckId, setVerifyDeckId] = useState<string | null>(null);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Spread reading state
  const [activeSpread, setActiveSpread] = useState<SpreadType | null>(null);
  const [spreadCards, setSpreadCards] = useState<OracleCard[]>([]);
  const [spreadRevealedPositions, setSpreadRevealedPositions] = useState<number[]>([]);
  const [showSpreadReading, setShowSpreadReading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchDecks();
        fetchUserPurchases(session.user.id);
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

  const fetchDecks = async () => {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('Error fetching decks:', error);
      toast({
        title: "Error",
        description: "Failed to load decks",
        variant: "destructive",
      });
    } else {
      setDecks(data || []);
    }
  };

  const fetchUserPurchases = async (userId: string) => {
    // UX-only admin check: Determines UI display (e.g., showing all decks).
    // SECURITY NOTE: Actual data access is enforced by RLS policies. The can_view_card()
    // and user_has_deck_access() SECURITY DEFINER functions enforce authorization
    // at the database level regardless of client-side state.
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleData) {
      setIsAdmin(true);
      // Admin has access to all decks - fetch all deck IDs
      const { data: allDecks } = await supabase
        .from('decks')
        .select('id');
      
      setUserPurchases((allDecks || []).map(d => d.id));
      return;
    }

    // Not admin, fetch actual purchases
    const { data, error } = await supabase
      .from('deck_purchases')
      .select('deck_id')
      .eq('user_id', userId)
      .eq('verified', true);

    if (error) {
      console.error('Error fetching purchases:', error);
    } else {
      setUserPurchases((data || []).map(p => p.deck_id));
    }
  };

  // Initialize a spread reading - draw random cards from available decks
  const initializeSpreadReading = async (spread: SpreadType) => {
    if (!user) return;
    
    // Get all non-starter decks user has access to
    const { data: allDecks } = await supabase
      .from('decks')
      .select('id')
      .eq('is_starter', false);

    if (!allDecks || allDecks.length === 0) return;

    // Get all available cards across accessible decks
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

    // Shuffle and pick random cards
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

  // Handler for selecting a card from the spread
  const handleSelectSpreadCard = (card: OracleCard, positionIndex: number) => {
    // First reveal the card position
    if (!spreadRevealedPositions.includes(positionIndex)) {
      setSpreadRevealedPositions(prev => [...prev, positionIndex]);
      return;
    }
    // If already revealed, navigate to card detail
    setSelectedCard(card);
    setShowSpreadReading(false);
    setShowCard(true);
    setIsRevealed(true);
  };

  // Handler to go back to spread from card detail
  const handleBackToSpreadReading = () => {
    setSelectedCard(null);
    setShowCard(false);
    setIsRevealed(false);
    setShowSpreadReading(true);
  };

  const handleSelectDeck = async (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck || !user) return;

    setSelectedDeck(deck);

    // Check if user has premium access
    if (!deck.is_free) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleData) {
        setHasPremiumAccess(true);
        return;
      }

      const { data } = await supabase
        .from('deck_purchases')
        .select('is_premium')
        .eq('user_id', user.id)
        .eq('deck_id', deckId)
        .eq('verified', true)
        .maybeSingle();

      setHasPremiumAccess(data?.is_premium || false);
    } else {
      setHasPremiumAccess(false);
    }
  };

  const handleShuffle = async () => {
    if (!selectedDeck || !user) return;

    setIsShuffling(true);
    setShowCard(false);
    setIsRevealed(false);

    try {
      const { data: deckCards, error } = await supabase
        .from('cards')
        .select('*')
        .eq('deck_id', selectedDeck.id);

      if (error) throw error;
      const cards = deckCards || [];

      if (!cards || cards.length === 0) {
        toast({
          title: "Error",
          description: "No cards found in this deck",
          variant: "destructive",
        });
        setIsShuffling(false);
        return;
      }

      setTimeout(async () => {
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        setSelectedCard(randomCard as OracleCard);

        // Record the draw
        await supabase.from('card_draws').insert({
          user_id: user.id,
          card_id: randomCard.id,
          deck_id: selectedDeck.id,
        });

        setIsShuffling(false);
        setShowCard(true);
      }, 1500);
    } catch (error) {
      console.error('Error drawing card:', error);
      toast({
        title: "Error",
        description: "Failed to draw a card",
        variant: "destructive",
      });
      setIsShuffling(false);
    }
  };

  const handleSelectCardNumber = async (cardNumber: number) => {
    if (!selectedDeck || !user) return;

    setShowCard(false);
    setIsRevealed(false);

    try {
      // Force fresh fetch with no caching
      const { data: card, error } = await supabase
        .from('cards')
        .select('*')
        .eq('deck_id', selectedDeck.id)
        .eq('card_number', cardNumber)
        .maybeSingle()
        .throwOnError();

      if (error) throw error;

      if (!card) {
        toast({
          title: "Card Not Found",
          description: `Card number ${cardNumber} not found in this deck`,
          variant: "destructive",
        });
        return;
      }

      setSelectedCard(card as OracleCard);

      // Record the draw
      await supabase.from('card_draws').insert({
        user_id: user.id,
        card_id: card.id,
        deck_id: selectedDeck.id,
      });

      setShowCard(true);
    } catch (error) {
      console.error('Error selecting card:', error);
      toast({
        title: "Error",
        description: "Failed to select card",
        variant: "destructive",
      });
    }
  };

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleDrawAnother = () => {
    // For spread reading, go back to spread
    if (activeSpread) {
      handleBackToSpreadReading();
      return;
    }
    setShowCard(false);
    setIsRevealed(false);
    setSelectedCard(null);
  };

  const handleBackToDecks = () => {
    setSelectedDeck(null);
    setShowCard(false);
    setIsRevealed(false);
    setSelectedCard(null);
    setActiveSpread(null);
    setSpreadCards([]);
    setSpreadRevealedPositions([]);
    setShowSpreadReading(false);
  };

  const handleVerifyPurchase = (deckId: string) => {
    setVerifyDeckId(deckId);
  };

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

  // Get the appropriate card back image for the selected deck or card
  const getCardBackImage = () => {
    // For spread reading, use the card's deck_name
    if (activeSpread && selectedCard?.deck_name) {
      return getCardBackForDeck(selectedCard.deck_name);
    }
    
    if (!selectedDeck) return sacredRewriteCardBack;
    
    return getCardBackForDeck(selectedDeck.name);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />

      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <PageBreadcrumb 
          items={
            activeSpread && (showSpreadReading || isRevealed)
              ? [
                  { label: 'Door of Remembrance', onClick: handleBackToDecks, icon: DoorOpen },
                  { label: activeSpread.name }
                ]
              : selectedDeck
                ? [
                    { label: 'Door of Remembrance', onClick: handleBackToDecks, icon: DoorOpen },
                    { label: selectedDeck.name }
                  ]
                : [
                    { label: 'Door of Remembrance', icon: DoorOpen }
                  ]
          } 
        />
        <ProfileDropdown />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        {!selectedDeck && !activeSpread && (
          <DeckSelection
            decks={decks}
            userPurchases={userPurchases}
            onSelectDeck={handleSelectDeck}
            onVerifyPurchase={handleVerifyPurchase}
            onSelectSpread={handleSelectSpread}
          />
        )}

        {/* Spread Reading */}
        {activeSpread && showSpreadReading && !showCard && (
          <SpreadReading
            spread={activeSpread}
            cards={spreadCards}
            onSelectCard={handleSelectSpreadCard}
            onBackToDecks={handleBackToDecks}
            revealedPositions={spreadRevealedPositions}
          />
        )}

        {/* Regular deck UI */}
        {selectedDeck && !showCard && !isShuffling && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8 max-w-2xl mx-auto min-h-[80vh] flex flex-col justify-center"
          >
            {/* Breadcrumb handles navigation now */}

            {selectedDeck.name === "The Sacred Rewrite" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="mb-8"
              >
                <img 
                  src={tsrBanner} 
                  alt="The Sacred Rewrite" 
                  className="w-full max-w-3xl mx-auto shadow-lg"
                />
              </motion.div>
            ) : selectedDeck.name === "Magic not Logic" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="mb-8"
              >
                <img 
                  src={mnlBanner} 
                  alt="Magic not Logic" 
                  className="w-full max-w-3xl mx-auto shadow-lg"
                />
              </motion.div>
            ) : selectedDeck.name === "AreekeerA" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="mb-8"
              >
                <img 
                  src={areekeeraBanner} 
                  alt="AreekeerA® Energy Medicine Codes" 
                  className="w-full max-w-3xl mx-auto shadow-lg"
                />
              </motion.div>
            ) : selectedDeck.name === "The Art of Self-Healing" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="mb-8"
              >
                <img 
                  src={taoshBanner} 
                  alt="The Art of Self-Healing" 
                  className="w-full max-w-3xl mx-auto shadow-lg"
                />
              </motion.div>
            ) : (
              <>
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="w-20 h-20 mx-auto text-accent animate-glow" />
                </motion.div>
                
                <h1 className="font-serif text-6xl md:text-7xl font-bold text-foreground mb-4">
                  {selectedDeck.name}
                </h1>
              </>
            )}
            
            <p className="text-xl md:text-2xl text-foreground/80 leading-relaxed">
              {selectedDeck.description || "Draw a card to receive divine guidance"}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={handleShuffle}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-12 py-8 text-xl shadow-glow"
              >
                <Shuffle className="w-6 h-6 mr-3" />
                Shuffle the Deck
              </Button>
              
              {(
                selectedDeck.name.toLowerCase().includes('magic not logic') ? (
                  <CardDropdownSelector 
                    deckId={selectedDeck.id}
                    onSelectCard={handleSelectCardNumber}
                  />
                ) : (
                  <CardNumberSelector 
                    onSelectCard={handleSelectCardNumber}
                    deckId={selectedDeck.id}
                    deckName={selectedDeck.name}
                  />
                )
              )}
            </div>
          </motion.div>
        )}

        {isShuffling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-[80vh] flex justify-center items-center"
          >
            <ShuffleAnimation cardBackImage={getCardBackImage()} />
          </motion.div>
        )}

        {showCard && selectedCard && !isRevealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="min-h-[80vh] flex flex-col justify-center items-center space-y-8"
          >
            {/* Breadcrumb handles navigation now */}

            <h2 className="font-serif text-4xl text-foreground mb-8">
              Your Card Awaits
            </h2>
            <OracleCardComponent
              card={selectedCard}
              isRevealed={isRevealed}
              onClick={handleReveal}
              cardBackImage={getCardBackImage()}
            />
            <p className="text-foreground/70 text-lg">Click the card to reveal</p>
          </motion.div>
        )}

        {isRevealed && selectedCard && (
          <div className="pt-8">
            <CardDetail 
              card={selectedCard}
              onDrawAnother={handleDrawAnother}
              hasPremiumAccess={hasPremiumAccess}
              isStarterDeck={false}
              deckId={selectedDeck?.id || ''}
            />
          </div>
        )}
      </div>

      {/* Purchase Verification Dialog */}
      <PurchaseVerification
        deckId={verifyDeckId}
        deckName={decks.find(d => d.id === verifyDeckId)?.name || ""}
        isOpen={!!verifyDeckId}
        onClose={() => setVerifyDeckId(null)}
        onSuccess={() => {
          if (user) {
            fetchUserPurchases(user.id);
          }
        }}
      />
    </div>
  );
};

export default Index;
