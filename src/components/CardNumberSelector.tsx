import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Hash } from "lucide-react";
import type { OracleCard } from "@/data/oracleCards";

interface CardNumberSelectorProps {
  onSelectCard: (cardNumber: number) => void;
  deckId: string;
  deckName: string;
}

export const CardNumberSelector = ({ onSelectCard, deckId, deckName }: CardNumberSelectorProps) => {
  const [cards, setCards] = useState<OracleCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('deck_id', deckId)
        .order('card_number');

      if (error) {
        console.error('Error fetching cards:', error);
      } else {
        setCards((data as OracleCard[]) || []);
      }
      setLoading(false);
    };

    fetchCards();
  }, [deckId]);

  const getCardTitle = (card: OracleCard): string => {
    const sections = card.content_sections as any;
    
    // AreekeerA - use card_title (one-word titles like "CHERUBIC", "WISE", etc.)
    if (deckName === 'AreekeerA') {
      return card.card_title || '';
    }
    
    // Art of Self-Healing - extract from activity_heading after "Exercise" or "Template"
    if (deckName === 'The Art of Self-Healing') {
      if (sections?.activity_heading) {
        const heading = sections.activity_heading as string;
        // Remove "Exercise:" or "Template:" prefix and trim
        const cleaned = heading
          .replace(/^Exercise:\s*/i, '')
          .replace(/^Template:\s*/i, '')
          .trim();
        return cleaned;
      }
      return '';
    }
    
    // Sacred Rewrite - use card_title
    if (card.card_title) {
      return card.card_title;
    }
    
    return '';
  };

  const handleValueChange = (value: string) => {
    const cardNumber = parseInt(value);
    onSelectCard(cardNumber);
  };

  if (loading) {
    return null;
  }

  return (
    <Select onValueChange={handleValueChange}>
      <SelectTrigger className="w-full sm:w-[400px] border-border/50 hover:border-accent hover:bg-accent/10 hover:text-primary font-semibold px-8 py-6 text-lg h-auto">
        <Hash className="w-5 h-5 mr-2" />
        <SelectValue placeholder="Go to Card Number" />
      </SelectTrigger>
      <SelectContent className="max-h-[400px] bg-card">
        {cards.map((card) => {
          const title = getCardTitle(card);
          return (
            <SelectItem 
              key={card.id} 
              value={card.card_number.toString()}
              className="py-3"
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold text-sm text-muted-foreground">
                  Card {card.card_number}
                </span>
                {title && (
                  <span className="text-sm">
                    {title}
                  </span>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
