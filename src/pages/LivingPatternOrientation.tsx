import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import {
  EXAMPLE_DISCLAIMER,
  HONEST_RETURNS,
  ORIENTATION_INVITATION,
  ORIENTATION_LESSONS,
  ORIENTATION_PROMISE,
} from "@/components/temple/living/orientationContent";

/**
 * LP-O.2 — "Learning the Living Pattern".
 *
 * A calm, revisitable teaching layer. It is never a gate: it stores nothing,
 * tracks no completion, has no score, streak, quiz, badge or deadline, and every
 * lens remains openable directly from here or from Home.
 *
 * No Arrival route, query, prefill or reference exists in this file.
 */

const LENS_LINKS = [
  { label: "Open Pause", to: "/living-pattern/pause" },
  { label: "Open Perceive", to: "/living-pattern?lens=perceive" },
  { label: "Open Practice", to: "/living-pattern/practice" },
];

const LivingPatternOrientation = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, isAdmin, loading: memberLoading } = useMemberState();

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

      <main className="max-w-3xl mx-auto px-4 pb-20">
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">Start here</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mt-1">
          Learning the Living Pattern
        </h1>
        <div className="mt-4 space-y-1 max-w-2xl">
          {ORIENTATION_PROMISE.map((line) => (
            <p key={line} className="text-lg leading-relaxed text-foreground">
              {line}
            </p>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-border/60 bg-card/60 p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">
            Read this whenever you like, in any order, and return to it any time. It is not
            required before you begin, and nothing here is recorded.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LENS_LINKS.map((l) => (
              <Button key={l.to} asChild size="sm" variant="outline">
                <Link to={l.to}>{l.label}</Link>
              </Button>
            ))}
          </div>
        </div>

        <nav aria-label="Orientation contents" className="mt-8 flex flex-wrap gap-2">
          {ORIENTATION_LESSONS.map((l) => (
            <a
              key={l.key}
              href={`#lesson-${l.key}`}
              className="rounded-md border border-border/70 px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {l.eyebrow}: {l.title}
            </a>
          ))}
        </nav>

        <div className="mt-8 space-y-6">
          {ORIENTATION_LESSONS.map((lesson) => (
            <section
              key={lesson.key}
              id={`lesson-${lesson.key}`}
              aria-labelledby={`lesson-${lesson.key}-heading`}
              className="scroll-mt-6 rounded-xl border border-border/60 bg-card p-5 sm:p-6"
            >
              <p className="text-[0.65rem] tracking-[0.2em] uppercase text-primary">
                {lesson.eyebrow}
              </p>
              <h2
                id={`lesson-${lesson.key}-heading`}
                className="mt-1 font-serif text-2xl text-foreground"
              >
                {lesson.title}
              </h2>

              <div className="mt-4 space-y-3">
                {lesson.copy.map((p) => (
                  <p key={p} className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
              </div>

              {lesson.movements && (
                <ol className="mt-5 space-y-3">
                  {lesson.movements.map((m, i) => (
                    <li key={m.name} className="text-sm leading-relaxed text-muted-foreground">
                      <span className="text-primary">
                        {i + 1}. {m.name} —{" "}
                      </span>
                      {m.body}
                    </li>
                  ))}
                </ol>
              )}

              {lesson.teach && (
                <ul className="mt-5 space-y-2">
                  {lesson.teach.map((t) => (
                    <li
                      key={t}
                      className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                    >
                      <span aria-hidden="true" className="text-primary">
                        ·
                      </span>
                      <span className="min-w-0">{t}</span>
                    </li>
                  ))}
                </ul>
              )}

              {lesson.guideNote && (
                <div className="mt-5 rounded-lg border border-border/60 bg-background/40 p-4">
                  <p className="text-sm leading-relaxed text-foreground">
                    {lesson.guideNote}
                  </p>
                </div>
              )}

              {lesson.table && (
                <div className="mt-5 space-y-3">
                  {lesson.table.rows.map((row) => (
                    <div
                      key={row.join("|")}
                      className="rounded-lg border border-border/60 bg-background/40 p-3.5"
                    >
                      {row.map((cell, i) => (
                        <p key={i} className="text-sm leading-relaxed break-words">
                          <span className="text-primary">{lesson.table!.head[i]} — </span>
                          <span className="text-muted-foreground">{cell}</span>
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {lesson.script && (
                <p className="mt-5 rounded-md border border-border/60 p-3.5 text-sm italic leading-relaxed text-foreground">
                  {lesson.script}
                </p>
              )}

              {lesson.examples?.map((ex) => (
                <div
                  key={ex.title}
                  className="mt-5 rounded-lg border border-border/60 bg-background/40 p-4"
                >
                  <p className="text-xs tracking-[0.14em] uppercase text-primary">
                    Fictional example — {ex.title}
                  </p>
                  <div className="mt-2.5 space-y-2">
                    {ex.lines.map((line) => (
                      <p key={line.label} className="text-sm leading-relaxed break-words">
                        <span className="text-foreground">{line.label} </span>
                        <span className="text-muted-foreground">{line.body}</span>
                      </p>
                    ))}
                  </div>
                  <p className="mt-3 text-[0.7rem] text-muted-foreground">{EXAMPLE_DISCLAIMER}</p>
                </div>
              ))}

              {lesson.key === "practice" && (
                <div className="mt-5">
                  <p className="text-sm text-primary">Five honest returns</p>
                  <ul className="mt-2 space-y-2">
                    {HONEST_RETURNS.map((r) => (
                      <li key={r} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                        <span aria-hidden="true" className="text-primary">
                          ·
                        </span>
                        <span className="min-w-0">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {lesson.enoughForToday && (
                <div className="mt-5 rounded-md border border-border/60 p-3.5">
                  <p className="text-xs tracking-[0.14em] uppercase text-primary">
                    What is enough for today?
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground break-words">
                    {lesson.enoughForToday}
                  </p>
                </div>
              )}

              {lesson.close && (
                <p className="mt-5 font-serif text-lg leading-relaxed text-foreground">
                  {lesson.close}
                </p>
              )}
            </section>
          ))}
        </div>

        <section
          aria-labelledby="orientation-invitation"
          className="mt-8 rounded-xl border border-border/60 bg-card p-5 sm:p-6"
        >
          <h2 id="orientation-invitation" className="font-serif text-2xl text-foreground">
            The invitation
          </h2>
          <div className="mt-3 space-y-1">
            {ORIENTATION_INVITATION.map((line) => (
              <p key={line} className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {LENS_LINKS.map((l) => (
              <Button key={l.to} asChild size="sm" variant="outline">
                <Link to={l.to}>{l.label}</Link>
              </Button>
            ))}
            <Button asChild size="sm" variant="ghost">
              <Link to="/temple">Back to Home</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LivingPatternOrientation;
