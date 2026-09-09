import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  NOT_SURE,
  PREDICTION_OUTCOME_OPTIONS,
  RETURN_QUESTIONS,
  RETURN_SAVE_LABEL,
} from "./patternRecordContent";
import { createPatternReturn, type PatternReturnDraft } from "@/hooks/usePatternRecords";

/**
 * Return — added later, when life has answered back. An invitation, never a
 * task: nothing here is overdue, scored, or compared.
 */

const EMPTY: PatternReturnDraft = {
  tried_text: "",
  happened_text: "",
  noticed_text: "",
  prediction_outcome: "",
  support_text: "",
  carry_forward_text: "",
};

const PatternReturnForm = ({
  recordId,
  onSaved,
}: {
  recordId: string;
  onSaved: () => void;
}) => {
  const [draft, setDraft] = useState<PatternReturnDraft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const complete =
    draft.tried_text.trim() &&
    draft.happened_text.trim() &&
    draft.noticed_text.trim() &&
    draft.prediction_outcome &&
    draft.carry_forward_text.trim();

  const handleSave = async () => {
    setSaving(true);
    try {
      await createPatternReturn(recordId, {
        ...draft,
        support_text: draft.support_text?.trim() ? draft.support_text.trim() : null,
      });
      setDraft(EMPTY);
      toast.success("This is part of your evidence now.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "This Return could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card/70 p-5 sm:p-7">
      <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">Return</p>
      <h2 className="mt-2 font-serif text-2xl text-foreground">
        What did life actually show you?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Whenever you are ready. There is no deadline and nothing is overdue.
      </p>

      <div className="mt-6 space-y-7">
        {RETURN_QUESTIONS.map((q) => (
          <div key={q.field}>
            <p className="font-serif text-lg text-foreground">{q.question}</p>
            {q.helper.map((line) => (
              <p key={line} className="mt-1 text-sm text-muted-foreground">
                {line}
              </p>
            ))}

            {"options" in q && q.options ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PREDICTION_OUTCOME_OPTIONS.map((o) => {
                  const on = draft.prediction_outcome === o.code;
                  return (
                    <button
                      key={o.code}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setDraft((d) => ({ ...d, prediction_outcome: o.code }))
                      }
                      className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                        on
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <Textarea
                  className="mt-3 text-base"
                  rows={4}
                  placeholder={q.placeholder}
                  value={(draft[q.field as keyof PatternReturnDraft] as string) ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [q.field]: e.target.value }))
                  }
                />
                {!("optional" in q && q.optional) && (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, [q.field]: NOT_SURE }))}
                    className="mt-2 text-sm text-primary underline decoration-primary/40 underline-offset-4 hover:text-foreground"
                  >
                    {NOT_SURE}
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <Button className="mt-8" onClick={handleSave} disabled={!complete || saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {RETURN_SAVE_LABEL}
      </Button>
    </div>
  );
};

export default PatternReturnForm;
