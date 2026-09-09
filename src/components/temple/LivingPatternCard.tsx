import { Link } from "react-router-dom";
import presenceImg from "@/assets/presence-img.png.asset.json";

/**
 * Home doorway: the Living Pattern Lab.
 *
 * One coherent practice — Pause, Perceive, Practise in one Pattern Record, with
 * a Return added later. Not three separate logs, not a tracker, not progress.
 */

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
          Your Living Pattern Lab
        </h2>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
            Your Living Pattern is a private laboratory for seeing the whole chain
            that shapes a response: the moment, the state you were in, the meaning
            your mind made, the future it predicted, the familiar pattern beneath
            it, and the choice you made. You follow one moment all the way
            through, choose one small experiment, and later return to what life
            actually showed you — so you are living from evidence rather than
            from fear, hope, or self-judgement.
          </p>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">
                New to the Living Pattern?
              </span>
              <br />
              Start with the short introduction. It shows you how one Pattern
              Record works, and how a Return turns an experiment into evidence
              without turning your life into homework.
            </p>
            <p>
              <Link
                to="/living-pattern/orientation"
                className="text-primary underline decoration-primary/40 underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              >
                Start here: How to use your Living Pattern
              </Link>{" "}
              — a short, private orientation you can read now, later, or never.
            </p>
            <p>
              To go deeper and understand why to use The Living Pattern,{" "}
              <Link
                to="/remembrance/course/ba0869d1-128d-4e5b-8c1a-e4c7a6d7f17a"
                className="text-primary underline decoration-primary/40 underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              >
                access the Becoming course now
              </Link>
              .
            </p>
          </div>
        </div>

        <article className="relative mt-6 overflow-hidden rounded-lg border border-border/50 w-full min-w-0 sm:aspect-[21/9] sm:min-h-[280px]">
          <img
            src={presenceImg.url}
            alt=""
            aria-hidden="true"
            loading="lazy"
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
            <p className="text-[0.65rem] tracking-[0.2em] uppercase text-primary">
              Pause · Perceive · Practise
            </p>
            <h3 className="mt-1 font-serif text-2xl sm:text-3xl tracking-wide text-on-image">
              One Pattern Record
            </h3>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-on-image">
              Follow one moment all the way through, and choose one small
              experiment. You can return to it later, when life has answered back.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/living-pattern"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Record a Pattern
              </Link>
              <Link
                to="/living-pattern/record"
                className="inline-flex items-center justify-center rounded-md border border-on-image/50 px-4 py-2.5 text-sm font-medium text-on-image transition-colors hover:bg-on-image/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                My Living Pattern
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
