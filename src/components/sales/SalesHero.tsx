import { ReactNode } from "react";
import { motion } from "framer-motion";
import heroImage from "@/assets/landing-page-banner-v2.webp";

interface SalesHeroProps {
  cta: ReactNode;
  signIn?: ReactNode;
}

export function SalesHero({ cta, signIn }: SalesHeroProps) {
  return (
    <section className="relative isolate min-h-[42rem] overflow-hidden md:mx-auto md:my-8 md:aspect-video md:min-h-0 md:max-w-[1600px]">
      <img
        src={heroImage.url}
        width={1672}
        height={941}
        alt="A woman stands at an open conservatory doorway looking out over a sunlit garden and distant water, beside a lived-in timber table and garden plants."
        fetchPriority="high"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-[65%_center] md:object-center"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-[5] bg-gradient-to-r from-[hsl(22_24%_8%/0.92)] via-[hsl(22_24%_8%/0.55)] via-50% to-transparent"
      />
      <div className="mx-auto flex h-full min-h-[42rem] max-w-7xl items-end px-5 pb-10 pt-28 md:min-h-0 md:items-center md:px-8 md:py-12 lg:px-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl py-8 text-on-image [text-shadow:0_1px_18px_hsl(var(--brand-dark)/0.9)] md:max-w-[42%] md:py-10"
        >
          <p className="mb-2 text-[0.65rem] uppercase tracking-[0.32em] text-on-image/85">
            The Temple of Sustainment
          </p>
          <h1 className="font-serif text-[1.85rem] leading-none text-on-image sm:text-[2.25rem] lg:text-[2.75rem]">
            You are not broken or a problem to solve.
          </h1>
          <div className="my-5 h-px w-16 bg-primary/80" aria-hidden />
          <p className="max-w-xl text-sm leading-relaxed text-on-image/95">
            The Temple is a place to return to yourself. Notice what is here,
             meet what sits beneath it, and choose a supported next step.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {cta}
            {signIn}
          </div>
          <p className="mt-3 font-serif text-sm italic text-on-image/80">
            A living practice for the woman you are becoming.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
