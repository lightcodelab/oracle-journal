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
        {card.image_file_name ? (
          <img 
            src={`/cards/${card.image_file_name}`} 
            alt={card.card_title}
            className="w-72 h-96 object-cover rounded-2xl border-2 border-accent/50 shadow-glow"
          />
        ) : (
          <div className="w-72 h-96 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl border-2 border-accent/50 shadow-glow p-6 flex flex-col items-center justify-center text-center">
            <h2 className="font-serif text-3xl font-bold text-primary-foreground mb-4">
              {card.card_title}
            </h2>
          </div>
        )}
      </div>

      {/* Card Details Section */}
      {card.card_details && (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-accent" />
            <h3 className="font-serif text-2xl font-semibold text-foreground">The Card</h3>
          </div>
          <div className="text-foreground/80 leading-relaxed text-lg space-y-4">
            {card.card_details.split('\n').map((paragraph, idx) => (
              paragraph.trim() && <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </Card>
      )}

      {/* Opening Invocation */}
      {card.opening_invocation_content && (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
          <h3 className="font-serif text-2xl font-semibold text-foreground mb-6">
            {card.opening_invocation_heading || "Opening Invocation"}
          </h3>
          <div className="text-foreground/80 leading-relaxed text-lg space-y-4">
            {card.opening_invocation_content.split('\n').map((paragraph, idx) => (
              paragraph.trim() && <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </Card>
      )}

      {/* Spiral of Inquiry */}
      {card.spiral_of_inquiry_content && (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
          <h3 className="font-serif text-2xl font-semibold text-foreground mb-6">
            {card.spiral_of_inquiry_heading || "Spiral of Inquiry"}
          </h3>
          <div className="text-foreground/80 leading-relaxed text-lg space-y-4">
            {card.spiral_of_inquiry_content.split('\n').map((paragraph, idx) => (
              paragraph.trim() && <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </Card>
      )}

      {/* Acknowledgement */}
      {card.acknowledgement_content && (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
          <h3 className="font-serif text-2xl font-semibold text-foreground mb-6">
            {card.acknowledgement_heading || "Acknowledgement"}
          </h3>
          <div className="text-foreground/80 leading-relaxed text-lg space-y-4">
            {card.acknowledgement_content.split('\n').map((paragraph, idx) => (
              paragraph.trim() && <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </Card>
      )}

      {/* Spiral of Seeing */}
      {card.spiral_of_seeing_content && (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
          <h3 className="font-serif text-2xl font-semibold text-foreground mb-6">
            {card.spiral_of_seeing_heading || "Spiral of Seeing"}
          </h3>
          <div className="text-foreground/80 leading-relaxed text-lg space-y-4">
            {card.spiral_of_seeing_content.split('\n').map((paragraph, idx) => (
              paragraph.trim() && <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </Card>
      )}

      {/* Living Inquiry */}
      {card.living_inquiry_content && (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
          <h3 className="font-serif text-2xl font-semibold text-foreground mb-6">
            {card.living_inquiry_heading || "Living Inquiry"}
          </h3>
          <div className="text-foreground/80 leading-relaxed text-lg space-y-4">
            {card.living_inquiry_content.split('\n').map((paragraph, idx) => (
              paragraph.trim() && <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </Card>
      )}

      {/* Guided Audio */}
      {card.guided_audio_content && (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
          <h3 className="font-serif text-2xl font-semibold text-foreground mb-6">
            {card.guided_audio_heading || "Guided Audio Journey"}
          </h3>
          <div className="text-foreground/80 leading-relaxed text-lg space-y-4">
            {card.guided_audio_content.split('\n').map((paragraph, idx) => (
              paragraph.trim() && <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </Card>
      )}

      {/* Premium Content - Embodiment Ritual */}
      {hasPremiumAccess && card.embodiment_ritual_content && (
        <Card className="bg-card/50 backdrop-blur-sm border-accent/30 p-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-accent animate-pulse" />
            <h3 className="font-serif text-2xl font-semibold text-foreground">
              {card.embodiment_ritual_heading || "Embodiment Ritual"}
            </h3>
          </div>
          <div className="text-foreground/80 leading-relaxed text-lg space-y-4">
            {card.embodiment_ritual_content.split('\n').map((paragraph, idx) => (
              paragraph.trim() && <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </Card>
      )}

      {/* Benediction */}
      {card.benediction_content && (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
          <h3 className="font-serif text-2xl font-semibold text-foreground mb-6">
            {card.benediction_heading || "Closing Benediction"}
          </h3>
          <div className="text-foreground/80 leading-relaxed text-lg space-y-4">
            {card.benediction_content.split('\n').map((paragraph, idx) => (
              paragraph.trim() && <p key={idx}>{paragraph}</p>
            ))}
          </div>
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
