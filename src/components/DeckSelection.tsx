import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import tsrBanner from "@/assets/tsr-banner.png";
import mnlBanner from "@/assets/mnl-banner.png";
import areekeeraBanner from "@/assets/areekeera-banner.png";
import taoshBanner from "@/assets/taosh-banner.png";
import RemembranceCourseSection from "@/components/RemembranceCourseSection";

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
    >
      {/* Page header */}
      <div className="container mx-auto px-4 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            The Door of Remembrance
          </h1>
        </motion.div>
      </div>

      {/* Section 1: The Rites of Remembrance — default bg */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="py-16"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
              The Rites of Remembrance
            </h2>
          </div>

          <div className="text-center py-12">
            <p className="text-muted-foreground font-sans">
              Coming soon.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Section 2: The Mirrors of Sacred Undoing — muted bg */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-muted/30 py-16"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
              The Mirrors of Sacred Undoing
            </h2>
            <p className="text-muted-foreground font-sans text-base max-w-2xl mx-auto">
              Select a deck to receive divine guidance tailored to your spiritual journey.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {decks.map((deck, index) => {
              const accessible = hasAccess(deck);
              const bannerSrc = deck.name === "The Sacred Rewrite" ? tsrBanner
                : deck.name === "Magic not Logic" ? mnlBanner
                : deck.name === "AreekeerA" ? areekeeraBanner
                : deck.name === "The Art of Self-Healing" ? taoshBanner
                : null;

              return (
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onClick={() => accessible ? onSelectDeck(deck.id) : onVerifyPurchase(deck.id)}
                  className="group cursor-pointer"
                >
                  <div className="bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:border-primary/30">
                    {/* Thumbnail */}
                    <div className="aspect-video w-full overflow-hidden bg-muted relative">
                      {bannerSrc ? (
                        <img
                          src={bannerSrc}
                          alt={deck.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${deck.image_color}`}>
                          <Sparkles className="w-12 h-12 text-white/80" />
                        </div>
                      )}

                      {/* Badges overlay */}
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        {deck.is_free && (
                          <Badge className="bg-primary/90 hover:bg-primary text-primary-foreground text-xs">Free</Badge>
                        )}
                        {deck.is_starter && (
                          <Badge className="bg-primary/90 hover:bg-primary text-primary-foreground text-xs">Starter</Badge>
                        )}
                        {!accessible && !deck.is_free && !deck.is_starter && (
                          <Badge variant="outline" className="bg-background/80 text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {deck.name}
                        </h3>
                        <div className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      </div>

                      {deck.theme && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {deck.theme}
                        </p>
                      )}

                      {accessible ? (
                        <Badge variant="secondary" className="text-xs">
                          Draw from Deck
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Verify Purchase
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Section 3: The Alchemy of Becoming — default bg */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="py-16"
      >
        <div className="container mx-auto px-4">
          <RemembranceCourseSection />
        </div>
      </motion.div>
    </motion.div>
  );
};
