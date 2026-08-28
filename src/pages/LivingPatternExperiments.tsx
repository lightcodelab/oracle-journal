import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { useOwnExperiments } from "@/hooks/useLivingExperiments";
import { LIFECYCLE_LABELS, guideByKey } from "@/components/temple/living/experimentGuides";

/**
 * LP-C.1 — minimal private list of her own experiments.
 *
 * A calm path back to an experiment later. This is deliberately NOT the full
 * My Living Pattern or the LP-F Living Thread: no themes, insights, counts of
 * progress, streaks, or grading. Owner-only via the LP-C.1 RPCs.
 */

const LivingPatternExperiments = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, isAdmin, loading: memberLoading } = useMemberState();

  const ready = !authLoading && !memberLoading && !!user && hasFullTempleAccess && isAdmin;
  const { experiments, loading, error } = useOwnExperiments(ready);

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
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">
          Field Notes for Your Experiments
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mt-1">My experiments</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
          Small, voluntary things you were curious to try, and whatever you noticed. Nothing here is
          measured, scored, or due. Return when you have more information—not when you have succeeded.
        </p>

        {loading && (
          <p className="mt-8 text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening your record…
          </p>
        )}
        {error && !loading && (
          <p role="alert" className="mt-8 text-sm text-destructive">
            {error}
          </p>
        )}

        {!loading && !error && experiments.length === 0 && (
          <div className="mt-8 rounded-xl border border-border/60 bg-card p-5 sm:p-6">
            <p className="text-muted-foreground">
              No experiments yet. You can begin one at the end of a Pause, or simply keep saving States
              of Being — both are complete on their own.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/living-pattern/pause">Open a Pause</Link>
            </Button>
          </div>
        )}

        {!loading && experiments.length > 0 && (
          <ul className="mt-8 space-y-3">
            {experiments.map((e) => {
              const guide = guideByKey(e.guide_key);
              const title =
                guide && guide.key !== "own" ? guide.title : e.own_experiment || "Your experiment";
              return (
                <li key={e.id}>
                  <Link
                    to={`/living-pattern/experiments/${e.id}`}
                    className="block rounded-xl border border-border/60 bg-card p-4 sm:p-5 transition-colors hover:border-primary/50"
                  >
                    <p className="font-serif text-lg text-foreground break-words">{title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {LIFECYCLE_LABELS[e.lifecycle] ?? "Open"} · began{" "}
                      {new Date(e.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      {e.notice_count ? ` · ${e.notice_count} noticing${e.notice_count === 1 ? "" : "s"}` : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};

export default LivingPatternExperiments;
