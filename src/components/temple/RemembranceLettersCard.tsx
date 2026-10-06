import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRemembranceLetters } from "@/hooks/useRemembranceLetters";
import remembranceLettersHomeAsset from "@/assets/remembrance-letters-home.png.asset.json";
import { AdminEditableImage } from "@/components/admin/AdminEditableImage";

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
    <section aria-labelledby="remembrance-letters-heading" className="h-full min-w-0">
      <div className="relative overflow-hidden rounded-xl border border-border/60 h-full">
        <AdminEditableImage
          src={remembranceLettersHomeAsset.url}
          imageKey="temple-remembrance-letters"
          alt=""
          aria-hidden="true"
          loading="lazy"
          wrapperClassName="absolute inset-0 h-full w-full"
          className="h-full w-full object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[#2a1a12]/45" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#1f140e]/85 via-[#1f140e]/60 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#1f140e]/70 via-transparent to-transparent"
        />
        <div className="relative h-full p-5 sm:p-6 md:p-8">
          <p className="text-[0.6rem] sm:text-[0.7rem] tracking-[0.16em] uppercase text-on-image whitespace-nowrap">
            A year-long Sacred Undoing pilgrimage
          </p>
          <h2
            id="remembrance-letters-heading"
            className="mt-2 font-serif text-2xl sm:text-3xl text-on-image"
          >
            The Remembrance Letters
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-on-image/90 max-w-prose">
            Twelve letters, one each month, written for you alone. Each one draws four cards for
            that month's theme and reads them together, then leaves you a few small practices and
            three questions to write into. You begin whenever you choose, and your next letter
            arrives thirty days later.
          </p>
          <p className="mt-3 text-xs italic text-on-image/75 max-w-prose">
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
          {pilgrim && hasUnread ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1f140e]/60 border border-on-image/40 px-3 py-2 text-sm text-on-image">
              <Mail className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium">Your new letter is available now</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
