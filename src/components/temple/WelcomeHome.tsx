import { motion } from "framer-motion";
import { FounderBadge } from "@/components/FounderBadge";
import templeBanner from "@/assets/temple-banner.png";

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
      <img
        src={templeBanner}
        alt=""
        aria-hidden="true"
        className="w-full h-auto rounded-lg mb-6"
      />
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