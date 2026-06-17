import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, DoorOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import tsrBanner from "@/assets/sacred-rewrite-thumbnail.png.asset.json";
import mnlBanner from "@/assets/mnl-banner.png";
import areekeeraBanner from "@/assets/areekeera-banner.png";
import taoshBanner from "@/assets/taosh-banner.png";
import RemembranceCourseSection from "@/components/RemembranceCourseSection";
import RitesOfRemembranceSection from "@/components/RitesOfRemembranceSection";
import sacredSpreadsBanner from "@/assets/sacred-spreads-thumbnail.png.asset.json";

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
}

export const DeckSelection = ({ 
  decks, 
  onSelectDeck,
}: DeckSelectionProps) => {
  const navigate = useNavigate();

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
          <DoorOpen className="w-10 h-10 text-primary mx-auto mb-4" />
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            The Door of Remembrance
          </h1>
          <p className="text-muted-foreground font-sans text-base max-w-2xl mx-auto">
            <span className="font-bold text-primary">A space to remember who you are beneath distortion, protection, and pattern.</span>
            <br />
            Begin at the foundation. Return as often as needed.
          </p>
        </motion.div>
      </div>

      <div className="container mx-auto px-4"><hr className="border-t border-primary/30" /></div>

      {/* Section 1: The Rites of Remembrance — default bg */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="py-16"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <div className="text-3xl mb-2">🜂</div>
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
              The Rites of Remembrance
            </h2>
            <p className="font-bold text-primary font-sans text-base mb-3">
              The Foundation of All Temple Work
            </p>
            <div className="text-muted-foreground font-sans text-base max-w-2xl mx-auto space-y-3">
              <p>
                These five foundational rites prepare your inner field for all work within the Temple.
                They stabilise the nervous system, clear inherited distortion, and establish energetic sovereignty.
              </p>
              <p>Walk these rites in order. There is no rush.</p>
              <p>You may return to any Rite whenever your system asks.</p>
            </div>
          </div>

          <RitesOfRemembranceSection />
        </div>
      </motion.div>

      <div className="container mx-auto px-4"><hr className="border-t border-primary/30" /></div>

      {/* Section 2: The Mirrors of Sacred Undoing — muted bg */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-muted/30 py-16"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <div className="text-3xl mb-2">🜁</div>
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
              The Mirrors of Sacred Undoing
            </h2>
            <p className="font-bold text-primary font-sans text-base mb-3">
              Card Decks &amp; Companion Journeys
            </p>
            <div className="text-muted-foreground font-sans text-base max-w-2xl mx-auto space-y-3">
              <p>
                Each deck is a mirror — revealing the distortion shaping your life and the higher truth waiting beneath it.
              </p>
              <p>Choose a deck. Draw a card. Let it walk with you.</p>
              <p>
                Many work with one card for a week or more.
                <br />
                Others return daily.
                <br />
                Let the mirror tell you when it has finished speaking.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {/* Sacred Spreads link card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => navigate('/decks/spreads')}
              className="group cursor-pointer"
            >
              <div className="bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:border-primary/30">
                <div className="aspect-video w-full overflow-hidden bg-muted relative">
                  <img
                    src={sacredSpreadsBanner.url}
                    alt="Sacred Spreads"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                      Sacred Spreads
                    </h3>
                    <div className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    Multi-card readings for deeper guidance across all your decks
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    Choose a Spread
                  </Badge>
                </div>
              </div>
            </motion.div>

            {decks.filter(d => !d.is_starter).map((deck, index) => {
              const bannerSrc = deck.name === "The Sacred Rewrite" ? tsrBanner.url
                : deck.name === "Magic not Logic" ? mnlBanner
                : deck.name === "AreekeerA" ? areekeeraBanner
                : deck.name === "The Art of Self-Healing" ? taoshBanner
                : null;

              return (
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: (index + 1) * 0.1 }}
                  onClick={() => onSelectDeck(deck.id)}
                  className="group cursor-pointer"
                >
                  <div className="bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:border-primary/30">
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
                      {deck.is_free && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-primary/90 hover:bg-primary text-primary-foreground text-xs">Free</Badge>
                        </div>
                      )}
                    </div>
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
                      <Badge variant="secondary" className="text-xs">
                        Draw from Deck
                      </Badge>
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

      <div className="container mx-auto px-4"><hr className="border-t border-primary/30" /></div>

      {/* Footer: How to move through this Door */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-muted/30 py-16"
      >
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6">
            How to Move Through This Door
          </h2>
          <div className="text-muted-foreground font-sans text-base space-y-2">
            <p>Begin with the Rites.</p>
            <p>Work with the Mirrors.</p>
            <p>Integrate through Alchemy.</p>
            <p>Return as often as needed.</p>
          </div>
          <p className="text-muted-foreground/70 font-sans text-sm italic mt-6">
            There is no finish line here — only deepening truth.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
