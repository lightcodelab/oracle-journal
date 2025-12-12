import { motion } from "framer-motion";
import { CardBack } from "./CardBack";
import sacredRewriteCardBack from "@/assets/card-back-v2.png";
import mnlCardBack from "@/assets/mnl-card-back.png";
import areekeeraCardBack from "@/assets/areekeera-card-back.png";
import taoshCardBack from "@/assets/taosh-card-back.png";

const cardBackImages = [
  sacredRewriteCardBack,
  mnlCardBack,
  areekeeraCardBack,
  taoshCardBack,
];

export const MultiDeckShuffleAnimation = () => {
  // Create cards cycling through all 4 deck card backs
  const cardCount = 8;
  const cards = Array.from({ length: cardCount }, (_, i) => ({
    index: i,
    cardBack: cardBackImages[i % cardBackImages.length],
  }));

  return (
    <div className="relative w-full h-[500px] flex items-center justify-center">
      {cards.map(({ index, cardBack }) => (
        <motion.div
          key={index}
          className="absolute w-64 h-80"
          initial={{
            x: 0,
            y: 0,
            rotate: 0,
            scale: 1,
            zIndex: index,
          }}
          animate={{
            x: [
              0,
              Math.sin(index * 1.2) * 150,
              Math.cos(index * 0.8) * -120,
              Math.sin(index * 1.5) * 100,
              0,
            ],
            y: [
              0,
              Math.cos(index * 1.2) * -80,
              Math.sin(index * 0.8) * 90,
              Math.cos(index * 1.5) * -70,
              0,
            ],
            rotate: [
              -index * 3,
              index * 15 - 45,
              -index * 18 + 30,
              index * 12 - 20,
              -index * 3,
            ],
            scale: [1, 0.95, 1.05, 0.98, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          <CardBack imageSrc={cardBack} />
        </motion.div>
      ))}
      
      <motion.div
        className="absolute text-center mt-96 pt-32"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <p className="text-2xl text-foreground/80 font-serif">
          Shuffling the cards...
        </p>
      </motion.div>
    </div>
  );
};
