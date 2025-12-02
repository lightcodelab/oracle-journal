import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import tsrBanner from "@/assets/tsr-banner.png";
import mnlBanner from "@/assets/mnl-banner.png";
import areekeeraBanner from "@/assets/areekeera-banner.png";
import taoshBanner from "@/assets/taosh-banner.png";

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

interface DeckSelectionProps {
  decks: Deck[];
  userPurchases: string[];
  onSelectDeck: (deckId: string) => void;
  onVerifyPurchase: (deckId: string) => void;
}

export const DeckSelection = ({ 
  decks, 
  userPurchases, 
  onSelectDeck,
  onVerifyPurchase 
}: DeckSelectionProps) => {
  const hasAccess = (deck: Deck) => {
    return deck.is_free || deck.is_starter || userPurchases.includes(deck.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-12"
    >
      <div className="text-center mb-12">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-16 h-16 mx-auto text-accent animate-glow mb-4" />
        </motion.div>
        <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground mb-4">
          Choose Your Deck
        </h1>
        <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
          Select a deck to receive divine guidance tailored to your spiritual journey
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {decks.map((deck, index) => {
          const accessible = hasAccess(deck);
          
          return (
            <motion.div
              key={deck.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-glow transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-serif">
                        {deck.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {deck.theme}
                      </CardDescription>
                    </div>
                    {deck.is_free && (
                      <Badge variant="secondary" className="ml-2">
                        Free
                      </Badge>
                    )}
                    {deck.is_starter && (
                      <Badge variant="secondary" className="ml-2">
                        Starter
                      </Badge>
                    )}
                    {!accessible && !deck.is_free && !deck.is_starter && (
                      <Badge variant="outline" className="ml-2">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {deck.description && (
                    <p className="text-foreground/70 text-sm">{deck.description}</p>
                  )}
                  
                  {deck.name === "The Sacred Rewrite" ? (
                    <div className="rounded-lg overflow-hidden">
                      <img 
                        src={tsrBanner} 
                        alt="The Sacred Rewrite" 
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  ) : deck.name === "Magic not Logic" ? (
                    <div className="rounded-lg overflow-hidden">
                      <img 
                        src={mnlBanner} 
                        alt="Magic not Logic" 
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  ) : deck.name === "AreekeerA" ? (
                    <div className="rounded-lg overflow-hidden">
                      <img 
                        src={areekeeraBanner} 
                        alt="AreekeerA Energy Medicine Codes" 
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  ) : deck.name === "The Art of Self-Healing" ? (
                    <div className="rounded-lg overflow-hidden">
                      <img 
                        src={taoshBanner} 
                        alt="The Art of Self-Healing" 
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  ) : (
                    <div 
                      className={`h-32 rounded-lg bg-gradient-to-br ${deck.image_color} flex items-center justify-center`}
                    >
                      <Sparkles className="w-12 h-12 text-white/80" />
                    </div>
                  )}

                  {accessible ? (
                    <Button
                      onClick={() => onSelectDeck(deck.id)}
                      className="w-full"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Draw from this Deck
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-foreground/60 text-center">
                        Purchase required to unlock
                      </p>
                      <Button
                        onClick={() => onVerifyPurchase(deck.id)}
                        variant="outline"
                        className="w-full"
                      >
                        Verify Purchase
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};