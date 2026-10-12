import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

const CELESTIAL_DECK_NAMES = [
  "The Art of Self-Healing",
  "AreekeerA Energy Medicine",
];

interface DeckOption {
  id: string;
  name: string;
  thumbnail_url: string | null;
}

/**
 * "Draw a Card for Celestial Guidance" — shown on the Temple home page only
 * when the member's focus is Devotion. Links open the deck directly on
 * the Door of Remembrance via /remembrance?deck=<id>.
 */
export function CelestialGuidanceSection() {
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("decks")
        .select("id, name, thumbnail_url")
        .in("name", CELESTIAL_DECK_NAMES)
        .eq("is_published", true)
        .order("display_order");
      if (cancelled) return;
      setDecks((data as DeckOption[]) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || decks.length === 0) return null;

  return (
    <section
      id="celestial-guidance"
      aria-labelledby="celestial-guidance-heading"
      className="mb-12"
    >
      <h2
        id="celestial-guidance-heading"
        className="font-serif text-2xl text-foreground mb-3"
      >
        Draw a Card for Celestial Guidance
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
        {decks.map((deck) => (
          <Link
            key={deck.id}
            to={`/remembrance?deck=${deck.id}`}
            className="group flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {deck.thumbnail_url ? (
              <img
                src={deck.thumbnail_url}
                alt=""
                aria-hidden
                className="w-12 h-12 rounded-md object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" aria-hidden />
              </div>
            )}
            <span className="min-w-0">
              <span className="block font-serif text-foreground text-sm sm:text-base truncate">
                {deck.name}
              </span>
              <span className="block text-xs text-muted-foreground">
                Draw from Deck
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
