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
      <div className="mx-auto max-w-4xl">
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

        <ul className="mt-12 space-y-9 md:mt-16 md:space-y-12">
          {lines.map((line) => (
            <li
              key={line}
              className="border-l border-primary/40 pl-6 font-serif text-xl leading-snug text-foreground sm:text-2xl md:pl-8 md:text-[1.7rem]"
            >
              {line}
            </li>
          ))}
        </ul>

        <p className="mt-14 max-w-2xl text-base leading-relaxed text-foreground/85 sm:text-lg">
          You do not need another identity to perform. You need conditions that
          make a different response possible.
        </p>
      </div>
    </section>
  );
}
