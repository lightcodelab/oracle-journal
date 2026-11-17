import guidesPhoto from "@/assets/julie-tash-guides.webp";

/**
 * The shared "The women and Method behind THE TEMPLE" bio block, shown on
 * the homepage (Membership) and at the bottom of /join.
 */
export function GuidesBio() {
  return (
    <section
      aria-labelledby="guides-heading"
      className="px-5 py-8 md:px-8 md:py-12"
    >
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          <h2
            id="guides-heading"
            className="mb-6 font-serif text-[1.7rem] leading-tight text-foreground sm:text-3xl"
          >
            The women and Method behind THE TEMPLE
          </h2>
          <img
            src={guidesPhoto}
            alt="Julie and Tash Lewin, the guides of THE TEMPLE of Sustainment"
            loading="lazy"
            className="w-full rounded-2xl object-cover grayscale"
          />
        </div>
        <div className="text-base leading-relaxed text-foreground/85">
          <p className="mb-4">
            <span className="font-semibold text-foreground">
              Julie Lewin
            </span>{" "}
            is a medical intuitive with over 40 years of experience working
            with the body as an intelligent, communicative system. Julie
            channelled and developed the AreekeerA<sup>®</sup> Modality
            through decades of practice and client work.
          </p>
          <p>
            The AreekeerA<sup>®</sup> Method listens to symptoms and patterns
            in the context of a woman's physical, emotional, relational,
            neurological and energetic history — without reducing her to a
            problem that needs to be overpowered.
          </p>
        </div>
        <div className="text-base leading-relaxed text-foreground/85">
          <p className="mb-4">
            <span className="font-semibold text-foreground">Tash Lewin</span>{" "}
            works at the intersection of trauma, identity, and nervous
            system regulation, helping women understand how protective
            patterns and old evidence quietly shape the choices available
            in the present.
          </p>
          <p className="whitespace-pre-line">
            Together, Julie and Tash hold intuitive, embodied and practical ways of knowing alongside ordinary human life.{"\n\n"}Their work does not hand you a verdict about what your pain means.{"\n\n"}It gives you ways to become curious, listen, notice what repeats, try something different and let the evidence of your own life have a voice.
          </p>
        </div>
      </div>
    </section>
  );
}
