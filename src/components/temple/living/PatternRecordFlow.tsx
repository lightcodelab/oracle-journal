import { useMemo, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  NOT_SURE,
  PATTERN_QUESTIONS,
  PRIMARY_STATE_WORDS,
  SAVE_CONFIRMATION,
  SAVE_LABEL,
  type PatternQuestion,
} from "./patternRecordContent";
import {
  createPatternRecord,
  type PatternRecordDraft,
} from "@/hooks/usePatternRecords";

/**
 * One guided Pattern Record: Pause → Perceive → Practise, one question per
 * screen. Answers are held in the browser and written only on save, so a
 * half-finished record never lands in her private record. Return is added
 * later, from the saved record.
 */

type Answers = {
  moment_text: string;
  state_words: string[];
  body_text: string;
  body_cues: string[];
  capacity: string;
  meaning_text: string;
  prediction_text: string;
  familiarity: string;
  protection_text: string;
  action_text: string;
  identity_text: string;
  continue_identity: string;
  experiment_text: string;
};

const EMPTY: Answers = {
  moment_text: "",
  state_words: [],
  body_text: "",
  body_cues: [],
  capacity: "",
  meaning_text: "",
  prediction_text: "",
  familiarity: "",
  protection_text: "",
  action_text: "",
  identity_text: "",
  continue_identity: "",
  experiment_text: "",
};

const FAMILIAR_CODES = ["very_familiar", "a_little_familiar"];

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              on
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/50"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

const PatternRecordFlow = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [index, setIndex] = useState(0);
  const [ownWord, setOwnWord] = useState("");
  const [showAllStateWords, setShowAllStateWords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const familiar = FAMILIAR_CODES.includes(answers.familiarity);

  // Screen 8 (protection) appears only when the moment felt familiar.
  const screens = useMemo(
    () => PATTERN_QUESTIONS.filter((q) => !q.conditional || familiar),
    [familiar],
  );

  const current: PatternQuestion | undefined = screens[Math.min(index, screens.length - 1)];

  const answeredValue = (q: PatternQuestion) => {
    if (q.kind === "chips_text") {
      const chipField = q.cueField === "body_cues" ? answers.body_cues : answers.state_words;
      const text = q.field === "body_text" ? answers.body_text : "";
      return chipField.length > 0 || text.trim().length > 0;
    }
    const v = answers[q.field as keyof Answers];
    return typeof v === "string" ? v.trim().length > 0 : (v as string[]).length > 0;
  };

  const canContinue = current ? answeredValue(current) : false;
  const isLast = index === screens.length - 1;

  const setField = <K extends keyof Answers>(field: K, value: Answers[K]) =>
    setAnswers((a) => ({ ...a, [field]: value }));

  const toggleChip = (field: "state_words" | "body_cues", value: string) =>
    setAnswers((a) => ({
      ...a,
      [field]: a[field].includes(value)
        ? a[field].filter((v) => v !== value)
        : [...a[field], value],
    }));

  const addOwnWord = (field: "state_words" | "body_cues") => {
    const word = ownWord.trim();
    if (!word) return;
    setAnswers((a) => ({
      ...a,
      [field]: a[field].includes(word) ? a[field] : [...a[field], word],
    }));
    setOwnWord("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const draft: PatternRecordDraft = {
        moment_text: answers.moment_text.trim(),
        state_words: answers.state_words,
        body_text: answers.body_text.trim() || answers.body_cues.join(", "),
        body_cues: answers.body_cues,
        capacity: answers.capacity,
        meaning_text: answers.meaning_text.trim(),
        prediction_text: answers.prediction_text.trim(),
        familiarity: answers.familiarity,
        protection_text: familiar ? answers.protection_text.trim() : null,
        action_text: answers.action_text.trim(),
        identity_text: answers.identity_text.trim(),
        continue_identity: answers.continue_identity,
        experiment_text: answers.experiment_text.trim(),
      };
      const result = await createPatternRecord(draft);
      setSavedId(result.record.id);
      toast.success(SAVE_CONFIRMATION);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "This record could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (savedId) {
    return (
      <div className="rounded-xl border border-border/70 bg-card/70 p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
          <Check className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <h2 className="font-serif text-2xl text-foreground">Your Pattern Record is saved</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed max-w-md mx-auto">
          {SAVE_CONFIRMATION}
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/living-pattern/record")}>
            Open My Living Pattern
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setAnswers(EMPTY);
              setIndex(0);
              setSavedId(null);
            }}
          >
            Record another moment
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const chipField: "state_words" | "body_cues" =
    current.cueField === "body_cues" ? "body_cues" : "state_words";

  return (
    <div className="rounded-xl border border-border/70 bg-card/70 p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">
          {current.movement}
        </p>
        <p className="text-xs text-muted-foreground">
          Question {index + 1} of {screens.length}
        </p>
      </div>

      <h2 className="mt-4 font-serif text-2xl sm:text-3xl text-foreground leading-snug">
        {current.question}
      </h2>
      {current.helper.map((line) => (
        <p key={line} className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {line}
        </p>
      ))}

      <div className="mt-6 space-y-4">
        {current.kind === "text" && (
          <Textarea
            value={answers[current.field as keyof Answers] as string}
            onChange={(e) => setField(current.field as keyof Answers, e.target.value as never)}
            placeholder={current.placeholder}
            rows={5}
            className="text-base"
          />
        )}

        {current.kind === "chips_text" && (
          <>
            {current.chips && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">{current.chipsLabel}</p>
                <Chips
                  options={current.chips}
                  selected={answers[chipField]}
                  onToggle={(v) => toggleChip(chipField, v)}
                />
                {answers[chipField].filter((w) => !current.chips?.includes(w)).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {answers[chipField]
                      .filter((w) => !current.chips?.includes(w))
                      .map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => toggleChip(chipField, w)}
                          className="flex items-center gap-1.5 rounded-full border border-primary bg-primary/15 px-3 py-1.5 text-sm text-foreground"
                        >
                          {w}
                          <X className="h-3 w-3" aria-hidden="true" />
                          <span className="sr-only">Remove {w}</span>
                        </button>
                      ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={ownWord}
                    onChange={(e) => setOwnWord(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOwnWord(chipField);
                      }
                    }}
                    placeholder="Add your own word"
                    className="max-w-xs"
                  />
                  <Button type="button" variant="outline" onClick={() => addOwnWord(chipField)}>
                    Add
                  </Button>
                </div>
              </div>
            )}
            {current.field === "body_text" && (
              <Textarea
                value={answers.body_text}
                onChange={(e) => setField("body_text", e.target.value)}
                placeholder={current.placeholder}
                rows={4}
                className="text-base"
              />
            )}
          </>
        )}

        {current.kind === "single" && current.options && (
          <div className="grid gap-2 sm:grid-cols-2">
            {current.options.map((o) => {
              const on = answers[current.field as keyof Answers] === o.code;
              return (
                <button
                  key={o.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setField(current.field as keyof Answers, o.code as never)}
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
        )}

        {current.kind === "text" && (
          <button
            type="button"
            onClick={() => setField(current.field as keyof Answers, NOT_SURE as never)}
            className="text-sm text-primary underline decoration-primary/40 underline-offset-4 hover:text-foreground"
          >
            {NOT_SURE}
          </button>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0 || saving}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Back
        </Button>

        {isLast ? (
          <Button type="button" onClick={handleSave} disabled={!canContinue || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {SAVE_LABEL}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setIndex((i) => Math.min(screens.length - 1, i + 1))}
            disabled={!canContinue}
          >
            Continue
          </Button>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Nothing is saved until you finish all {screens.length} questions. This record is private to
        you.
      </p>
    </div>
  );
};

export default PatternRecordFlow;
