import { Sparkles } from "lucide-react";

export const CardBack = () => {
  return (
    <div className="relative w-full h-full bg-gradient-card border-2 border-primary/30 rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles className="w-24 h-24 text-accent animate-glow" />
      </div>
      <div className="absolute inset-0 border-4 border-accent/20 rounded-2xl m-4" />
    </div>
  );
};
