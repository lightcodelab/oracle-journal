import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Layers, Sun, Moon, Heart, Compass, Eye } from "lucide-react";

export interface SpreadType {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  positions: string[];
  icon: React.ReactNode;
}

export const SPREAD_TYPES: SpreadType[] = [
  {
    id: "past-present-future",
    name: "Past, Present, Future",
    description: "Illuminate the thread of your journey — what shaped you, what holds you now, and what is emerging.",
    cardCount: 3,
    positions: ["Past", "Present", "Future"],
    icon: <Layers className="w-5 h-5" />,
  },
  {
    id: "daily-guidance",
    name: "Daily Guidance",
    description: "A single card to anchor your day. Let Source speak one truth to carry with you.",
    cardCount: 1,
    positions: ["Your Guidance"],
    icon: <Sun className="w-5 h-5" />,
  },
  {
    id: "mind-body-spirit",
    name: "Mind, Body, Spirit",
    description: "A holistic mirror — what your mind is processing, your body is holding, and your spirit is calling for.",
    cardCount: 3,
    positions: ["Mind", "Body", "Spirit"],
    icon: <Heart className="w-5 h-5" />,
  },
  {
    id: "situation-challenge-advice",
    name: "Situation, Challenge, Guidance",
    description: "When you need clarity on a specific situation — what is, what resists, and what to trust.",
    cardCount: 3,
    positions: ["Situation", "Challenge", "Guidance"],
    icon: <Compass className="w-5 h-5" />,
  },
  {
    id: "shadow-and-light",
    name: "Shadow & Light",
    description: "Two mirrors — one revealing what is hidden, the other showing the gift waiting inside it.",
    cardCount: 2,
    positions: ["Shadow", "Light"],
    icon: <Moon className="w-5 h-5" />,
  },
  {
    id: "inner-compass",
    name: "The Inner Compass",
    description: "Four directions of inner knowing — what to release, what to nurture, what to trust, and where to walk.",
    cardCount: 4,
    positions: ["Release", "Nurture", "Trust", "Walk Toward"],
    icon: <Eye className="w-5 h-5" />,
  },
];

interface SpreadSelectionProps {
  onSelectSpread: (spread: SpreadType) => void;
}

export const SpreadSelection = ({ onSelectSpread }: SpreadSelectionProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
      {SPREAD_TYPES.map((spread, index) => (
        <motion.div
          key={spread.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.08 }}
          onClick={() => onSelectSpread(spread)}
          className="group cursor-pointer"
        >
          <div className="bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:border-primary/30 h-full">
            {/* Visual header */}
            <div className="aspect-[3/1] w-full bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 flex items-center justify-center relative overflow-hidden">
              <div className="flex gap-2 items-center">
                {Array.from({ length: spread.cardCount }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-8 h-12 md:w-10 md:h-14 rounded-md bg-primary/30 border border-primary/40 shadow-sm"
                    initial={{ rotate: -10 + i * 5 }}
                    whileHover={{ y: -4 }}
                    transition={{ delay: i * 0.05 }}
                  />
                ))}
              </div>
              <div className="absolute top-2 right-2 text-primary/60">
                {spread.icon}
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                  {spread.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                {spread.description}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {spread.cardCount} {spread.cardCount === 1 ? "Card" : "Cards"}
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
