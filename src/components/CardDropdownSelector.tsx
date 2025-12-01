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

interface CardDropdownSelectorProps {
  deckId: string;
  onSelectCard: (cardNumber: number) => void;
}

export const CardDropdownSelector = ({ deckId, onSelectCard }: CardDropdownSelectorProps) => {
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

  const getCardClearingText = (card: OracleCard): string => {
    if (card.content_sections) {
      const sections = card.content_sections as any;
      if (sections.clearing_statement) {
        // Extract first line or first 60 characters of clearing statement
        const text = sections.clearing_statement;
        const firstLine = text.split('\n')[0];
        return firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
      }
    }
    return `Card ${card.card_number}`;
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
      <SelectTrigger className="w-full sm:w-[400px] border-border/50 hover:border-accent hover:bg-accent/10 font-semibold px-8 py-6 text-lg h-auto">
        <Hash className="w-5 h-5 mr-2" />
        <SelectValue placeholder="Select a Clearing" />
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {cards.map((card) => (
          <SelectItem 
            key={card.id} 
            value={card.card_number.toString()}
            className="py-3"
          >
            <div className="flex flex-col items-start">
              <span className="font-semibold text-sm text-muted-foreground">
                Card {card.card_number}
              </span>
              <span className="text-sm">
                {getCardClearingText(card)}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
