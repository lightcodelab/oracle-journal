/**
 * LP-F.1B — shared, presentation-only labels and links for her own records.
 * No interpretation, ranking, or scoring: only naming what a record is and
 * where it already lives.
 */

export const RECORD_KIND_LABELS: Record<string, string> = {
  state: "State of Being",
  moment: "Moment of Meaning",
  pattern: "Pattern of Choosing",
  pattern_evidence: "Pattern evidence",
  experiment: "Experiment",
  field_note: "Field Note",
};

export const PHASE_LABELS: Record<string, string> = {
  try: "Try",
  notice: "Notice",
  return: "Return",
};

export function recordKindLabel(kind: string): string {
  return RECORD_KIND_LABELS[kind] ?? "Record";
}

export function recordLink(r: {
  kind: string;
  id: string;
  parent_id?: string | null;
}): string | null {
  switch (r.kind) {
    case "moment":
      return `/living-pattern/moments/${r.id}`;
    case "pattern":
      return `/living-pattern/patterns/${r.id}`;
    case "experiment":
      return `/living-pattern/experiments/${r.id}`;
    case "field_note":
      return r.parent_id ? `/living-pattern/experiments/${r.parent_id}` : null;
    case "pattern_evidence":
      return r.parent_id ? `/living-pattern/patterns/${r.parent_id}` : null;
    default:
      return null;
  }
}

export function formatWhen(iso?: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatDay(iso?: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}
