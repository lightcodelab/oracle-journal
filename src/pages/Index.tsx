import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OracleCardComponent } from "@/components/OracleCardComponent";
import { CardDetail } from "@/components/CardDetail";
import { ShuffleAnimation } from "@/components/ShuffleAnimation";

import { DeckSelection } from "@/components/DeckSelection";
import { CardNumberSelector } from "@/components/CardNumberSelector";
import { CardDropdownSelector } from "@/components/CardDropdownSelector";
import { supabase } from "@/integrations/supabase/client";
import { Shuffle, Sparkles, DoorOpen, Lock, ArrowUpRight } from "lucide-react";
import NavActions from "@/components/NavActions";
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
import { useTierAccess } from "@/hooks/useTierAccess";

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
  const [hasPremiumAccess, setHasPremiumAccess] = useState(true);
  
  
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { hasAccess, loading: tierLoading } = useTierAccess();
  const canAccessRemembrance = hasAccess('remembrance');

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

  const fetchUserPurchases = async (_userId: string) => {
    // All authenticated users have access to all decks
    const { data: allDecks } = await supabase
      .from('decks')
      .select('id');
    
    setUserPurchases((allDecks || []).map(d => d.id));
  };



  // Resume a previously drawn card via /remembrance?deck=<id>&card=<id>
  const resumeDeckId = searchParams.get("deck");
  const resumeCardId = searchParams.get("card");

  useEffect(() => {
    if (!user || !resumeDeckId || !resumeCardId || decks.length === 0) return;
    if (selectedCard?.id === resumeCardId) return;

    const deck = decks.find((d) => d.id === resumeDeckId);
    if (!deck) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("id", resumeCardId)
        .eq("deck_id", resumeDeckId)
        .maybeSingle();

      if (cancelled || error || !data) return;
      setSelectedDeck(deck);
      setHasPremiumAccess(true);
      setSelectedCard(data as OracleCard);
      setShowCard(true);
      setIsRevealed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, decks, resumeDeckId, resumeCardId, selectedCard?.id]);

  const handleSelectDeck = async (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck || !user) return;

    setSelectedDeck(deck);

    // All authenticated users have full access
    setHasPremiumAccess(true);
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
    setShowCard(false);
    setIsRevealed(false);
    setSelectedCard(null);
  };

  const handleBackToDecks = () => {
    setSelectedDeck(null);
    setShowCard(false);
    setIsRevealed(false);
    setSelectedCard(null);
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
    if (!selectedDeck) return sacredRewriteCardBack;
    return getCardBackForDeck(selectedDeck.name);
  };

  if (loading || tierLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  if (!canAccessRemembrance) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 relative">
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          <PageBreadcrumb items={[{ label: 'The Door of Remembrance', icon: DoorOpen }]} />
          <NavActions />
        </div>
        <div className="max-w-lg mx-auto pt-24 text-center">
          <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="font-serif text-3xl text-foreground mb-4">Access Required</h1>
          <p className="text-muted-foreground mb-6">
            You need an active membership to access the Door of Remembrance.
          </p>
          <Button onClick={() => navigate('/membership')} className="gap-2">
            View Memberships
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
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
            selectedDeck
              ? [
                  { label: 'The Door of Remembrance', onClick: handleBackToDecks, icon: DoorOpen },
                  { label: selectedDeck.name }
                ]
              : [
                  { label: 'The Door of Remembrance', icon: DoorOpen }
                ]
          } 
        />
        <NavActions />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        {!selectedDeck && (
          <DeckSelection
            decks={decks}
            userPurchases={userPurchases}
            onSelectDeck={handleSelectDeck}
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
            className="min-h-[80vh] flex flex-col justify-center items-center space-y-4"
          >
            {/* Breadcrumb handles navigation now */}

            <h2 className="font-serif text-4xl text-foreground pt-6">
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

    </div>
  );
};

export default Index;
