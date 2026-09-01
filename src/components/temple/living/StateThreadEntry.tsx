import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getLivingState, type LivingStateRecord, type StateJson } from "@/hooks/useLivingStates";
import RecordThemeTags from "./RecordThemeTags";

/**
 * LP-F.1B correction — the smallest owner-only focused view of one State of
 * Being, opened from My Living Pattern. A State has no separate detail page, so
 * this quiet disclosure shows the actual record she saved and lets her add or
 * remove her own themes on it. Read-only otherwise: no editing model, no
 * dashboard, no interpretation, no Arrival.
 */

const SECTIONS: { key: keyof Pick<
  LivingStateRecord,
  "feeling" | "body" | "capacity" | "desired_state" | "receive" | "reorient"
>; label: string }[] = [
  { key: "feeling", label: "Feeling" },
  { key: "body", label: "Body" },
  { key: "capacity", label: "Capacity" },
  { key: "desired_state", label: "Desired state" },
  { key: "receive", label: "Receive" },
  { key: "reorient", label: "Reorient" },
];

function readable(value: StateJson | undefined): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.values(value)
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

const StateThreadEntry = ({ stateId }: { stateId: string }) => {
  const [open, setOpen] = useState(false);
  const [record, setRecord] = useState<LivingStateRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecord(await getLivingState(stateId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open this state.");
    } finally {
      setLoading(false);
    }
  }, [stateId]);

  useEffect(() => {
    if (open && !record && !loading) void load();
  }, [open, record, loading, load]);

  return (
    <div className="mt-3 min-w-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-primary underline underline-offset-2 hover:text-foreground transition-colors"
      >
        {open ? "Close this state" : "Open this state"}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-border/60 bg-card/60 p-3 min-w-0">
          {loading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening what you wrote…
            </p>
          )}
          {error && !loading && (
            <p role="alert" className="text-sm text-destructive break-words">
              {error}
            </p>
          )}

          {record && !loading && (
            <>
              {SECTIONS.map(({ key, label }) => {
                const lines = readable(record[key]);
                if (lines.length === 0) return null;
                return (
                  <div key={key} className="mb-3 last:mb-0 min-w-0">
                    <p className="text-[0.7rem] uppercase tracking-[0.15em] text-primary">{label}</p>
                    {lines.map((line, i) => (
                      <p key={i} className="mt-1 text-sm text-foreground break-words">
                        {line}
                      </p>
                    ))}
                  </div>
                );
              })}

              <RecordThemeTags targetKind="state" targetId={stateId} />

            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StateThreadEntry;
