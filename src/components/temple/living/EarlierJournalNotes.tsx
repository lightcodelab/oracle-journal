import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useJournalEntries } from "@/hooks/useJournalEntries";

/**
 * TL-2B — shared, strictly READ-ONLY presentation of a member's historical
 * generic Journal notes for one surface.
 *
 * There is deliberately no editor, no create path and no mutation of any kind
 * here: `journal_entries` rows are never deleted, migrated, merged, relabelled
 * or rewritten, and `/journal` remains the only place history is editable.
 * Extracted so no future Field Notes surface can accidentally reintroduce a
 * writer alongside the history.
 */

interface EarlierJournalNotesProps {
  /** Legacy context pair exactly as the surface used it before. */
  legacyContextType: string;
  legacyContextId: string;
}

export default function EarlierJournalNotes({
  legacyContextType,
  legacyContextId,
}: EarlierJournalNotesProps) {
  const { data: legacyEntries = [] } = useJournalEntries({
    contextType: legacyContextType,
    contextId: legacyContextId,
  });

  if (legacyEntries.length === 0) return null;

  return (
    <details className="group mt-6 rounded-md border border-border/60 bg-background/40 open:bg-background/60">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        Earlier Journal Notes ({legacyEntries.length})
      </summary>
      <div className="space-y-3 px-3 pb-3 pt-1">
        <p className="text-xs text-muted-foreground">
          Notes you wrote here before. They are unchanged and remain in My Journal.
        </p>
        {legacyEntries.map((entry) => (
          <div key={entry.id} className="rounded-md border border-border/60 bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">
              {new Date(entry.captured_at).toLocaleDateString()}
              {entry.title ? ` — ${entry.title}` : ""}
            </p>
            <p className="mt-1 whitespace-pre-line break-words text-sm text-foreground/90">
              {entry.content_text?.trim() || "(no text)"}
            </p>
          </div>
        ))}
        <Link
          to="/journal"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <BookOpen className="h-4 w-4" />
          Open My Journal
        </Link>
      </div>
    </details>
  );
}
