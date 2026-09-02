import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { useLivingThread, type ThreadRecord } from "@/hooks/useLivingThread";
import { useOwnExperiments } from "@/hooks/useLivingExperiments";
import { LIFECYCLE_LABELS, guideByKey } from "@/components/temple/living/experimentGuides";
import ActivePatternsPanel from "@/components/temple/living/ActivePatternsPanel";
import ThemesPanel from "@/components/temple/living/ThemesPanel";
import InvitationsPanel from "@/components/temple/living/InvitationsPanel";
import StateThreadEntry from "@/components/temple/living/StateThreadEntry";



/**
 * LP-F.0 — My Living Pattern: her private return path.
 *
 * A calm chronological record of what she has already saved. Not a dashboard,
 * scorecard, streak, progress tracker, or interpretation layer. Owner-only via
 * the accepted `living_thread_page` and `living_experiments_list` RPCs. Nothing
 * here touches Arrival, generic Journal Notes, media, or sharing.
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

const LivingPatternRecord = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, isAdmin, loading: memberLoading } = useMemberState();
  const [view, setView] = useState<"thread" | "patterns" | "themes" | "experiments">("thread");

  const ready = !authLoading && !memberLoading && !!user && hasFullTempleAccess && isAdmin;
  const thread = useLivingThread(ready && view === "thread");
  const { experiments, loading: expLoading, error: expError } = useOwnExperiments(
    ready && view === "experiments",
  );

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

  if (!hasFullTempleAccess || !isAdmin) {
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
          <h1 className="font-serif text-3xl text-foreground mb-4">Your Living Pattern is private</h1>
          <p className="text-muted-foreground mb-8">
            An active membership opens this record. Return to the entrance to see what is currently open.
          </p>
          <Button asChild size="lg">
            <Link to="/">Return to the entrance</Link>
          </Button>
        </main>
      </div>
    );
  }

  const lensLinks = (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <Link to="/living-pattern?lens=pause">Open Pause</Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link to="/living-pattern?lens=perceive">Open Perceive</Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link to="/living-pattern?lens=practice">Open Practice</Link>
      </Button>
    </div>
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
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">THE LIVING PATTERN LAB</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mt-1">My Living Pattern</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
          A private record of what you have already saved, in the order life offered it. Nothing here
          is measured, graded, or due. Read what you wish, and leave the rest.
        </p>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="My Living Pattern views">
          {(
            [
              ["thread", "Living Thread"],
              ["patterns", "Active Patterns"],
              ["themes", "My Themes"],
              ["experiments", "My Experiments"],
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
            {thread.loading && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening your record…
              </p>
            )}
            {thread.error && !thread.loading && (
              <p role="alert" className="text-sm text-destructive">
                {thread.error}
              </p>
            )}

            {!thread.loading && !thread.error && thread.records.length === 0 && (
              <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6">
                <p className="text-muted-foreground">
                  Nothing has been recorded here yet. Whenever you would like to, you can begin with
                  any lens — each one is whole on its own.
                </p>
                {lensLinks}
              </div>
            )}

            {!thread.loading && thread.records.length > 0 && (
              <>
                <ul className="space-y-3">
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

        {view === "experiments" && (
          <section className="mt-8" aria-label="My Experiments">
            {expLoading && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening your record…
              </p>
            )}
            {expError && !expLoading && (
              <p role="alert" className="text-sm text-destructive">
                {expError}
              </p>
            )}

            {!expLoading && !expError && experiments.length === 0 && (
              <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6">
                <p className="text-muted-foreground">
                  Nothing has been recorded here yet. An experiment is always optional — you can also
                  simply keep what you have already noticed.
                </p>
                {lensLinks}
              </div>
            )}

            {!expLoading && experiments.length > 0 && (
              <ul className="space-y-3">
                {experiments.map((e) => {
                  const guide = guideByKey(e.guide_key);
                  const title =
                    guide && guide.key !== "own" ? guide.title : e.own_experiment || "Your experiment";
                  const origin = e.state_id
                    ? "Began from a State of Being"
                    : e.moment_id
                      ? "Began from a Moment of Meaning"
                      : e.pattern_id
                        ? "Began from a Pattern of Choosing"
                        : null;
                  return (
                    <li key={e.id}>
                      <Link
                        to={`/living-pattern/experiments/${e.id}`}
                        className="block rounded-xl border border-border/60 bg-card p-4 sm:p-5 transition-colors hover:border-primary/50"
                      >
                        <p className="font-serif text-lg text-foreground break-words">{title}</p>
                        <p className="mt-1 text-sm text-muted-foreground break-words">
                          {LIFECYCLE_LABELS[e.lifecycle] ?? "Open"} · began{" "}
                          {new Date(e.created_at).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })}
                        </p>
                        {origin && (
                          <p className="mt-1 text-sm text-muted-foreground break-words">{origin}</p>
                        )}
                        <p className="mt-2 text-sm text-muted-foreground break-words">
                          Try, Notice, and Return are kept together inside this experiment.
                          {e.has_return ? "" : " A Return has not been written yet — that is not a failure."}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {view === "patterns" && (
          <ActivePatternsPanel enabled={ready && view === "patterns"} lensLinks={lensLinks} />
        )}

        {view === "themes" && (
          <ThemesPanel enabled={ready && view === "themes"} lensLinks={lensLinks} />
        )}

        <InvitationsPanel enabled={ready} />
      </main>

    </div>
  );
};

export default LivingPatternRecord;
