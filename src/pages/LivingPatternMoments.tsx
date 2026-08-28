import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { useOwnMoments } from "@/hooks/useLivingMoments";

/**
 * LP-D — her own private list of Moments of Meaning. No counts framed as
 * progress, no streaks, no scores, no sharing, no Arrival.
 */
const LivingPatternMoments = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, isAdmin, loading: memberLoading } = useMemberState();

  const accessResolved = !authLoading && !memberLoading && !!user;
  const enabled = accessResolved && hasFullTempleAccess && isAdmin;
  const { moments, loading, error } = useOwnMoments(enabled);

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
            An active membership opens this record.
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
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">Moments of Meaning</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mt-1">My Moments</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
          Yours alone. Return to any of them whenever you have more information, or leave them
          exactly as they are.
        </p>

        <div className="mt-6">
          <Button asChild>
            <Link to="/living-pattern/presence">Log a Moment of Meaning</Link>
          </Button>
        </div>

        {error && (
          <p role="alert" className="mt-6 text-sm text-destructive">
            {error}
          </p>
        )}

        {!loading && moments.length === 0 && !error && (
          <p className="mt-8 text-muted-foreground">
            Nothing here yet. Something that stood out today — difficult or lovely — is enough to
            begin with.
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {moments.map((m) => {
            const preview =
              (typeof m.register?.happened === "string" && m.register.happened) ||
              (typeof m.register?.stood_out === "string" && m.register.stood_out) ||
              "";
            return (
              <li key={m.id}>
                <Link
                  to={`/living-pattern/moments/${m.id}`}
                  className="block rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.occurred_at).toLocaleString()}
                  </p>
                  <p className="mt-1 font-serif text-lg text-foreground">
                    {m.label || "A moment of meaning"}
                  </p>
                  {preview && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{preview}</p>
                  )}
                  {m.experiment_count > 0 && (
                    <p className="mt-2 text-xs text-primary">
                      {m.experiment_count === 1
                        ? "1 experiment you began here"
                        : `${m.experiment_count} experiments you began here`}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
};

export default LivingPatternMoments;
