import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CardBack } from "./CardBack";
import { Button } from "@/components/ui/button";

interface ShuffleAnimationProps {
  cardBackImage?: string;
  onComplete?: () => void;
  onReveal?: () => void;
}

export const ShuffleAnimation = ({ cardBackImage, onComplete, onReveal }: ShuffleAnimationProps) => {
  const reduceMotion = useReducedMotion();
  const [settled, setSettled] = useState(false);

  return (
    <div className="w-full flex flex-col items-center gap-6 py-8" aria-label={settled ? 'Your card awaits' : 'Drawing your card'}>
      <h2 className="font-serif text-3xl sm:text-4xl text-foreground h-12 text-center">
        {settled ? 'Your Card Awaits' : 'Drawing your card…'}
      </h2>
      <div className="relative w-full max-w-lg h-[380px] sm:h-[450px] flex items-center justify-center perspective-1000">
      {[-1, 1].map((side) => (
        <motion.div
          key={side}
          className="absolute w-48 sm:w-64 aspect-[7/10] pointer-events-none"
          initial={{ x: 0, y: 12, rotate: 0 }}
          animate={{ x: side * 48, y: 30, rotate: side * 17 }}
          transition={{ duration: reduceMotion ? 0 : 1.6, ease: 'easeOut' }}
          aria-hidden="true"
        >
          <CardBack imageSrc={cardBackImage} />
        </motion.div>
      ))}
      <motion.div
        className="relative z-10 w-56 sm:w-72 aspect-[7/10]"
        animate={settled && !reduceMotion ? { y: [0, -5, 0], rotate: [0, 0.7, 0] } : { y: 0, rotate: 0 }}
        transition={{ duration: 5, repeat: settled && !reduceMotion ? Infinity : 0, ease: 'easeInOut' }}
      >
        <motion.div
          className="w-full h-full"
          initial={{ rotateY: 0, scale: 0.94 }}
          animate={{ rotateY: reduceMotion ? 0 : 720, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 2.4, ease: [0.22, 0.65, 0.3, 1] }}
          onAnimationComplete={() => {
            if (settled) return;
            setSettled(true);
            onComplete?.();
          }}
        >
          <Button
            variant="ghost"
            disabled={!settled}
            onClick={onReveal}
            aria-label="Reveal your card"
            className="block w-full h-full p-0 rounded-2xl shadow-lg hover:bg-transparent disabled:opacity-100"
          >
            <CardBack imageSrc={cardBackImage} />
          </Button>
        </motion.div>
      </motion.div>
      </div>
      <p className="text-foreground/70 text-lg h-7" role="status">
        {settled ? 'Click the card to reveal' : ' '}
      </p>
    </div>
  );
};
