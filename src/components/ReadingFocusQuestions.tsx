import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { GUIDING_QUESTION_MAX } from "@/lib/evidenceFramework";
import { REVELATIONS_QUESTIONS } from "@/lib/readingFocus";

interface Props {
  idPrefix: string;
  choice: string;
  value: string;
  onChoiceChange: (choice: string) => void;
  onChange: (value: string) => void;
  plural?: boolean;
}

export function ReadingFocusQuestions({ idPrefix, choice, value, onChoiceChange, onChange, plural = false }: Props) {
  return <section aria-label="Choose your guiding focus" className="bg-muted/40 px-5 pt-10 pb-8 sm:px-8 sm:pt-12 text-left">
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-5 sm:gap-10">
      <div className="sm:col-span-2">
        <p id={`${idPrefix}-focus-introduction`} className="text-muted-foreground leading-relaxed">
          Before you draw your {plural ? "cards" : "card"}, you might like to bring one of these questions into your reading.<br /><br /><br />
          You don't need to arrive with a question, but if it helps to focus the reading, here are some places other women have found it useful to begin.<br /><br /><br />
          Click what pulls at you, or bring whatever is sitting heaviest on your heart right now.
        </p>
      </div>
      <div className="sm:col-span-3">
        <RadioGroup aria-label="Guiding focus for your reading" aria-describedby={`${idPrefix}-focus-introduction`} value={choice} onValueChange={next => { onChoiceChange(next); onChange(next === "none" || next === "own" ? "" : next); }} className="gap-5">
          {REVELATIONS_QUESTIONS.map((prompt, index) => <label key={prompt} htmlFor={`${idPrefix}-focus-${index}`} className="flex cursor-pointer items-start gap-4 text-muted-foreground leading-relaxed has-[[data-state=checked]]:text-foreground">
            <RadioGroupItem id={`${idPrefix}-focus-${index}`} value={prompt} className="mt-1 shrink-0" />
            <span className="italic">{prompt}</span>
          </label>)}
          <label htmlFor={`${idPrefix}-focus-own`} className="flex cursor-pointer items-start gap-4 text-muted-foreground leading-relaxed"><RadioGroupItem id={`${idPrefix}-focus-own`} value="own" className="mt-1 shrink-0" /><span>I have my own question I want to use.</span></label>
          {choice === "own" && <Textarea id={`${idPrefix}-question`} aria-label="Your own guiding question" value={value} onChange={e => onChange(e.target.value)} maxLength={GUIDING_QUESTION_MAX} rows={3} placeholder="Write your own question or focus prompt here" />}
          <label htmlFor={`${idPrefix}-focus-none`} className="flex cursor-pointer items-start gap-4 text-muted-foreground leading-relaxed"><RadioGroupItem id={`${idPrefix}-focus-none`} value="none" className="mt-1 shrink-0" /><span>Let the {plural ? "cards" : "card"} find me without a question.</span></label>
        </RadioGroup>
      </div>
    </div>
  </section>;
}