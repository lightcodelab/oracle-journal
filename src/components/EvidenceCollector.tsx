import { Textarea } from "@/components/ui/textarea";
import { EVIDENCE_QUESTIONS, GROUNDING_QUESTION, RETURN_QUESTION } from "@/lib/evidenceFramework";

interface Props {
  values: Record<string, string | undefined>;
  onChange: (key: string, value: string) => void;
  idPrefix: string;
}

/** Grounding question, The Evidence Collector and the Return step. */
export const EvidenceCollector = ({ values, onChange, idPrefix }: Props) => {
  const field = (key: string, label: string, help?: string, rows = 3) => (
    <div key={key}>
      <label htmlFor={`${idPrefix}-${key}`} className="block font-serif text-base text-foreground">{label}</label>
      {help && <p className="mt-0.5 text-xs text-muted-foreground">{help}</p>}
      <Textarea id={`${idPrefix}-${key}`} value={values[key] || ""} onChange={(e) => onChange(key, e.target.value)} rows={rows} className="mt-2" />
    </div>
  );

  return (
    <div className="space-y-8 text-left">
      <section className="space-y-3">
        {field(GROUNDING_QUESTION.key, GROUNDING_QUESTION.label)}
      </section>
      <section className="border-t border-border pt-6 space-y-5">
        <div>
          <h3 className="font-serif text-xl text-foreground">The Evidence Collector</h3>
          <p className="mt-1 text-sm italic text-muted-foreground">
            Protection Patterns use old evidence to predict future outcomes, so we need to collect new evidence to change anything.
          </p>
        </div>
        {EVIDENCE_QUESTIONS.map((q) => field(q.key, q.label))}
      </section>
      <section className="border-t border-primary/40 pt-6">
        {field(RETURN_QUESTION.key, RETURN_QUESTION.label, RETURN_QUESTION.help, 4)}
      </section>
    </div>
  );
};
