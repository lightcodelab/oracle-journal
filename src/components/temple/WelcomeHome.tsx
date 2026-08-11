import { motion } from "framer-motion";
import { FounderBadge } from "@/components/FounderBadge";
import templeBannerAsset from "@/assets/homepage-banner.webp.asset.json";

interface WelcomeHomeProps {
  displayName: string | null;
  showFounderBadge: boolean;
  foundingSince: string | null;
}

export function WelcomeHome({ displayName, showFounderBadge, foundingSince }: WelcomeHomeProps) {
  const hasName = !!displayName && displayName.trim().length > 0;
  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="mb-8"
      aria-labelledby="temple-welcome-heading"
    >
      <div className="relative w-full overflow-hidden rounded-lg mb-6">
        <img
          src={templeBannerAsset.url}
          alt=""
          aria-hidden="true"
          className="w-full h-[140px] sm:h-[180px] md:h-[220px] object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <h1
          id="temple-welcome-heading"
          className="font-serif text-3xl sm:text-4xl text-foreground"
        >
          Welcome back to The Temple
        </h1>
        {hasName && (
          <p className="font-serif text-xl sm:text-2xl text-primary/90">
            {displayName}
          </p>
        )}
      </div>
      {showFounderBadge && (
        <div className="mt-3">
          <FounderBadge since={foundingSince} />
        </div>
      )}
    </motion.header>
  );
}