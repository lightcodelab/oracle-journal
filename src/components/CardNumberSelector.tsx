import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Hash } from "lucide-react";

interface CardNumberSelectorProps {
  onSelectCard: (cardNumber: number) => void;
  totalCards: number;
}

export const CardNumberSelector = ({ onSelectCard, totalCards }: CardNumberSelectorProps) => {
  const cardNumbers = Array.from({ length: totalCards }, (_, i) => i + 1);

  const handleValueChange = (value: string) => {
    const cardNumber = parseInt(value);
    onSelectCard(cardNumber);
  };

  return (
    <Select onValueChange={handleValueChange}>
      <SelectTrigger className="w-full sm:w-[280px] border-border/50 hover:border-accent hover:bg-accent/10 hover:text-primary font-semibold px-8 py-6 text-lg h-auto">
        <Hash className="w-5 h-5 mr-2" />
        <SelectValue placeholder="Go to Card Number" />
      </SelectTrigger>
      <SelectContent className="max-h-[400px] bg-card">
        {cardNumbers.map((num) => (
          <SelectItem 
            key={num} 
            value={num.toString()}
            className="py-3"
          >
            <span className="font-semibold">Card {num}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
