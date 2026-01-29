import { OracleCard } from "@/data/oracleCards";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Sparkles, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { FormattedContent } from "./FormattedContent";
import { VimeoEmbed } from "./VimeoEmbed";
import ContextualJournal from "./journal/ContextualJournal";

interface CardDetailProps {
  card: OracleCard;
  onDrawAnother: () => void;
  hasPremiumAccess?: boolean;
  isStarterDeck?: boolean;
}

export const CardDetail = ({ card, onDrawAnother, hasPremiumAccess = false, isStarterDeck = false }: CardDetailProps) => {
  // Helper to get content from either JSON structure or legacy fields
  const getContent = (key: string): string | undefined => {
    return card.content_sections?.[key] || card[key as keyof OracleCard] as string | undefined;
  };

  const isAreekeerA = card.deck_name === 'AreekeerA';
  const isArtOfSelfHealing = card.deck_name === 'The Art of Self-Healing';
  const isSacredRewrite = card.deck_name === 'The Sacred Rewrite';
  const isMagicNotLogic = card.deck_name === 'Magic not Logic';
  
  // For Starter Collection, now show FULL content (changed from basic-only)
  const showBasicOnly = false;

  // Get deck badge color based on deck name
  const getDeckBadgeClass = () => {
    if (isSacredRewrite) return "bg-purple-600/80 text-white";
    if (isMagicNotLogic) return "bg-indigo-600/80 text-white";
    if (isAreekeerA) return "bg-emerald-600/80 text-white";
    if (isArtOfSelfHealing) return "bg-amber-600/80 text-white";
    return "bg-primary/80 text-primary-foreground";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      {/* Deck Origin Badge - only show in Starter Collection */}
      {isStarterDeck && card.deck_name && (
        <div className="flex justify-center">
          <Badge className={`${getDeckBadgeClass()} text-sm px-4 py-1`}>
            From: {card.deck_name}
          </Badge>
        </div>
      )}

      {/* Card Display */}
      <div className="flex justify-center">
        {card.image_file_name ? (
          <img 
            src={`/cards/${card.image_file_name}`} 
            alt={card.card_title}
            className="w-72 h-96 object-cover rounded-2xl border border-border shadow-lg"
          />
        ) : (
          <div className="w-72 h-96 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl border border-border shadow-lg p-6 flex flex-col items-center justify-center text-center">
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

          {/* Card Content - always shown */}
          {getContent('card_content') && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl text-foreground">Card Guidance</h3>
              </div>
              <FormattedContent content={getContent('card_content')!} className="text-foreground/90 font-sans leading-relaxed" />
            </div>
          )}

          {/* Exercise - only show if not in Starter Collection */}
          {!showBasicOnly && getContent('exercise') && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-serif text-xl text-foreground mb-4">
                {getContent('exercise_heading') || "Exercise"}
              </h3>
              <FormattedContent content={getContent('exercise')!} className="text-foreground/90 font-sans leading-relaxed" />
            </div>
          )}
        </>
      )}

      {/* Art of Self-Healing-specific content */}
      {isArtOfSelfHealing && (
        <>
          {/* Card Number */}
          <div className="text-center space-y-2">
            <h2 className="font-serif text-2xl font-semibold text-foreground">Card: {card.card_number}</h2>
          </div>

          {/* Teaching - always shown */}
          {getContent('teaching') && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl text-foreground">Teaching</h3>
              </div>
              <FormattedContent content={getContent('teaching')!} className="text-foreground/90 font-sans leading-relaxed" />
            </div>
          )}

          {/* Activity - only show if not in Starter Collection */}
          {!showBasicOnly && getContent('activity') && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-serif text-xl text-foreground mb-4">
                {getContent('activity_heading') || "Activity"}
              </h3>
              <FormattedContent content={getContent('activity')!} className="text-foreground/90 font-sans leading-relaxed" />
            </div>
          )}
        </>
      )}

      {/* Sacred Rewrite content - in correct order */}
      {isSacredRewrite && (
        <>
          {/* 1. The Card */}
          {getContent('card_details') && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl text-foreground">The Card</h3>
              </div>
              <FormattedContent content={getContent('card_details')!} className="text-foreground/90 font-sans leading-relaxed" />
            </div>
          )}

          {/* 2. Opening Invocation - only show if NOT in Starter Collection */}
          {!showBasicOnly && getContent('opening_invocation_content') && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-serif text-xl text-foreground mb-4">
                {getContent('opening_invocation_heading') || "Opening Invocation & Altar Ritual"}
              </h3>
              <FormattedContent content={getContent('opening_invocation_content')!} className="text-foreground/90 font-sans leading-relaxed" />
            </div>
          )}

          {/* 3. Spiral of Inquiry (always shown for basic version) */}
          {getContent('spiral_of_inquiry_content') && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-serif text-xl text-foreground mb-4">
                {getContent('spiral_of_inquiry_heading') || "Spiral of Inquiry"}
              </h3>
              <FormattedContent content={getContent('spiral_of_inquiry_content')!} className="text-foreground/90 font-sans leading-relaxed" />
            </div>
          )}

          {/* Additional content - only shown if NOT in Starter Collection */}
          {!showBasicOnly && (
            <>
              {/* 4. Acknowledgement */}
              {getContent('acknowledgement_content') && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-serif text-xl text-foreground mb-4">
                    {getContent('acknowledgement_heading') || "Acknowledgement of Distortion as Protection"}
                  </h3>
                  <FormattedContent content={getContent('acknowledgement_content')!} className="text-foreground/90 font-sans leading-relaxed" />
                </div>
              )}

              {/* 5. Spiral of Seeing */}
              {getContent('spiral_of_seeing_content') && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-serif text-xl text-foreground mb-4">
                    {getContent('spiral_of_seeing_heading') || "Spiral of Seeing"}
                  </h3>
                  <FormattedContent content={getContent('spiral_of_seeing_content')!} className="text-foreground/90 font-sans leading-relaxed" />
                </div>
              )}

              {/* 6. Living Inquiry */}
              {getContent('living_inquiry_content') && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-serif text-xl text-foreground mb-4">
                    {getContent('living_inquiry_heading') || "Living Inquiry"}
                  </h3>
                  <FormattedContent content={getContent('living_inquiry_content')!} className="text-foreground/90 font-sans leading-relaxed" />
                </div>
              )}

              {/* 7. Guided Audio */}
              {getContent('guided_audio_content') && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-serif text-xl text-foreground mb-4">
                    {getContent('guided_audio_heading') || "Guided Audio Journey"}
                  </h3>
                  <FormattedContent content={getContent('guided_audio_content')!} className="text-foreground/90 font-sans leading-relaxed" />
                </div>
              )}

              {/* 8. Premium Content - Embodiment Ritual */}
              {hasPremiumAccess && getContent('embodiment_ritual_content') && (
                <div className="bg-card border border-primary/30 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    <h3 className="font-serif text-xl text-foreground">
                      {getContent('embodiment_ritual_heading') || "Embodiment Ritual"}
                    </h3>
                  </div>
                  <FormattedContent content={getContent('embodiment_ritual_content')!} className="text-foreground/90 font-sans leading-relaxed" />
                </div>
              )}

              {/* 9. Benediction */}
              {getContent('benediction_content') && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-serif text-xl text-foreground mb-4">
                    {getContent('benediction_heading') || "Closing Benediction"}
                  </h3>
                  <FormattedContent content={getContent('benediction_content')!} className="text-foreground/90 font-sans leading-relaxed" />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Magic not Logic - Card Details */}
      {isMagicNotLogic && getContent('card_details') && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-serif text-xl text-foreground">The Card</h3>
          </div>
          <FormattedContent content={getContent('card_details')!} className="text-foreground/90 font-sans leading-relaxed" />
        </div>
      )}

      {isMagicNotLogic && !showBasicOnly && (
        <>
          {/* Journalling Activity */}
          {getContent('journalling_activity') && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-serif text-xl text-foreground mb-4">
                {getContent('journalling_activity_heading') || "Journalling Activity"}
              </h3>
              <FormattedContent content={getContent('journalling_activity')!} className="text-foreground/90 font-sans leading-relaxed" />
            </div>
          )}

          {/* Vimeo Video Section */}
          {getContent('vimeo_video') && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-serif text-xl text-foreground mb-4">
                Clearing Video
              </h3>
              <VimeoEmbed 
                videoId={getContent('vimeo_video')!} 
                title={`${card.card_title} - Clearing Video`}
              />
            </div>
          )}
        </>
      )}

      {/* Digital Journal Section */}
      <ContextualJournal
        contextType="card"
        contextId={card.id}
        contextTitle={`${card.deck_name || 'Card'}: ${card.card_title}`}
        placeholder="Reflect on what this card means to you..."
        className="mt-8"
      />

      {/* Back/Draw Another Button */}
      <div className="flex justify-center pt-4 border-t border-border mt-8">
        <Button
          onClick={onDrawAnother}
          variant="ghost"
          className="text-foreground/70 hover:text-foreground font-sans"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {isStarterDeck ? 'Back to Reading' : 'Draw Another Card'}
        </Button>
      </div>
    </motion.div>
  );
};
