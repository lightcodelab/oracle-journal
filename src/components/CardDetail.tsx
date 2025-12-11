import { OracleCard } from "@/data/oracleCards";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Sparkles, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { FormattedContent } from "./FormattedContent";
import { VimeoEmbed } from "./VimeoEmbed";

interface CardDetailProps {
  card: OracleCard;
  onDrawAnother: () => void;
  hasPremiumAccess?: boolean;
}

export const CardDetail = ({ card, onDrawAnother, hasPremiumAccess = false }: CardDetailProps) => {
  // Helper to get content from either JSON structure or legacy fields
  const getContent = (key: string): string | undefined => {
    return card.content_sections?.[key] || card[key as keyof OracleCard] as string | undefined;
  };

  const isAreekeerA = card.deck_name === 'AreekeerA';
  const isArtOfSelfHealing = card.deck_name === 'The Art of Self-Healing';

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

      {/* AreekeerA-specific content */}
      {isAreekeerA && (
        <>
          {/* Card Heading (card_title) and Subtitle */}
          <div className="text-center space-y-2">
            <h2 className="font-serif text-2xl font-semibold text-foreground">{card.card_title}</h2>
            {getContent('card_subtitle') && (
              <p className="font-serif text-xl italic text-foreground/70">{getContent('card_subtitle')}</p>
            )}
          </div>

          {/* Card Content */}
          {getContent('card_content') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-accent" />
                <h3 className="font-serif text-3xl font-semibold text-foreground">Card Guidance</h3>
              </div>
              <FormattedContent content={getContent('card_content')!} className="text-foreground/80 text-lg" />
            </Card>
          )}

          {/* Exercise */}
          {getContent('exercise') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <h3 className="font-serif text-3xl font-semibold text-foreground mb-6">
                {getContent('exercise_heading') || "Exercise"}
              </h3>
              <FormattedContent content={getContent('exercise')!} className="text-foreground/80 text-lg" />
            </Card>
          )}
        </>
      )}

      {/* Art of Self-Healing-specific content */}
      {isArtOfSelfHealing && (
        <>
          {/* Card Title */}
          <div className="text-center space-y-2">
            <h2 className="font-serif text-2xl font-semibold text-foreground">{card.card_title}</h2>
          </div>

          {/* Teaching */}
          {getContent('teaching') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-accent" />
                <h3 className="font-serif text-3xl font-semibold text-foreground">Teaching</h3>
              </div>
              <FormattedContent content={getContent('teaching')!} className="text-foreground/80 text-lg" />
            </Card>
          )}

          {/* Activity */}
          {getContent('activity') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <h3 className="font-serif text-3xl font-semibold text-foreground mb-6">
                {getContent('activity_heading') || "Activity"}
              </h3>
              <FormattedContent content={getContent('activity')!} className="text-foreground/80 text-lg" />
            </Card>
          )}
        </>
      )}

      {/* Card Details Section (non-AreekeerA and non-Art of Self-Healing decks) */}
      {!isAreekeerA && !isArtOfSelfHealing && getContent('card_details') && (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-accent" />
            <h3 className="font-serif text-3xl font-semibold text-foreground">The Card</h3>
          </div>
          <FormattedContent content={getContent('card_details')!} className="text-foreground/80 text-lg" />
        </Card>
      )}

      {/* Sacred Rewrite-specific content */}
      {!isAreekeerA && !isArtOfSelfHealing && (
        <>
          {/* Opening Invocation */}
          {getContent('opening_invocation_content') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <h3 className="font-serif text-3xl font-semibold text-foreground mb-6">
                {getContent('opening_invocation_heading') || "Opening Invocation"}
              </h3>
              <FormattedContent content={getContent('opening_invocation_content')!} className="text-foreground/80 text-lg" />
            </Card>
          )}

          {/* Spiral of Inquiry */}
          {getContent('spiral_of_inquiry_content') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <h3 className="font-serif text-3xl font-semibold text-foreground mb-6">
                {getContent('spiral_of_inquiry_heading') || "Spiral of Inquiry"}
              </h3>
              <FormattedContent content={getContent('spiral_of_inquiry_content')!} className="text-foreground/80 text-lg" />
            </Card>
          )}

          {/* Acknowledgement */}
          {getContent('acknowledgement_content') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <h3 className="font-serif text-3xl font-semibold text-foreground mb-6">
                {getContent('acknowledgement_heading') || "Acknowledgement"}
              </h3>
              <FormattedContent content={getContent('acknowledgement_content')!} className="text-foreground/80 text-lg" />
            </Card>
          )}

          {/* Spiral of Seeing */}
          {getContent('spiral_of_seeing_content') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <h3 className="font-serif text-3xl font-semibold text-foreground mb-6">
                {getContent('spiral_of_seeing_heading') || "Spiral of Seeing"}
              </h3>
              <FormattedContent content={getContent('spiral_of_seeing_content')!} className="text-foreground/80 text-lg" />
            </Card>
          )}
        </>
      )}

      {/* Sacred Rewrite continued - Living Inquiry, Guided Audio, Embodiment, Benediction */}
      {!isAreekeerA && !isArtOfSelfHealing && (
        <>
          {/* Living Inquiry */}
          {getContent('living_inquiry_content') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <h3 className="font-serif text-3xl font-semibold text-foreground mb-6">
                {getContent('living_inquiry_heading') || "Living Inquiry"}
              </h3>
              <FormattedContent content={getContent('living_inquiry_content')!} className="text-foreground/80 text-lg" />
            </Card>
          )}

          {/* Guided Audio */}
          {getContent('guided_audio_content') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <h3 className="font-serif text-3xl font-semibold text-foreground mb-6">
                {getContent('guided_audio_heading') || "Guided Audio Journey"}
              </h3>
              <FormattedContent content={getContent('guided_audio_content')!} className="text-foreground/80 text-lg" />
            </Card>
          )}

          {/* Premium Content - Embodiment Ritual */}
          {hasPremiumAccess && getContent('embodiment_ritual_content') && (
            <Card className="bg-card/50 backdrop-blur-sm border-accent/30 p-8">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-accent animate-pulse" />
                <h3 className="font-serif text-3xl font-semibold text-foreground">
                  {getContent('embodiment_ritual_heading') || "Embodiment Ritual"}
                </h3>
              </div>
              <FormattedContent content={getContent('embodiment_ritual_content')!} className="text-foreground/80 text-lg" />
            </Card>
          )}

          {/* Benediction */}
          {getContent('benediction_content') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <h3 className="font-serif text-3xl font-semibold text-foreground mb-6">
                {getContent('benediction_heading') || "Closing Benediction"}
              </h3>
              <FormattedContent content={getContent('benediction_content')!} className="text-foreground/80 text-lg" />
            </Card>
          )}

          {/* Journalling Activity (Magic not Logic) */}
          {getContent('journalling_activity') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <h3 className="font-serif text-3xl font-semibold text-foreground mb-6">
                {getContent('journalling_activity_heading') || "Journalling Activity"}
              </h3>
              <FormattedContent content={getContent('journalling_activity')!} className="text-foreground/80 text-lg" />
            </Card>
          )}

          {/* Vimeo Video Section (Magic not Logic) */}
          {getContent('vimeo_video') && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30 p-8">
              <h3 className="font-serif text-3xl font-semibold text-foreground mb-6">
                Clearing Video
              </h3>
              <VimeoEmbed 
                videoId={getContent('vimeo_video')!} 
                title={`${card.card_title} - Clearing Video`}
              />
            </Card>
          )}
        </>
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
