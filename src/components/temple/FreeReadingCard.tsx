import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * The shared "Free Reading: One Card" card, shown to visitors on the
 * homepage doors grid and at the bottom of /join.
 */
export function FreeReadingCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-3xl mx-auto"
    >
      <Link
        to="/sacred-spreads"
        className="group block rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6 transition-colors hover:border-primary/60 hover:bg-primary/15"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-serif text-xl mb-2 group-hover:text-primary transition-colors">
              Free Reading: One Card
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Draw a single card for guidance on any question. No membership
              required — experience the wisdom of the decks before you join.
            </p>
            <div className="flex items-center gap-2 text-sm text-primary">
              <span>Draw your card</span>
              <span aria-hidden="true">→</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
