const lines = [
  "You understand your patterns, but still find yourself inside them.",
  "Your body, emotions, history, relationships, and choices do not feel separate—and you are tired of being asked to treat them as though they are.",
  "You have practices, but do not always know what to do when you are activated.",
  "You can feel there is something beneath the reaction: an old meaning, a protector, an inheritance, an unmet need.",
  "You are exhausted by trying to heal perfectly.",
  "You want intuition honoured, but you also want to come home to your real life.",
];

export function RecognitionSection() {
  return (
    <section
      aria-labelledby="recognition-heading"
      className="border-y border-border/60 bg-muted/30 px-5 py-16 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-5xl">
        <p className="mb-5 text-[0.7rem] uppercase tracking-[0.32em] text-primary">
          This may be for you
        </p>
        <h2
          id="recognition-heading"
          className="font-serif text-[1.9rem] leading-tight text-foreground sm:text-4xl"
        >
          Perhaps you have been carrying more than anyone can see.
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/85 sm:text-lg">
          The Temple is for the woman who is perceptive, capable, and tired.
        </p>

        <div className="mt-12 grid items-start gap-10 md:mt-16 md:grid-cols-2 md:gap-12 lg:gap-16">
          <div className="order-2 flex aspect-[4/5] items-center justify-center rounded-lg bg-muted md:order-1">
            <span className="text-sm uppercase tracking-widest text-foreground/50">
              Image placeholder
            </span>
          </div>

          <ul className="order-1 space-y-5 md:order-2">
            {lines.map((line) => (
              <li
                key={line}
                className="list-disc pl-5 text-base leading-relaxed text-foreground/90 marker:text-primary"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-14 max-w-2xl text-base leading-relaxed text-foreground/85 sm:text-lg">
          You do not need another identity to perform. You need conditions that
          make a different response possible.
        </p>
      </div>
    </section>
  );
}
