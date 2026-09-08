const lines = [
  "You keep saying yes because it seems easier than dealing with the disappointment, tension, or anger that might follow—then lie awake resentful that nobody seems to notice how much you are carrying.",
  "You can feel the room change before anyone says a word. You tell yourself you are overreacting, but your body has already gone tight, quiet, useful, or somewhere else entirely.",
  "You have a drawer full of journals, courses, readings, and practices—but when you are overwhelmed, unwell, heartbroken, or activated, you still do not know what to reach for first.",
  "Something small happens—a delayed reply, a tone of voice, a look on someone’s face—and suddenly you are back in the familiar certainty that you are too much, not enough, unsafe, unwanted, or about to be left.",
  "You are tired in a way sleep does not entirely touch. You suspect your body has been carrying things your mind has learned to work around, minimise, or explain away.",
  "You keep trying to make one part of your life better—your health, your relationship, your work, your home, your confidence—while quietly knowing the pattern is woven through all of it.",
  "You are standing between versions of yourself: between roles, relationships, homes, ways of working, or beliefs about who you have to be. You are waiting for certainty before you take the one honest step you already know is asking to be taken.",
  "You are exhausted by beginning again. By the perfect plan. By the dramatic reset. By becoming intensely devoted to your healing for three weeks, then wondering why the rest of your life still does not know how to hold you.",
  "You want your intuition honoured—but you also want to know the difference between a feeling, an old fear, a protective reflex, and what is actually true in this moment.",
  "You are not looking for another beautiful idea about who you could become. You are looking for a way to stay with yourself in the life you already have.",
];

export function RecognitionSection() {
  return (
    <section
      aria-labelledby="recognition-heading"
      className="border-y border-border/60 bg-muted/30 px-5 py-16 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-20">
          {/* Image */}
          <div className="order-2 flex aspect-[4/5] items-center justify-center overflow-hidden rounded-sm border border-border/50 bg-muted shadow-2xl lg:order-1 lg:col-span-5">
            <span className="text-sm uppercase tracking-widest text-foreground/50">
              Image placeholder
            </span>
          </div>

          {/* Content */}
          <div className="order-1 space-y-10 lg:order-2 lg:col-span-7">
            <div className="space-y-4">
              <p className="text-[0.7rem] uppercase tracking-[0.32em] text-primary">
                HOW TO KNOW IF
              </p>
              <h2
                id="recognition-heading"
                className="font-serif text-[1.9rem] leading-tight text-foreground sm:text-4xl"
              >
                The Temple is for you:
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
              {lines.map((line) => (
                <div key={line} className="group">
                  <div className="mb-4 h-px w-6 bg-primary/50" />
                  <p className="text-base font-light leading-relaxed text-foreground/90">
                    {line}
                  </p>
                </div>
              ))}
            </div>

            <p className="max-w-2xl text-base leading-relaxed text-foreground/85 sm:text-lg">
              You do not need another identity to perform. You need conditions
              that make a different response possible.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
