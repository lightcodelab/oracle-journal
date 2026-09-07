import { ReactNode } from "react";
import { motion } from "framer-motion";
import heroImage from "@/assets/sales-hero-threshold.jpg";

interface SalesHeroProps {
  cta: ReactNode;
  signIn?: ReactNode;
}

export function SalesHero({ cta, signIn }: SalesHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 pb-12 pt-8 md:grid-cols-2 md:gap-14 md:px-8 md:pb-24 md:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="order-2 md:order-1"
        >
          <p className="mb-5 text-[0.7rem] uppercase tracking-[0.32em] text-primary">
            The Temple of Sustainment
          </p>
          <h1 className="font-serif text-[2.15rem] leading-[1.12] text-foreground sm:text-5xl lg:text-[3.6rem]">
            You are not a problem to solve.
          </h1>
          <div className="my-7 h-px w-16 bg-primary/60" aria-hidden />
          <p className="max-w-xl text-base leading-relaxed text-foreground/85 sm:text-lg">
            You may already know why you do what you do. You may have read the
            books, collected the practices, named the patterns—and still find
            yourself overwhelmed, reacting from somewhere older, or unsure what
            to do when life becomes too much.
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/85 sm:text-lg">
            The Temple is a place to return to yourself: to notice what is here,
            meet what sits beneath it, choose one supported next step, and learn
            from what happens.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            {cta}
            {signIn}
          </div>
          <p className="mt-4 font-serif text-sm italic text-muted-foreground">
            A living practice for the woman you are becoming.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="order-1 md:order-2"
        >
          <img
            src={heroImage}
            width={1920}
            height={1280}
            alt="A woman standing at the open doorway of a sandstone and timber conservatory in warm Tasmanian afternoon light, arms folded, looking out toward the garden and water beyond."
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-[var(--glow-mystical)] md:aspect-[5/6]"
          />
        </motion.div>
      </div>
    </section>
  );
}
