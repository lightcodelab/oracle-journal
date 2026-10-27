import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadingFocusQuestions } from "@/components/ReadingFocusQuestions";
import type { SpreadType } from "./SpreadSelection";

interface Props {
  spread: SpreadType;
  value: string;
  onChange: (value: string) => void;
  onDraw: (withQuestion: boolean) => void;
  onBack: () => void;
  drawing?: boolean;
}

export const SpreadFocusStep = ({ spread, value, onChange, onDraw, onBack, drawing }: Props) => {
  const [choice, setChoice] = useState("none");
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto py-8 space-y-10 text-center">
    <div className="flex justify-start"><Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" />Back to Spreads</Button></div>
    <div className="space-y-4">
      <div className="flex items-center justify-center text-primary/60">{spread.icon}</div>
      <h1 className="font-serif text-3xl md:text-4xl text-foreground">{spread.name}</h1>
      <p className="text-muted-foreground leading-relaxed">{spread.description}</p>
      <h2 className="font-serif text-2xl text-primary">Welcome. There is room for all of you here.</h2>
    </div>
    <ol className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8 list-decimal pl-6 text-left font-serif text-lg leading-relaxed marker:text-primary">
      <li className="pl-2">Sit quietly for a moment. Bring to mind whatever is sitting heaviest in your business right now.</li>
      <li className="pl-2">Let one of the questions below find you. You don't need to answer it. Just hold it.</li>
      <li className="pl-2">Draw your cards. Let them show you what is ready to be named.</li>
    </ol>
    <ReadingFocusQuestions idPrefix="spread" plural choice={choice} value={value} onChoiceChange={setChoice} onChange={onChange} />
    <p className="font-serif text-xl leading-relaxed">You've done the work. Something is still running beneath it. This is where it gets named.</p>
    <Button size="lg" onClick={() => onDraw(choice !== "none")} disabled={drawing}><Sparkles className="w-4 h-4 mr-2" />{drawing ? "Preparing your cards…" : "Shuffle & Lay the Cards"}</Button>
  </motion.div>;
};
