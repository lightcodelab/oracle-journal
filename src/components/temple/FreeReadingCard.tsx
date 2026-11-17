import { Button } from "@/components/ui/button";

/**
 * The shared "Begin with one free card reading" offer card, shown on the
 * homepage (Membership) and at the bottom of /join.
 */
export function FreeReadingCard() {
  return (
    <section
      aria-labelledby="free-reading-heading"
      className="px-5 pb-8 md:px-8 md:pb-14"
    >
      <div className="mx-auto max-w-3xl rounded-lg border border-primary/30 bg-primary/5 p-7 text-center md:p-9">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">
          Not ready yet?
        </p>
        <h2
          id="free-reading-heading"
          className="font-serif text-[1.6rem] leading-tight text-foreground sm:text-3xl"
        >
          Begin with one free card reading
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Create a free account and draw a Past, Present, Future spread. Three
          cards, one written reading of the thread between them, and space to
          write privately — no payment, and your reading stays yours.
        </p>
        <div className="mt-7 flex justify-center">
          <Button asChild variant="outline">
            <a href="/free-reading">Draw my free reading</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
