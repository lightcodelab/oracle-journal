import { useEffect, useMemo, useRef, useState } from "react";
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
  description?: string;
  showGrounding?: boolean;
  showIntroduction?: boolean;
  extraQuestions?: { key: string; label: string; guide: EvidenceGuide }[];
  questions?: { key: string; label: string; guide: EvidenceGuide }[];
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

type FieldDef = { key: string; label: string; guide: EvidenceGuide; help?: string; rows?: number };

const EvidenceItem = ({
  field, idPrefix, values, onChange, open, onToggle, onAnsweredBlur,
}: {
  field: FieldDef;
  idPrefix: string;
  values: Record<string, string | undefined>;
  onChange: (key: string, value: string) => void;
  open: boolean;
  onToggle: () => void;
  onAnsweredBlur: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={containerRef}
      className="py-3"
      onBlurCapture={(e) => {
        const rel = e.relatedTarget as HTMLElement | null;
        // Moving focus inside this question (its guide, textarea, etc.) is not "leaving" it.
        if (rel && containerRef.current?.contains(rel)) return;
        // Clicking another question's toggle opens it via its own click —
        // advancing here as well would immediately close it again.
        if (rel?.closest("button[aria-expanded]")) return;
        onAnsweredBlur();
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="font-serif text-base text-foreground">{field.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform${open ? " rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
          <Guide guide={field.guide} />
          <Textarea
            id={`${idPrefix}-${field.key}`}
            value={values[field.key] || ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            rows={field.rows ?? 3}
          />
        </div>
      )}
    </div>
  );
};

/** Grounding question, The Evidence Collector and the Return step. */
export const EvidenceCollector = ({ values, onChange, idPrefix, title = "The Evidence Collector", description, showGrounding = true, showIntroduction = true, extraQuestions = [], questions = EVIDENCE_QUESTIONS }: Props) => {
  const fields = useMemo<FieldDef[]>(() => {
    const list: FieldDef[] = [];
    if (showGrounding) list.push({ key: GROUNDING_QUESTION.key, label: GROUNDING_QUESTION.label, guide: GROUNDING_QUESTION.guide });
    questions.forEach((q, i) => {
      list.push(q);
      if (i === 0) extraQuestions.forEach((eq) => list.push(eq));
    });
    list.push({ key: RETURN_QUESTION.key, label: RETURN_QUESTION.label, guide: RETURN_QUESTION.guide, help: RETURN_QUESTION.help, rows: 4 });
    return list;
  }, [showGrounding, questions, extraQuestions]);

  const [openKey, setOpenKey] = useState<string | null>(fields[0]?.key ?? null);
  const touchedRef = useRef(false);
  const hydratedRef = useRef(false);

  // Once saved answers arrive (e.g. a returning member), open the first question
  // still waiting for an answer — once, and only if the member hasn't already
  // started interacting with the locker.
  useEffect(() => {
    if (hydratedRef.current || touchedRef.current) return;
    if (!fields.some((f) => (values[f.key] || "").trim())) return;
    hydratedRef.current = true;
    const firstUnanswered = fields.find((f) => !(values[f.key] || "").trim());
    setOpenKey(firstUnanswered ? firstUnanswered.key : null);
  }, [values, fields]);

  const handleChange = (key: string, value: string) => {
    touchedRef.current = true;
    onChange(key, value);
  };

  const advanceFrom = (key: string) => {
    if (!(values[key] || "").trim()) return;
    const idx = fields.findIndex((f) => f.key === key);
    const next = fields.slice(idx + 1).find((f) => !(values[f.key] || "").trim());
    setOpenKey(next ? next.key : null);
  };

  const renderItem = (field: FieldDef, noBorder = false) => (
    <div key={field.key} className={noBorder ? "" : "border-b border-border/60"}>
      <EvidenceItem
        field={field}
        idPrefix={idPrefix}
        values={values}
        onChange={handleChange}
        open={openKey === field.key}
        onToggle={() => setOpenKey((cur) => (cur === field.key ? null : field.key))}
        onAnsweredBlur={() => advanceFrom(field.key)}
      />
    </div>
  );

  const mainFields = fields.filter(
    (f) => f.key !== GROUNDING_QUESTION.key && f.key !== RETURN_QUESTION.key,
  );
  const groundingField = fields.find((f) => f.key === GROUNDING_QUESTION.key);
  const returnField = fields.find((f) => f.key === RETURN_QUESTION.key);

  return (
    <div className="space-y-8 text-left">
      {showGrounding && groundingField && renderItem(groundingField)}
      <section className="pt-2">
        <div>
          <h3 className="font-serif text-xl text-foreground">{title}</h3>
          {description && <p className="mt-1 text-sm italic text-muted-foreground">{description}</p>}
          {showIntroduction && <>
          <p className="mt-1 text-sm italic text-muted-foreground">
            Protection Patterns use old evidence to predict future outcomes, so we need to collect new evidence to change anything.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            In everyday words: the habits that once kept us safe keep expecting the past to repeat. These questions help you notice that, and gather real experiences that show things can be different now.
          </p>
          </>}
        </div>
        {mainFields.map((f, i) => renderItem(f, i === mainFields.length - 1))}
      </section>
      <section className="border-t border-primary/40 pt-4">
        {returnField && renderItem(returnField, true)}
      </section>
    </div>
  );
};
