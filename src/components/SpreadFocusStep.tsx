import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GUIDING_QUESTION_MAX } from "@/lib/evidenceFramework";
import type { SpreadType } from "./SpreadSelection";

export const FOCUS_TOPICS: { label: string; heading: string; prompts: string[] }[] = [
  {
    label: "Overwhelmed & Burned Out",
    heading: "When feeling overwhelmed, tired, or burned out",
    prompts: [
      "Why does everything feel so heavy and exhausting right now?",
      "What am I carrying that isn’t actually mine to hold?",
      "What is my body trying to tell me that I keep ignoring?",
    ],
  },
  {
    label: "Tension & Self-Doubt",
    heading: "When caught in tension, fear, or self-doubt",
    prompts: [
      "Why do I feel like I have to do everything myself or everything will fall apart?",
      "Why am I so terrified to make this decision or take this next step?",
      "Where am I pushing or forcing when I need to soften?",
    ],
  },
  {
    label: "Relationships & Boundaries",
    heading: "When dealing with relationships, boundaries, or feeling reactive",
    prompts: [
      "Why am I feeling so reactive or on edge around this person?",
      "What am I struggling to admit or say out loud?",
      "Where am I giving away my energy just to keep the peace?",
    ],
  },
];

interface Props {
  spread: SpreadType;
  value: string;
  onChange: (value: string) => void;
  onDraw: (withQuestion: boolean) => void;
  onBack: () => void;
  drawing?: boolean;
}

export const SpreadFocusStep = ({ spread, value, onChange, onDraw, onBack, drawing }: Props) => {
  const [topic, setTopic] = useState<number | null>(null);
  const active = topic === null ? null : FOCUS_TOPICS[topic];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto py-8 space-y-8 text-center"
    >
      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack} className="font-sans">
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Spreads
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-center text-primary/60">{spread.icon}</div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">{spread.name}</h1>
        <ol className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground font-sans">
          <li className="text-primary font-semibold">1. Set your focus</li>
          <li>2. Reveal your cards</li>
          <li>3. Collect new evidence</li>
        </ol>
      </div>

      <div className="space-y-2">
        <h2 className="font-serif text-xl text-foreground">Hold a guiding question or focus in mind (optional)</h2>
        <p className="text-foreground/70 max-w-xl mx-auto">
          Bring what is actually alive for you right now—or explore a theme:
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {FOCUS_TOPICS.map((t, i) => (
          <Button
            key={t.label}
            type="button"
            variant={topic === i ? "default" : "outline"}
            aria-pressed={topic === i}
            onClick={() => setTopic(topic === i ? null : i)}
            className="font-sans font-bold"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {active && (
        <div className="text-left max-w-xl mx-auto space-y-2">
          <p className="font-serif font-bold text-foreground">{active.heading}:</p>
          {active.prompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`block w-full text-left rounded-lg border px-4 py-3 font-serif italic transition-colors ${
                value === p ? "border-primary bg-primary/10 text-foreground" : "border-border text-foreground/80 hover:border-primary/60"
              }`}
            >
              “{p}”
            </button>
          ))}
        </div>
      )}

      <div className="max-w-xl mx-auto text-left">
        <label htmlFor="spread-guiding-question" className="sr-only">Your guiding question</label>
        <Textarea
          id="spread-guiding-question"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, GUIDING_QUESTION_MAX))}
          rows={3}
          placeholder="Choose a question above, edit it, or write your own…"
        />
      </div>

      <div className="space-y-3">
        <Button size="lg" onClick={() => onDraw(true)} disabled={drawing} className="font-sans">
          <Sparkles className="w-4 h-4 mr-2" />Shuffle & Lay the Cards
        </Button>
        <div>
          <button
            type="button"
            disabled={drawing}
            onClick={() => onDraw(false)}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Skip and draw without a question
          </button>
        </div>
      </div>
    </motion.div>
  );
};
