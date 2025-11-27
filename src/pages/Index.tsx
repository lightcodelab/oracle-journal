import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OracleCardComponent } from "@/components/OracleCardComponent";
import { CardDetail } from "@/components/CardDetail";
import { ShuffleAnimation } from "@/components/ShuffleAnimation";
import { oracleCards } from "@/data/oracleCards";
import { Shuffle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const [selectedCard, setSelectedCard] = useState<typeof oracleCards[0] | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const handleShuffle = () => {
    setIsShuffling(true);
    setShowCard(false);
    setIsRevealed(false);
    
    setTimeout(() => {
      const randomCard = oracleCards[Math.floor(Math.random() * oracleCards.length)];
      setSelectedCard(randomCard);
      setIsShuffling(false);
      setShowCard(true);
    }, 1500);
  };

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleDrawAnother = () => {
    setShowCard(false);
    setIsRevealed(false);
    setSelectedCard(null);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        {!showCard && !isShuffling && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8 max-w-2xl mx-auto min-h-[80vh] flex flex-col justify-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-20 h-20 mx-auto text-accent animate-glow" />
            </motion.div>
            
            <h1 className="font-serif text-6xl md:text-7xl font-bold text-foreground mb-4">
              Mystic Oracle
            </h1>
            
            <p className="text-xl md:text-2xl text-foreground/80 leading-relaxed">
              Draw a card to receive divine guidance and meaningful journaling prompts for your spiritual journey
            </p>

            <Button
              onClick={handleShuffle}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-12 py-8 text-xl shadow-glow mx-auto"
            >
              <Shuffle className="w-6 h-6 mr-3" />
              Shuffle the Deck
            </Button>
          </motion.div>
        )}

        {isShuffling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-[80vh] flex justify-center items-center"
          >
            <ShuffleAnimation />
          </motion.div>
        )}

        {showCard && selectedCard && !isRevealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="min-h-[80vh] flex flex-col justify-center items-center space-y-8"
          >
            <h2 className="font-serif text-4xl text-foreground mb-8">
              Your Card Awaits
            </h2>
            <OracleCardComponent
              card={selectedCard}
              isRevealed={isRevealed}
              onClick={handleReveal}
            />
            <p className="text-foreground/70 text-lg">Click the card to reveal</p>
          </motion.div>
        )}

        {isRevealed && selectedCard && (
          <CardDetail card={selectedCard} onDrawAnother={handleDrawAnother} />
        )}
      </div>
    </div>
  );
};

export default Index;
