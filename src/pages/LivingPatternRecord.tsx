import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { useLivingThread, type ThreadRecord } from "@/hooks/useLivingThread";
import { LIFECYCLE_LABELS, guideByKey } from "@/components/temple/living/experimentGuides";
import { useOwnExperiments } from "@/hooks/useLivingExperiments";
import CommonThemesPanel from "@/components/temple/living/CommonThemesPanel";
import StateThreadEntry from "@/components/temple/living/StateThreadEntry";
import {
  CAPACITY_OPTIONS,
  FAMILIARITY_OPTIONS,
  labelFor,
} from "@/components/temple/living/patternRecordContent";
import {
  usePatternRecords,
  useRecordsAwaitingReturn,
} from "@/hooks/usePatternRecords";

/**
 * My Living Pattern — her private return path.
 *
 * Living Thread of Pattern Records, deterministic Common Themes, records
 * awaiting a Return, and everything she saved under the earlier model, kept
 * exactly as she wrote it. Owner-only, no interpretation, no scoring, no
 * streaks, nothing overdue.
 */

const KIND_LABELS: Record<ThreadRecord["kind"], string> = {
  state: "State of Being",
  moment: "Moment of Meaning",
  pattern: "Pattern of Choosing",
  pattern_evidence: "Pattern evidence",
  experiment: "Experiment",
  field_note: "Field Note",
};

const PHASE_LABELS: Record<string, string> = {
  try: "Try",
  notice: "Notice",
  return: "Return",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function recordTitle(r: ThreadRecord) {
  if (r.kind === "field_note") {
    return `${PHASE_LABELS[r.label ?? ""] ?? "Note"} — a return to an experiment`;
  }
  if (r.kind === "experiment") {
    const guide = guideByKey(r.label);
    return guide && guide.key !== "own" ? guide.title : "Your experiment";
  }
  if (r.label?.trim()) return r.label.trim();
  if (r.kind === "state") return "A state you recorded";
  if (r.kind === "moment") return "A moment you recorded";
  if (r.kind === "pattern") return "A pattern you named";
  return "Evidence you gathered";
}

function recordHref(r: ThreadRecord): string | null {
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

type View = "thread" | "themes" | "returns" | "earlier";

const LivingPatternRecord = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, loading: memberLoading } = useMemberState();
  const [view, setView] = useState<View>("thread");

  const ready = !authLoading && !memberLoading && !!user && hasFullTempleAccess;
  const { records, loading: recordsLoading, error: recordsError } = usePatternRecords();
  const awaiting = useRecordsAwaitingReturn();
  const thread = useLivingThread(ready && view === "earlier");
  const { experiments } = useOwnExperiments(ready && view === "earlier");

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
          <h1 className="font-serif text-3xl text-foreground mb-4">
            Your Living Pattern is private
          </h1>
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

  const beginLink = (
    <Button asChild className="mt-4">
      <Link to="/living-pattern">Record a Pattern</Link>
    </Button>
  );

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

      <main className="max-w-3xl mx-auto px-4 pb-16 min-w-0">
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">
          THE LIVING PATTERN LAB
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mt-1">My Living Pattern</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
          A private record of the moments you have followed all the way through, in the order life
          offered them. Nothing here is measured, graded, or due.
        </p>

        <div
          className="mt-6 flex flex-wrap gap-2"
          role="tablist"
          aria-label="My Living Pattern views"
        >
          {(
            [
              ["thread", "Living Thread"],
              ["themes", "Common Themes"],
              ["returns", "Awaiting a Return"],
              ["earlier", "Earlier records"],
            ] as const
          ).map(([key, labelText]) => (
            <Button
              key={key}
              role="tab"
              aria-selected={view === key}
              variant={view === key ? "default" : "outline"}
              size="sm"
              onClick={() => setView(key)}
            >
              {labelText}
            </Button>
          ))}
        </div>

        {view === "thread" && (
          <section className="mt-8" aria-label="Living Thread">
            {recordsLoading && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening your record…
              </p>
            )}
            {recordsError && !recordsLoading && (
              <p role="alert" className="text-sm text-destructive">
                {recordsError}
              </p>
            )}

            {!recordsLoading && !recordsError && records.length === 0 && (
              <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6">
                <p className="text-muted-foreground">
                  No Pattern Records yet. Whenever a moment is worth following through, you can
                  record it here.
                </p>
                {beginLink}
              </div>
            )}

            {!recordsLoading && records.length > 0 && (
              <ul className="space-y-3">
                {records.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/living-pattern/records/${r.id}`}
                      className="block rounded-xl border border-border/60 bg-card p-4 sm:p-5 transition-colors hover:border-primary/50"
                    >
                      <p className="text-[0.7rem] uppercase tracking-[0.15em] text-primary">
                        Pattern Record
                      </p>
                      <p className="mt-1 font-serif text-lg text-foreground break-words">
                        {r.moment_text}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground break-words">
                        {formatWhen(r.occurred_at)}
                        {r.state_words.length > 0 && ` · ${r.state_words.join(", ")}`}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground break-words">
                        {labelFor(CAPACITY_OPTIONS, r.capacity)} ·{" "}
                        {labelFor(FAMILIARITY_OPTIONS, r.familiarity)}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground break-words">
                        {r.return_count > 0
                          ? `${r.return_count} ${r.return_count === 1 ? "Return" : "Returns"} recorded`
                          : "No Return yet — you can add one whenever life has answered back."}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {view === "themes" && <CommonThemesPanel />}

        {view === "returns" && (
          <section className="mt-8" aria-label="Awaiting a Return">
            <p className="text-sm text-muted-foreground leading-relaxed">
              These are records where an experiment has had some time to breathe. This is an
              invitation, not a task — nothing here is late.
            </p>
            {awaiting.loading && (
              <p className="mt-4 text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Looking…
              </p>
            )}
            {!awaiting.loading && awaiting.records.length === 0 && (
              <p className="mt-4 text-muted-foreground">
                Nothing is waiting. Every record you have saved has either been returned to, or is
                still fresh.
              </p>
            )}
            {!awaiting.loading && awaiting.records.length > 0 && (
              <ul className="mt-4 space-y-3">
                {awaiting.records.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/living-pattern/records/${r.id}`}
                      className="block rounded-xl border border-border/60 bg-card p-4 sm:p-5 transition-colors hover:border-primary/50"
                    >
                      <p className="font-serif text-lg text-foreground break-words">
                        {r.moment_text}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground break-words">
                        You planned: {r.experiment_text}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatWhen(r.occurred_at)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {view === "earlier" && (
          <section className="mt-8" aria-label="Earlier records">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Everything you saved before the Living Pattern became one Pattern Record, kept exactly
              as you wrote it.
            </p>

            {thread.loading && (
              <p className="mt-4 text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening your record…
              </p>
            )}
            {thread.error && !thread.loading && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {thread.error}
              </p>
            )}
            {!thread.loading && !thread.error && thread.records.length === 0 && (
              <p className="mt-4 text-muted-foreground">
                There are no earlier records here.
              </p>
            )}

            {!thread.loading && thread.records.length > 0 && (
              <>
                <ul className="mt-4 space-y-3">
                  {thread.records.map((r) => {
                    const href = recordHref(r);
                    const inner = (
                      <>
                        <p className="text-[0.7rem] uppercase tracking-[0.15em] text-primary">
                          {KIND_LABELS[r.kind]}
                        </p>
                        <p className="mt-1 font-serif text-lg text-foreground break-words">
                          {recordTitle(r)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground break-words">
                          {formatWhen(r.occurred_at)}
                        </p>
                      </>
                    );
                    return (
                      <li key={`${r.kind}:${r.id}`}>
                        {href ? (
                          <Link
                            to={href}
                            className="block rounded-xl border border-border/60 bg-card p-4 sm:p-5 transition-colors hover:border-primary/50"
                          >
                            {inner}
                          </Link>
                        ) : (
                          <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 min-w-0">
                            {inner}
                            {r.kind === "state" && <StateThreadEntry stateId={r.id} />}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {thread.hasOlder && (
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => void thread.loadOlder()}
                    disabled={thread.loadingMore}
                  >
                    {thread.loadingMore ? "Going back…" : "Go back further"}
                  </Button>
                )}
              </>
            )}

          </section>
        )}
      </main>
    </div>
  );
};

export default LivingPatternRecord;
