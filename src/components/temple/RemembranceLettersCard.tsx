import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRemembranceLetters } from "@/hooks/useRemembranceLetters";
import remembranceLettersHomeAsset from "@/assets/remembrance-letters-home.png.asset.json";

/**
 * Home doorway: The Remembrance Letters.
 *
 * Before joining, this is a clear invitation into a twelve-month commitment.
 * Once joined, the same card remains, with a button into the letters page.
 * Letter content itself only ever lives on /remembrance-letters.
 */

export function RemembranceLettersCard() {
  const { toast } = useToast();
  const { pilgrim, letters, loading, join } = useRemembranceLetters();
  const [joining, setJoining] = useState(false);

  const hasUnread = useMemo(() => {
    if (!letters.length) return false;
    const latest = letters[letters.length - 1];
    return !latest.read_at;
  }, [letters]);

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
            {pilgrim ? (
              <Button asChild className="mt-6" size="lg">
                <Link to="/remembrance-letters">Access your letters</Link>
              </Button>
            ) : (
              <Button className="mt-6" size="lg" onClick={beginPilgrimage} disabled={joining}>
                {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Begin the Pilgrimage
              </Button>
            )}
          </div>
          <div className="flex flex-col items-start gap-3">
            <div className="overflow-hidden rounded-lg border border-border md:max-w-[260px]">
              <img
                src={remembranceLettersHomeAsset.url}
                alt="A woman reading a handwritten letter by warm morning light"
                loading="lazy"
                className="w-full h-auto object-cover"
              />
            </div>
            {pilgrim && hasUnread ? (
              <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-primary">
                <Mail className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium">Your new letter is available now</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
