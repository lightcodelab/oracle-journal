import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRemembranceLetters } from "@/hooks/useRemembranceLetters";
import { themeForMonth } from "@/lib/remembranceThemes";
import remembranceLettersHomeAsset from "@/assets/remembrance-letters-home.png.asset.json";

/**
 * Home doorway: The Remembrance Letters.
 *
 * Before joining, this is a clear invitation into a twelve-month commitment.
 * Once joined, it shows where the member is, this month's theme and practices,
 * and a way into the letter itself.
 */

export function RemembranceLettersCard() {
  const { toast } = useToast();
  const { pilgrim, letters, loading, join } = useRemembranceLetters();
  const [joining, setJoining] = useState(false);

  const latest = letters.length > 0 ? letters[letters.length - 1] : null;
  const theme = latest ? themeForMonth(latest.month_number) : null;

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

  if (loading) return null;

  return (
    <section aria-labelledby="remembrance-letters-heading" className="mb-12">
      <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 md:p-8">
        {!pilgrim ? (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:gap-8 items-center">
            <div>
              <p className="text-[0.6rem] sm:text-[0.7rem] tracking-[0.16em] uppercase text-primary-strong whitespace-nowrap">
                A year-long Sacred Undoing pilgrimage
              </p>
              <h2
                id="remembrance-letters-heading"
                className="mt-2 font-serif text-2xl sm:text-3xl text-foreground"
              >
                My Remembrance Letters
              </h2>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground">
                Twelve letters, one each month, written for you alone. Each one draws four cards for
                that month's theme and reads them together, then leaves you a few small practices and
                three questions to write into. You begin whenever you choose, and your next letter
                arrives thirty days later.
              </p>
              <p className="mt-3 text-xs italic text-muted-foreground">
                This is a twelve-month container, not a single reading. Your first letter is written
                the moment you begin, and the next one thirty days later.
              </p>
              <Button className="mt-6" size="lg" onClick={beginPilgrimage} disabled={joining}>
                {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Begin the Pilgrimage
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border border-border md:max-w-[260px]">
              <img
                src={remembranceLettersHomeAsset.url}
                alt="A woman reading a handwritten letter by warm morning light"
                loading="lazy"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        ) : (
          <>
            <p className="text-[0.65rem] sm:text-xs tracking-[0.22em] uppercase text-primary-strong">
              A year-long Sacred Undoing pilgrimage
            </p>
            <h2
              id="remembrance-letters-heading"
              className="mt-2 font-serif text-2xl sm:text-3xl text-foreground"
            >
              The Remembrance Letters
            </h2>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                {latest ? (
                  <>
                    <p className="text-foreground font-semibold">
                      Month {latest.month_number} of 12 — {theme?.shortTitle ?? ""}
                    </p>
                    <p className="mt-2 italic">{latest.theme}</p>
                  </>
                ) : (
                  <p>Your first letter is being written for you now.</p>
                )}
                {pilgrim.status === "active" && pilgrim.next_letter_due_at ? (
                  <p className="mt-3 text-xs">
                    Your next letter arrives{" "}
                    {new Date(pilgrim.next_letter_due_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                    })}
                    .
                  </p>
                ) : null}
                <Button asChild className="mt-4">
                  <Link to="/remembrance-letters">Read your letter</Link>
                </Button>
              </div>

              {latest && latest.practices.length > 0 ? (
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">To carry this month</p>
                  <ul className="mt-2 space-y-2">
                    {latest.practices.slice(0, 4).map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden="true" className="text-primary-strong">
                          ·
                        </span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
