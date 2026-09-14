import recognitionBanner from "@/assets/recognition-banner-1-v2.png.asset.json";

const lines = [
  "You can name what hurts, but the explanation you have been given does not feel like the whole story. You suspect your physical experience may sit alongside something emotional, relational, traumatic or energetic, but you do not know how to explore that without blaming yourself or turning your body into the enemy.",
  "You can point to the childhood, relationship, loss or difficult chapter that changed you. What you cannot always see is how it is still moving through an ordinary Tuesday — through what you tolerate, fear, avoid, expect or do without thinking.",
  "You keep saying yes because it seems easier than dealing with the disappointment, tension or anger that might follow. Later, you lie awake resentful that nobody noticed how much you were carrying.",
  "Something small happens — a delayed reply, a tone of voice, a look on someone's face — and suddenly you are back in the familiar certainty that you are too much, not enough, unwanted or about to be left.",
  "You understand your reaction beautifully once it is over. In the middle of it, the understanding disappears and the old response moves faster than thought.",
  "You are tired in a way sleep does not entirely touch. Your body keeps asking for attention, but you do not know which signal is meaningful, what it may be connected to or what kind of support to reach for first.",
  "You have collected journals, courses, readings and practices that made sense when you found them. When you are overwhelmed, unwell, heartbroken or activated, none of it seems close enough to use.",
  "You want your intuition honoured. You also want help telling the difference between a present knowing, an old fear and a protective response that has mistaken this moment for another one.",
  "You keep trying to fix one part of your life — your health, relationship, work, confidence or home — while sensing that the same thread may be running through all of it.",
  "You are exhausted by dramatic beginnings. You do not want another version of yourself to perform. You want a way to stay with the life you are already living long enough to see what is true and make a different response possible.",
];


export function RecognitionSection() {
  return (
    <section
      aria-labelledby="recognition-heading"
      className="border-y border-border/60 bg-muted/30 px-5 py-8 md:px-8 md:py-14"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12">
          {/* Content */}
          <div className="space-y-10">
            <div className="space-y-4">
              <p className="text-[0.7rem] uppercase tracking-[0.32em] text-primary-strong">
                HOW TO KNOW IF
              </p>
              <h2
                id="recognition-heading"
                className="font-serif text-[1.9rem] leading-tight text-foreground sm:text-4xl"
              >
                THE TEMPLE is for you:
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

          {/* Image */}
          <div className="aspect-[8/3] overflow-hidden rounded-sm border border-border/50 shadow-2xl">
            <img
              src={recognitionBanner.url}
              alt="A quiet sunlit room opening toward an olive grove, inviting a slower breath."
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
