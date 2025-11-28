import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hash } from "lucide-react";

interface CardNumberSelectorProps {
  onSelectCard: (cardNumber: number) => void;
  totalCards: number;
}

export const CardNumberSelector = ({ onSelectCard, totalCards }: CardNumberSelectorProps) => {
  const [cardNumber, setCardNumber] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(cardNumber);
    
    if (num >= 1 && num <= totalCards) {
      onSelectCard(num);
      setIsOpen(false);
      setCardNumber("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="border-border/50 hover:border-accent hover:bg-accent/10 font-semibold px-8 py-6 text-lg"
        >
          <Hash className="w-5 h-5 mr-2" />
          Go to Card Number
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Select Card Number</DialogTitle>
          <DialogDescription>
            Enter a card number (1-{totalCards}) to view that specific card
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              id="cardNumber"
              type="number"
              min={1}
              max={totalCards}
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder={`1-${totalCards}`}
              className="text-center text-lg"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            View Card
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
