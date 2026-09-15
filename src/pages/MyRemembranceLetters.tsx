import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useRemembranceLetters,
  type RemembranceLetter,
} from "@/hooks/useRemembranceLetters";
import { REMEMBRANCE_REFLECTION_QUESTIONS, themeForMonth } from "@/lib/remembranceThemes";
import remembranceLettersHomeAsset from "@/assets/remembrance-letters-home.png.asset.json";

/**
 * My Remembrance Letters — the member's own year-long Sacred Undoing pilgrimage.
 * Monthly tabs, the four cards drawn for that month, the letter, this month's
 * practices, then a private journalling card. Owner-only throughout.
 */

function ReflectionCard({
  letter,
  initial,
  onSave,
}: {
  letter: RemembranceLetter;
  initial?: { asking_to_be_seen: string; invited_to_shift: string; how_i_will_live_it: string };
  onSave: (values: {
    asking_to_be_seen: string;
    invited_to_shift: string;
    how_i_will_live_it: string;
  }) => Promise<unknown>;
}) {
  const { toast } = useToast();
  const [values, setValues] = useState({
    asking_to_be_seen: initial?.asking_to_be_seen ?? "",
    invited_to_shift: initial?.invited_to_shift ?? "",
    how_i_will_live_it: initial?.how_i_will_live_it ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues({
      asking_to_be_seen: initial?.asking_to_be_seen ?? "",
      invited_to_shift: initial?.invited_to_shift ?? "",
      how_i_will_live_it: initial?.how_i_will_live_it ?? "",
    });
  }, [letter.id, initial?.asking_to_be_seen, initial?.invited_to_shift, initial?.how_i_will_live_it]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(values);
      toast({ title: "Saved", description: "Your writing is kept privately with this letter." });
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-labelledby={`reflection-${letter.id}`}
      className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <h3 id={`reflection-${letter.id}`} className="font-serif text-xl text-foreground">
        Write with this letter
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Private to you. Return to it as often as you like across the month.
      </p>

      <div className="mt-5 space-y-5">
        {REMEMBRANCE_REFLECTION_QUESTIONS.map((q) => (
          <div key={q.key}>
            <label htmlFor={`${letter.id}-${q.key}`} className="block font-serif text-base text-foreground">
              {q.label}
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">{q.help}</p>
            <Textarea
              id={`${letter.id}-${q.key}`}
              value={values[q.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [q.key]: e.target.value }))}
              rows={4}
              className="mt-2"
            />
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Save my writing
        </Button>
      </div>
    </section>
  );
}

const MyRemembranceLetters = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, loading: memberLoading } = useMemberState();
  const { pilgrim, letters, reflections, loading, error, join, saveReflection } =
    useRemembranceLetters();
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (activeMonth === null && letters.length > 0) {
      setActiveMonth(letters[letters.length - 1].month_number);
    }
  }, [letters, activeMonth]);

  const activeLetter = useMemo(
    () => letters.find((l) => l.month_number === activeMonth) ?? null,
    [letters, activeMonth],
  );

  const beginPilgrimage = async () => {
    setJoining(true);
    try {
      await join();
      toast({
        title: "Your pilgrimage has begun",
        description: "Your first letter has been written for you.",
      });
    } catch (e) {
      toast({
        title: "Something interrupted this",
        description: e instanceof Error ? e.message : "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || memberLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">Opening your letters…</div>
      </div>
    );
  }

  if (!hasFullTempleAccess) {
    return (
      <div className="min-h-screen bg-background">
        <header className="max-w-3xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-medium truncate">THE TEMPLE of Sustainment</span>
          </div>
          <NavActions />
        </header>
        <main className="max-w-xl mx-auto px-4 pt-16 pb-16 text-center">
          <h1 className="font-serif text-3xl text-foreground mb-4">Your letters are private</h1>
          <p className="text-muted-foreground mb-8">
            An active membership opens The Remembrance Letters. Return to the entrance to see what is
            currently open.
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
        <p className="text-[0.65rem] sm:text-xs tracking-[0.22em] uppercase text-primary-strong">
          A year-long Sacred Undoing pilgrimage
        </p>
        <h1 className="mt-2 font-serif text-3xl sm:text-4xl text-foreground">
          My Remembrance Letters
        </h1>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Gathering your letters…</p>
        ) : error ? (
          <p className="mt-8 text-destructive">{error}</p>
        ) : !pilgrim ? (
          <section className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
              <div>
                <p className="text-[0.65rem] sm:text-xs tracking-[0.22em] uppercase text-primary-strong">
                  A year-long Sacred Undoing pilgrimage
                </p>
                <h2 className="mt-2 font-serif text-2xl sm:text-3xl text-foreground">
                  My Remembrance Letters
                </h2>
                <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground">
                  Twelve letters, one each month, written for you alone. Each one draws four cards for
                  that month's theme and reads them together, then leaves you a few small practices and
                  three questions to write into. You begin whenever you choose, and your next letter
                  arrives thirty days later.
                </p>
                <Button className="mt-6" size="lg" onClick={beginPilgrimage} disabled={joining}>
                  {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Begin the Pilgrimage
                </Button>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <img
                  src={remembranceLettersHomeAsset.url}
                  alt="A woman reading a handwritten letter by warm morning light"
                  loading="lazy"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </section>
        ) : letters.length === 0 ? (
          <section className="mt-6 rounded-xl border border-border bg-card p-6">
            <p className="text-muted-foreground">
              Your first letter is being written. It usually takes a minute or two — refresh this
              page shortly and it will be here.
            </p>
          </section>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Your monthly letters"
              className="mt-6 flex flex-wrap gap-2"
            >
              {letters.map((l) => {
                const theme = themeForMonth(l.month_number);
                const selected = l.month_number === activeMonth;
                return (
                  <button
                    key={l.id}
                    role="tab"
                    id={`month-tab-${l.month_number}`}
                    aria-selected={selected}
                    aria-controls={`month-panel-${l.month_number}`}
                    onClick={() => setActiveMonth(l.month_number)}
                    className={`rounded-full border px-3 py-1.5 text-xs sm:text-sm transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Month {l.month_number}
                    <span className="hidden sm:inline"> — {theme?.shortTitle ?? ""}</span>
                  </button>
                );
              })}
            </div>

            {pilgrim.status === "active" && pilgrim.next_letter_due_at ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Your next letter is written on{" "}
                {new Date(pilgrim.next_letter_due_at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                .
              </p>
            ) : pilgrim.status === "completed" ? (
              <p className="mt-3 text-xs text-muted-foreground">
                All twelve letters have been written. They remain here for you.
              </p>
            ) : null}

            {activeLetter ? (
              <article
                key={activeLetter.id}
                role="tabpanel"
                id={`month-panel-${activeLetter.month_number}`}
                aria-labelledby={`month-tab-${activeLetter.month_number}`}
                className="mt-6"
              >
                <div className="grid grid-cols-4 gap-2 sm:gap-4">
                  {activeLetter.card_snapshot.map((card, i) => (
                    <figure key={`${card.id}-${i}`} className="m-0">
                      <div className="overflow-hidden rounded-lg border border-border bg-muted">
                        {card.image_file_name ? (
                          <img
                            src={`/cards/${card.image_file_name}`}
                            alt={`${card.card_title ?? "Card"}${card.deck_name ? ` — ${card.deck_name}` : ""}`}
                            loading="lazy"
                            className="aspect-[2/3] w-full object-cover"
                          />
                        ) : (
                          <div className="aspect-[2/3] w-full flex items-center justify-center text-xs text-muted-foreground">
                            {card.card_title ?? "Card"}
                          </div>
                        )}
                      </div>
                      <figcaption className="mt-1.5 text-[0.65rem] sm:text-xs leading-snug text-muted-foreground">
                        {card.card_title}
                      </figcaption>
                    </figure>
                  ))}
                </div>

                <h2 className="mt-8 font-serif text-2xl sm:text-3xl text-foreground">
                  {activeLetter.theme}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Month {activeLetter.month_number} of 12 ·{" "}
                  {new Date(activeLetter.generated_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>

                <div className="mt-5 whitespace-pre-line font-serif text-base sm:text-lg leading-relaxed text-foreground">
                  {activeLetter.content}
                </div>

                {activeLetter.practices.length > 0 ? (
                  <section
                    aria-labelledby={`practices-${activeLetter.id}`}
                    className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6"
                  >
                    <h3
                      id={`practices-${activeLetter.id}`}
                      className="font-serif text-xl text-foreground"
                    >
                      This month's practices
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm sm:text-base text-muted-foreground">
                      {activeLetter.practices.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <Mail className="mt-1 h-3.5 w-3.5 shrink-0 text-primary-strong" aria-hidden="true" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <ReflectionCard
                  letter={activeLetter}
                  initial={reflections[activeLetter.id]}
                  onSave={(values) => saveReflection(activeLetter.id, values)}
                />
              </article>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
};

export default MyRemembranceLetters;
