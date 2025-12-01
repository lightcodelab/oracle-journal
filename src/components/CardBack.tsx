import cardBackImage from "@/assets/card-back-v2.png";

interface CardBackProps {
  imageSrc?: string;
}

export const CardBack = ({ imageSrc = cardBackImage }: CardBackProps) => {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <img 
        src={imageSrc} 
        alt="Card back" 
        className="w-full h-full object-cover"
      />
    </div>
  );
};
