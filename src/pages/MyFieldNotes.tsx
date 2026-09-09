import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { useOwnExperiments } from "@/hooks/useLivingExperiments";
import { LIFECYCLE_LABELS, guideByKey } from "@/components/temple/living/experimentGuides";
import { useJournalEntries } from "@/hooks/useJournalEntries";

/**
 * My Field Notes — the single private home for Field Notes written beneath
 * resources and cards. Deliberately separate from My Living Pattern: Pattern
 * Records and their later Returns live there, Field Notes live here.
 *
 * The second tab is a strictly READ-ONLY view of historical My Journal notes
 * saved before that feature was replaced. No editor, no create path, no
 * mutation: nothing in journal_entries is rewritten or deleted here.
 */

type Tab = "field-notes" | "journal";

const MyFieldNotes = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, loading: memberLoading } = useMemberState();
  const [tab, setTab] = useState<Tab>("field-notes");

  const ready = !authLoading && !memberLoading && !!user && hasFullTempleAccess;
  const { experiments, loading, error } = useOwnExperiments(ready);
  const { data: journalEntries = [], isLoading: journalLoading } = useJournalEntries();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || memberLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">Opening a quiet place…</div>
      </div>
    );
  }

  if (!hasFullTempleAccess) {
    return (
      <div className="min-h-screen bg-background">
        <header className="max-w-3xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-medium truncate">The Temple of Sustainment</span>
          </div>
          <NavActions />
        </header>
        <main className="max-w-xl mx-auto px-4 pt-16 pb-16 text-center">
          <h1 className="font-serif text-3xl text-foreground mb-4">Your notes are private</h1>
          <p className="text-muted-foreground mb-8">
            An active membership opens this record. Return to the entrance to see what is currently
            open.
          </p>
          <Button asChild size="lg">
            <Link to="/">Return to the entrance</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-3xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <Link
          to="/temple"
          className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium truncate">Back to Home</span>
        </Link>
        <NavActions />
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">Private notes</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mt-1">My Field Notes</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
          Notes you wrote beneath a resource or card, and whatever you noticed afterwards. Nothing
          here is measured, scored, or due.
        </p>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Notes">
          <Button
            role="tab"
            aria-selected={tab === "field-notes"}
            variant={tab === "field-notes" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("field-notes")}
          >
            Field Notes
          </Button>
          <Button
            role="tab"
            aria-selected={tab === "journal"}
            variant={tab === "journal" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("journal")}
          >
            Earlier Journal Notes
          </Button>
        </div>

        {tab === "field-notes" && (
          <section className="mt-8">
            {loading && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening your notes…
              </p>
            )}
            {error && !loading && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            {!loading && !error && experiments.length === 0 && (
              <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6">
                <p className="text-muted-foreground">
                  No Field Notes yet. You can write one at the bottom of any resource or card you are
                  working with.
                </p>
              </div>
            )}

            {!loading && experiments.length > 0 && (
              <ul className="space-y-3">
                {experiments.map((e) => {
                  const guide = guideByKey(e.guide_key);
                  const title =
                    guide && guide.key !== "own"
                      ? guide.title
                      : e.own_experiment || e.title_snapshot || "Your notes";
                  return (
                    <li key={e.id}>
                      <Link
                        to={`/field-notes/${e.id}`}
                        className="block rounded-xl border border-border/60 bg-card p-4 sm:p-5 transition-colors hover:border-primary/50"
                      >
                        <p className="font-serif text-lg text-foreground break-words">{title}</p>
                        <p className="mt-1 text-sm text-muted-foreground break-words">
                          {LIFECYCLE_LABELS[e.lifecycle] ?? "Open"} · began{" "}
                          {new Date(e.created_at).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })}
                          {e.notice_count
                            ? ` · ${e.notice_count} noticing${e.notice_count === 1 ? "" : "s"}`
                            : ""}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {tab === "journal" && (
          <section className="mt-8">
            <p className="text-sm text-muted-foreground">
              Notes you saved in My Journal before it was replaced by Field Notes. They are unchanged
              and kept here for you to read.
            </p>

            {journalLoading && (
              <p className="mt-4 text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening your notes…
              </p>
            )}

            {!journalLoading && journalEntries.length === 0 && (
              <div className="mt-4 rounded-xl border border-border/60 bg-card p-5 sm:p-6">
                <p className="text-muted-foreground">You have no earlier Journal notes.</p>
              </div>
            )}

            {!journalLoading && journalEntries.length > 0 && (
              <ul className="mt-4 space-y-3">
                {journalEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 min-w-0"
                  >
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.captured_at).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                      {entry.title ? ` — ${entry.title}` : ""}
                      {entry.context_title ? ` · ${entry.context_title}` : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-line break-words text-sm text-foreground/90">
                      {entry.content_text?.trim() || "(no text)"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default MyFieldNotes;
