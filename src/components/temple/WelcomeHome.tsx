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
      <div className="relative w-full overflow-hidden rounded-lg">
        <img
          src={templeBannerAsset.url}
          alt=""
          aria-hidden="true"
          className="w-full h-[120px] sm:h-[150px] md:h-[180px] object-cover object-center"
        />
        {/* Legibility scrim behind the text only (left-to-right, fades out) */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-full sm:w-3/4 bg-gradient-to-r from-black/55 via-black/30 to-transparent"
        />
        <div className="absolute inset-0 flex items-center">
          <div className="pl-5 sm:pl-8 md:pl-10 pr-6 max-w-[80%] sm:max-w-[60%]">
            <p className="text-[0.65rem] sm:text-xs tracking-[0.22em] uppercase text-on-image/80 mb-1">
              Welcome back
            </p>
            <h1
              id="temple-welcome-heading"
              className="font-serif text-2xl sm:text-3xl md:text-4xl text-on-image leading-tight"
            >
              The Temple awaits{hasName ? `, ${displayName}` : ""}
            </h1>
          </div>
        </div>
      </div>
      {showFounderBadge && (
        <div className="mt-4">
          <FounderBadge since={foundingSince} />
        </div>
      )}
    </motion.header>
  );
}