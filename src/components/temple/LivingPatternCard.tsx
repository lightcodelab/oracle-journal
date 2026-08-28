import { Link } from "react-router-dom";
import pauseImg from "@/assets/pause-img.png.asset.json";
import presenceImg from "@/assets/presence-img.png.asset.json";
import practiceImg from "@/assets/practice-img.png.asset.json";

/**
 * Home doorway: "Logging My Living Pattern".
 *
 * LP-E: Pause, Presence and Practice are all live, connected lenses — not
 * steps, not a sequence, not a checklist, and not progress.
 */

type Panel = {
  key: string;
  record: string;
  practice: string;
  description: string;
  image: string;
  action: string;
  href: string;
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
    href: "/living-pattern/presence",
  },

  {
    key: "practice",
    record: "Patterns of Choosing",
    practice: "PRACTICE",
    description:
      "Consciously choose and sustain the commitments your actions are making real.",
    image: practiceImg.url,
    action: "Log a Pattern of Choosing",
    href: "/living-pattern/practice",
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
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
            Your Living Pattern is a private Conservatory laboratory for
            learning how you want to shape your life. Here, you can notice what
            is true in a moment, become curious about the meaning your mind is
            making, try one small different choice, and gather evidence from
            what happens next. Over time, you will see the conditions that
            steady you, the stories and habits that narrow your choices, the
            commitments you want to strengthen, and the living evidence of a life
            becoming more like your own.
          </p>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">New to the Living Pattern?</span>
              <br />
              Start with the five-minute introduction. It will show you how to choose a lens, write a small enough entry, and use experiments without turning your life into homework.
              <br />
              You can also begin with any lens now.
            </p>
            <p>
              <Link
                to="/living-pattern/orientation"
                className="text-primary underline decoration-primary/40 underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              >
                Start here: How to use your Living Pattern
              </Link>{" "}
              — a short, private orientation you can read now, later, or never. You
              may open any lens straight away.
            </p>
          </div>
        </div>




        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {panels.map((panel) => (
            <article
              key={panel.key}
              className="relative overflow-hidden rounded-lg border border-border/50 w-full min-w-0 max-w-full aspect-[16/9] sm:aspect-[4/3] min-h-0 sm:min-h-[280px] lg:min-h-[320px]"
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
                className="absolute inset-0 bg-[#2a1a12]/40"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-[#2a1a12]/80 via-[#2a1a12]/50 to-transparent"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#1f140e]/70 via-[#1f140e]/20 to-transparent sm:from-[#1f140e]/60 sm:via-transparent"
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
                  <Link
                    to={panel.href}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {panel.action}
                  </Link>
                </div>

              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
