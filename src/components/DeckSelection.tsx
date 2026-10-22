import { DoorSectionBand } from '@/components/temple/DoorSectionBand';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AddToRitualPlus } from "@/components/rituals/AddToRitualButton";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import tsrBanner from "@/assets/sacred-rewrite-thumbnail.png.asset.json";
import mnlBanner from "@/assets/magic-not-logic-thumbnail.png.asset.json";
import areekeeraBanner from "@/assets/areekeera-thumbnail.png.asset.json";
import taoshBanner from "@/assets/taosh-thumbnail.png.asset.json";
import sacredSpreadsBanner from "@/assets/sacred-spreads-thumbnail.png.asset.json";
import companionCoursesBanner from "@/assets/companion-courses-header.png.asset.json";
import remembranceHeader from "@/assets/door-remembrance-header-v1.webp.asset.json";
import { DoorHeader } from "@/components/temple/DoorHeader";
import { htmlToPlainText } from "@/lib/richText";

interface Deck {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  image_color: string;
  thumbnail_url?: string | null;
  is_free: boolean;
  is_starter: boolean;
  woocommerce_product_id: string | null;
  woocommerce_product_id_premium: string | null;
  is_published?: boolean;
  location_id?: string | null;
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
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const scroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
      return false;
    };
    if (scroll()) return;
    const t = setTimeout(scroll, 300);
    return () => clearTimeout(t);
  }, [hash, decks.length]);

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
          <DoorHeader image={remembranceHeader.url} imageKey="door-remembrance-header" title="The Door of Remembrance" />
          <p className="text-muted-foreground font-sans text-base max-w-2xl mx-auto">
            <span className="font-bold text-primary-strong">A space to remember who you are beneath distortion, protection, and pattern.</span>
            <br />
            Begin at the foundation. Return whenever you need to.
          </p>
        </motion.div>
      </div>

      <DoorSectionBand door="remembrance" index={0}>
          <div id="mirrors-of-sacred-undoing" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto scroll-mt-24">
            {/* Sacred Spreads link card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => navigate('/remembrance/spreads')}
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

            {decks.filter(d => !d.is_starter && !d.location_id).map((deck, index) => {
              const bannerSrc = deck.thumbnail_url
                || (deck.name === "The Sacred Rewrite" ? tsrBanner.url
                : deck.name === "Magic not Logic" ? mnlBanner.url
                : deck.name === "AreekeerA" ? areekeeraBanner.url
                : deck.name === "The Art of Self-Healing" ? taoshBanner.url
                : null);

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
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        {deck.is_published === false && (
                          <Badge variant="outline" className="bg-background/90 text-xs">Draft</Badge>
                        )}
                        {deck.is_free && (
                          <Badge className="bg-primary/90 hover:bg-primary text-primary-foreground text-xs">Free</Badge>
                        )}
                        {deck.is_published !== false && (
                          <AddToRitualPlus item={{ kind: "deck", deckId: deck.id, name: deck.name }} />
                        )}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h2 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {deck.name}
                        </h2>
                        <div className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      </div>
                      {deck.theme && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                          {deck.theme}
                        </p>
                      )}
                      {deck.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {htmlToPlainText(deck.description)}
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
      </DoorSectionBand>
      <DoorSectionBand door="remembrance" index={1} legacyLocations={['loc-deepening-courses']}>
        <div className="text-center"><Button asChild variant="outline"><Link to="/remembrance/companion-courses"><BookOpen className="mr-2 h-4 w-4" />Companion Courses →</Link></Button></div>
      </DoorSectionBand>
      <DoorSectionBand door="remembrance" index={2} />


    </motion.div>
  );
};
