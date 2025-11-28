import { useState } from "react";
import { OracleCard } from "@/data/oracleCards";
import { CardBack } from "./CardBack";
import { motion } from "framer-motion";

interface OracleCardComponentProps {
  card: OracleCard;
  isRevealed: boolean;
  onClick?: () => void;
}

export const OracleCardComponent = ({ card, isRevealed, onClick }: OracleCardComponentProps) => {
  const [isFlipping, setIsFlipping] = useState(false);

  const handleClick = () => {
    if (!isRevealed && onClick) {
      setIsFlipping(true);
      setTimeout(() => {
        onClick();
        setIsFlipping(false);
      }, 300);
    }
  };

  return (
    <motion.div
      className="w-72 h-96 cursor-pointer perspective-1000"
      onClick={handleClick}
      whileHover={!isRevealed ? { scale: 1.05 } : {}}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="relative w-full h-full transition-transform duration-600 preserve-3d"
        animate={{ rotateY: isRevealed ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* Back of card */}
        <div className="absolute w-full h-full backface-hidden">
          <CardBack />
        </div>

        {/* Front of card */}
        <div className="absolute w-full h-full backface-hidden" style={{ transform: "rotateY(180deg)" }}>
          {card.image_file_name ? (
            <img 
              src={`/cards/${card.image_file_name}`} 
              alt={card.card_title}
              className="w-full h-full object-cover rounded-2xl border-2 border-accent/50 shadow-glow"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl border-2 border-accent/50 shadow-glow p-6 flex flex-col items-center justify-center text-center">
              <h2 className="font-serif text-3xl font-bold text-primary-foreground mb-4">
                {card.card_title}
              </h2>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
