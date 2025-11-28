import cardBackImage from "@/assets/card-back-v2.png";

export const CardBack = () => {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <img 
        src={cardBackImage} 
        alt="Card back" 
        className="w-full h-full object-cover"
      />
    </div>
  );
};
