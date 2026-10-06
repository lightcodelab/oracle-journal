import { Link } from "react-router-dom";

/** Home doorway: My Rituals. */
export function MyRitualsCard() {
  return (
    <section aria-labelledby="my-rituals-heading" className="mb-12">
      <article className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <p className="text-[0.65rem] tracking-[0.2em] uppercase text-muted-foreground">Your own rhythm</p>
        <h2 id="my-rituals-heading" className="mt-1 font-serif text-2xl sm:text-3xl text-foreground">Create Your Own Rituals</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Gather cards, spreads and resources into daily, weekly and monthly rituals, and return to them whenever you are ready.
        </p>
        <Link
          to="/rituals"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Open My Rituals
        </Link>
      </article>
    </section>
  );
}
