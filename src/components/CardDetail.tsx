import { OracleCard } from "@/data/oracleCards";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Sparkles, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface CardDetailProps {
  card: OracleCard;
  onDrawAnother: () => void;
  hasPremiumAccess?: boolean;
}

export const CardDetail = ({ card, onDrawAnother, hasPremiumAccess = false }: CardDetailProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      {/* Card Display */}
      <div className="flex justify-center">
        <div className={`w-72 h-96 bg-gradient-to-br ${card.imageColor} rounded-2xl border-2 border-accent/50 shadow-glow p-6 flex flex-col items-center justify-center text-center`}>
          <h2 className="font-serif text-3xl font-bold text-primary-foreground mb-4">
            {card.name}
          </h2>
          <p className="text-primary-foreground/90 text-lg italic">
            {card.meaning}
          </p>
        </div>
      </div>

      {/* Meaning Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-accent" />
          <h3 className="font-serif text-2xl font-semibold text-foreground">Card Meaning</h3>
        </div>
        <p className="text-foreground/80 leading-relaxed text-lg">
          {card.description}
        </p>
      </Card>

      {/* Journaling Prompts */}
      <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
        <h3 className="font-serif text-2xl font-semibold text-foreground mb-6">
          Journaling Prompts
        </h3>
        <div className="space-y-4">
          {card.journalPrompts.map((prompt, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex gap-4"
            >
              <span className="text-accent font-semibold text-lg flex-shrink-0">
                {index + 1}.
              </span>
              <p className="text-foreground/80 leading-relaxed">
                {prompt}
              </p>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Premium Content - Embodiment */}
      {hasPremiumAccess && card.embodimentContent && (
        <Card className="bg-card/50 backdrop-blur-sm border-accent/30 p-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-accent animate-pulse" />
            <h3 className="font-serif text-2xl font-semibold text-foreground">Embodiment Practice</h3>
          </div>
          <p className="text-foreground/80 leading-relaxed text-lg whitespace-pre-wrap">
            {card.embodimentContent}
          </p>
        </Card>
      )}

      {/* Premium Content - Meditation */}
      {hasPremiumAccess && card.meditationAudioUrl && (
        <Card className="bg-card/50 backdrop-blur-sm border-accent/30 p-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-accent animate-pulse" />
            <h3 className="font-serif text-2xl font-semibold text-foreground">Guided Meditation</h3>
          </div>
          <audio controls className="w-full" src={card.meditationAudioUrl}>
            Your browser does not support the audio element.
          </audio>
        </Card>
      )}

      {/* Draw Another Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={onDrawAnother}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg shadow-glow"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Draw Another Card
        </Button>
      </div>
    </motion.div>
  );
};
