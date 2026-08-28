import { Link } from "react-router-dom";
import pauseImg from "@/assets/pause-img.png.asset.json";
import presenceImg from "@/assets/presence-img.png.asset.json";
import practiceImg from "@/assets/practice-img.png.asset.json";

/**
 * Home doorway: "Logging My Living Pattern".
 *
 * LP-C: only Pause is live. Presence and Practice are truthful previews with no
 * route at all — no link, no click handler, no dead navigation.
 */

type Panel = {
  key: string;
  record: string;
  practice: string;
  description: string;
  image: string;
  action: string;
  href?: string;
  previewNote?: string;
};

const panels: Panel[] = [
  {
    key: "pause",
    record: "States of Being",
    practice: "PAUSE",
    description: "Notice and tend the state you are in.",
    image: pauseImg.url,
    action: "Log a State of Being",
    href: "/living-pattern/pause",
  },
  {
    key: "presence",
    record: "Moments of Meaning",
    practice: "PRESENCE",
    description: "Meet what stood out before its story makes the choice for you.",
    image: presenceImg.url,
    action: "Log a Moment of Meaning",
    previewNote: "Not open yet",
  },
  {
    key: "practice",
    record: "Patterns of Choosing",
    practice: "PRACTICE",
    description:
      "Consciously choose and sustain the commitments your actions are making real.",
    image: practiceImg.url,
    action: "Log a Pattern of Choosing",
    previewNote: "Not open yet",
  },
];

export function LivingPatternCard() {
  return (
    <section aria-labelledby="living-pattern-heading" className="mb-12">
      <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 md:p-8">
        <p className="text-[0.65rem] sm:text-xs tracking-[0.22em] uppercase text-primary">
          A private place to notice
        </p>
        <h2
          id="living-pattern-heading"
          className="mt-2 font-serif text-2xl sm:text-3xl text-foreground"
        >
          Logging My Living Pattern
        </h2>
        <p className="mt-3 max-w-3xl text-sm sm:text-base leading-relaxed text-muted-foreground">
          Your Living Pattern is a private record of the moments that shape a
          life: how you were, what stood out, and the choices you made. Return
          when something is hard, beautiful, or quietly different. Over time, you
          will be able to see what steadies you, the stories you repeat, the
          commitments you are strengthening, and the evidence of a life becoming
          more like your own.
        </p>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {panels.map((panel) => (
            <article
              key={panel.key}
              className="relative overflow-hidden rounded-lg border border-border/50 min-h-[320px] w-full min-w-0"
            >
              <img
                src={panel.image}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[#2a1a12]/60"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-[#2a1a12]/95 via-[#2a1a12]/75 to-transparent"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#1f140e]/95 via-[#1f140e]/30 to-transparent sm:from-[#1f140e]/80 sm:via-transparent"
              />

              <div className="relative flex h-full flex-col justify-end p-5 sm:p-6 lg:p-5 xl:p-6 max-w-full sm:max-w-[62%] lg:max-w-[90%] [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
                <p className="text-[0.65rem] lg:text-[0.6rem] tracking-[0.2em] uppercase text-primary">
                  {panel.record}
                </p>
                <h3 className="mt-1 font-serif text-2xl sm:text-3xl lg:text-2xl tracking-wide text-on-image">
                  {panel.practice}
                </h3>
                <p className="mt-2 text-sm sm:text-base lg:text-sm leading-relaxed text-on-image">
                  {panel.description}
                </p>
                <div className="mt-4">
                  {panel.href ? (
                    <Link
                      to={panel.href}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {panel.action}
                    </Link>
                  ) : (
                    <div>
                      <span
                        aria-disabled="true"
                        className="inline-flex items-center justify-center rounded-md border border-primary/50 px-4 py-2.5 text-sm font-medium text-primary/70"
                      >
                        {panel.action}
                      </span>
                      <p className="mt-2 text-xs text-on-image">
                        {panel.previewNote} — this practice arrives in a later
                        opening of The Temple.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
