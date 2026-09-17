import { Link } from "react-router-dom";
import spreadsImg from "@/assets/sacred-spreads-temple.jpg";

/**
 * Home doorway: Sacred Spreads.
 *
 * A single dark image banner — no intro copy above it, just the image,
 * gradients, overlaid text and buttons, matching the One Pattern Record
 * panel inside the Living Pattern card.
 */

export function SacredSpreadsCard() {
  return (
    <section aria-labelledby="sacred-spreads-heading" className="mb-12">
      <article className="relative overflow-hidden rounded-lg border border-border/50 w-full min-w-0 sm:aspect-[21/9] sm:min-h-[280px]">
          <img
            src={spreadsImg}
            alt=""
            aria-hidden="true"
            loading="lazy"
            width={1920}
            height={768}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-[#2a1a12]/40" />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#2a1a12]/85 via-[#2a1a12]/55 to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#1f140e]/70 via-[#1f140e]/20 to-transparent"
          />

          <div className="relative flex h-full flex-col justify-end p-5 sm:p-7 max-w-full sm:max-w-[62%] [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
            <p className="text-[0.65rem] tracking-[0.2em] uppercase text-primary-strong">
              Let the cards speak together
            </p>
            <h2
              id="sacred-spreads-heading"
              className="mt-1 font-serif text-2xl sm:text-3xl tracking-wide text-on-image"
            >
              Sacred Spreads
            </h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-on-image">
              Choose a spread, draw your cards, and receive a reading written
              from the thread that runs through them all — with questions to
              write into, saved with your cards.
            </p>
            <div className="mt-4 flex w-full flex-nowrap items-center gap-2 sm:gap-3 sm:w-auto">
              <Link
                to="/remembrance/spreads"
                className="inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:flex-none sm:px-4"
              >
                Draw a Sacred Spread
              </Link>
              <Link
                to="/readings"
                className="inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-md border border-on-image/50 px-3 py-2.5 text-sm font-medium text-on-image transition-colors hover:bg-on-image/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:flex-none sm:px-4"
              >
                My Readings
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
