import { motion } from "framer-motion";

interface DoorHeaderProps {
  image: string;
  /** Accessible live text title rendered over the image's clear area. */
  title: string;
  description?: React.ReactNode;
  /** Decorative image: alt stays empty, title carries the meaning. */
  imageAlt?: string;
}

/**
 * Wide, shallow page header for the three Door pages.
 * The title/description remain live HTML text; the image is background only.
 */
export function DoorHeader({ image, title, description, imageAlt = "" }: DoorHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative w-full overflow-hidden rounded-lg mb-8"
    >
      <img
        src={image}
        alt={imageAlt}
        aria-hidden={imageAlt ? undefined : true}
        className="w-full h-[180px] sm:h-[240px] md:h-[300px] object-cover object-center"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/10 via-foreground/25 to-foreground/50 md:from-transparent md:via-foreground/10 md:to-foreground/55" />
      <div className="absolute inset-0 flex items-center justify-center md:justify-end px-6 md:px-10">
        <div className="max-w-md text-center md:text-right">
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-on-image drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
            {title}
          </h1>
          {description && (
            <p className="mt-3 font-sans text-sm sm:text-base text-on-image/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              {description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
