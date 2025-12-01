import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OracleCardComponent } from "@/components/OracleCardComponent";
import { CardDetail } from "@/components/CardDetail";
import { ShuffleAnimation } from "@/components/ShuffleAnimation";
import { DeckSelection } from "@/components/DeckSelection";
import { PurchaseVerification } from "@/components/PurchaseVerification";
import { CardNumberSelector } from "@/components/CardNumberSelector";
import { supabase } from "@/integrations/supabase/client";
import { Shuffle, Sparkles, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";
import sacredRewriteCardBack from "@/assets/card-back-v2.png";
import mnlCardBack from "@/assets/mnl-card-back.png";
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
    // First check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleData) {
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

  const initializeStarterDeck = async (userId: string, starterDeckId: string) => {
    // Check if user already has starter cards assigned
    const { data: existingCards } = await supabase
      .from('user_starter_deck_cards')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (existingCards && existingCards.length > 0) {
      return; // Already initialized
    }

    // Get all cards from non-starter decks
    const { data: allCards } = await supabase
      .from('cards')
      .select('id, deck_id')
      .neq('deck_id', starterDeckId);

    if (!allCards || allCards.length === 0) return;

    // Randomly select 8 cards
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    const selectedCards = shuffled.slice(0, 8);

    // Insert into user_starter_deck_cards
    const { error } = await supabase
      .from('user_starter_deck_cards')
      .insert(
        selectedCards.map(card => ({
          user_id: userId,
          card_id: card.id,
        }))
      );

    if (error) {
      console.error('Error initializing starter deck:', error);
    }
  };

  const handleSelectDeck = async (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck || !user) return;

    setSelectedDeck(deck);

    // Initialize starter deck if needed
    if (deck.is_starter) {
      await initializeStarterDeck(user.id, deckId);
    }

    // Check if user has premium access
    if (!deck.is_free && !deck.is_starter) {
      // First check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleData) {
        // Admin has full premium access
        setHasPremiumAccess(true);
        return;
      }

      // Not admin, check actual purchase
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
      let cards;

      if (selectedDeck.is_starter) {
        // For starter deck, fetch user's assigned starter cards
        const { data: starterCards, error } = await supabase
          .from('user_starter_deck_cards')
          .select('card_id, cards(*)')
          .eq('user_id', user.id);

        if (error) throw error;

        cards = starterCards?.map(sc => sc.cards).filter(Boolean) || [];
      } else {
        // For regular decks, fetch all cards
        const { data: deckCards, error } = await supabase
          .from('cards')
          .select('*')
          .eq('deck_id', selectedDeck.id);

        if (error) throw error;
        cards = deckCards || [];
      }

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
      const { data: card, error } = await supabase
        .from('cards')
        .select('*')
        .eq('deck_id', selectedDeck.id)
        .eq('card_number', cardNumber)
        .maybeSingle();

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleVerifyPurchase = (deckId: string) => {
    setVerifyDeckId(deckId);
  };

  // Get the appropriate card back image for the selected deck
  const getCardBackImage = () => {
    if (!selectedDeck) return sacredRewriteCardBack;
    
    // Map deck names to their card back images
    if (selectedDeck.name.toLowerCase().includes('magic not logic')) {
      return mnlCardBack;
    }
    
    // Default to Sacred Rewrite card back
    return sacredRewriteCardBack;
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

      {/* Sign Out Button */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          size="sm"
          className="text-foreground/70 hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        {!selectedDeck && (
          <DeckSelection
            decks={decks}
            userPurchases={userPurchases}
            onSelectDeck={handleSelectDeck}
            onVerifyPurchase={handleVerifyPurchase}
          />
        )}

        {selectedDeck && !showCard && !isShuffling && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8 max-w-2xl mx-auto min-h-[80vh] flex flex-col justify-center"
          >
            <Button
              onClick={handleBackToDecks}
              variant="ghost"
              className="absolute top-4 left-4"
            >
              ← Back to Decks
            </Button>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-20 h-20 mx-auto text-accent animate-glow" />
            </motion.div>
            
            <h1 className="font-serif text-6xl md:text-7xl font-bold text-foreground mb-4">
              {selectedDeck.name}
            </h1>
            
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
              
              {!selectedDeck.is_starter && (
                <CardNumberSelector 
                  onSelectCard={handleSelectCardNumber}
                  totalCards={63}
                />
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
            <Button
              onClick={handleBackToDecks}
              variant="ghost"
              className="absolute top-4 left-4"
            >
              ← Back to Decks
            </Button>

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
          <>
            <Button
              onClick={handleBackToDecks}
              variant="ghost"
              className="absolute top-4 left-4"
            >
              ← Back to Decks
            </Button>
            <CardDetail 
              card={selectedCard}
              onDrawAnother={handleDrawAnother}
              hasPremiumAccess={hasPremiumAccess}
            />
          </>
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
