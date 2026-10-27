import { Fragment } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown } from "lucide-react";
import {
  EVIDENCE_QUESTIONS,
  GROUNDING_QUESTION,
  RETURN_QUESTION,
  type EvidenceGuide,
} from "@/lib/evidenceFramework";

interface Props {
  values: Record<string, string | undefined>;
  onChange: (key: string, value: string) => void;
  idPrefix: string;
  title?: string;
  showGrounding?: boolean;
  showIntroduction?: boolean;
  extraQuestions?: { key: string; label: string; guide: EvidenceGuide }[];
}

const Guide = ({ guide }: { guide: EvidenceGuide }) => (
  <details className="group mt-2 rounded-md border border-border/60 bg-background/40">
    <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-sm text-primary">
      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      What does this mean? See an example
    </summary>
    <div className="space-y-2 px-3 pb-3 text-sm leading-relaxed text-muted-foreground">
      <p>{guide.meaning}</p>
      <p className="italic text-foreground/85">For example: {guide.example}</p>
    </div>
  </details>
);

/** Grounding question, The Evidence Collector and the Return step. */
export const EvidenceCollector = ({ values, onChange, idPrefix, title = "The Evidence Collector", showGrounding = true, showIntroduction = true, extraQuestions = [] }: Props) => {
  const field = (key: string, label: string, guide: EvidenceGuide, help?: string, rows = 3) => (
    <div key={key}>
      <label htmlFor={`${idPrefix}-${key}`} className="block font-serif text-base text-foreground">{label}</label>
      {help && <p className="mt-0.5 text-xs text-muted-foreground">{help}</p>}
      <Guide guide={guide} />
      <Textarea id={`${idPrefix}-${key}`} value={values[key] || ""} onChange={(e) => onChange(key, e.target.value)} rows={rows} className="mt-2" />
    </div>
  );

  return (
    <div className="space-y-8 text-left">
      {showGrounding && <section className="space-y-3">
        {field(GROUNDING_QUESTION.key, GROUNDING_QUESTION.label, GROUNDING_QUESTION.guide)}
      </section>}
      <section className="border-t border-border pt-6 space-y-5">
        <div>
          <h3 className="font-serif text-xl text-foreground">{title}</h3>
          {showIntroduction && <>
          <p className="mt-1 text-sm italic text-muted-foreground">
            Protection Patterns use old evidence to predict future outcomes, so we need to collect new evidence to change anything.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            In everyday words: the habits that once kept us safe keep expecting the past to repeat. These questions help you notice that, and gather real experiences that show things can be different now.
          </p>
          </>}
        </div>
        {EVIDENCE_QUESTIONS.map((q, i) => (
          <Fragment key={q.key}>
            {field(q.key, q.label, q.guide)}
            {i === 0 && extraQuestions.map((eq) => field(eq.key, eq.label, eq.guide))}
          </Fragment>
        ))}
      </section>
      <section className="border-t border-primary/40 pt-6">
        {field(RETURN_QUESTION.key, RETURN_QUESTION.label, RETURN_QUESTION.guide, RETURN_QUESTION.help, 4)}
      </section>
    </div>
  );
};
