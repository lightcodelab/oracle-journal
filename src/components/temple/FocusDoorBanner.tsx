import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { doors, focusKey } from "@/components/temple/ExploreDoors";
import { AdminEditableImage } from "@/components/admin/AdminEditableImage";
import type { TempleFocus } from "@/lib/templeFocus";

/**
 * Full-width banner for the member's focused Door: image on the left,
 * text on the right. Shown above the other three Doors in the grid.
 */
export function FocusDoorBanner({ focus }: { focus: TempleFocus }) {
  const door = doors.find((d) => d.key === focusKey[focus]);
  if (!door) return null;

  return (
    <section aria-labelledby="focus-door-heading" className="mb-12">
      <div className="grid grid-cols-1 md:grid-cols-5 overflow-hidden rounded-lg border border-border/50 bg-card/50">
        <div className="relative h-56 md:col-span-2 md:aspect-square md:h-auto md:self-center min-w-0">
          <Link
            to={door.href}
            aria-label={`Open ${door.name}`}
            className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <AdminEditableImage
              src={door.image}
              imageKey={door.key}
              alt={door.name}
              wrapperClassName="absolute inset-0 h-full w-full"
              className="h-full w-full object-cover object-center"
            />
          </Link>
        </div>
        <div className="flex flex-col justify-center p-8 md:p-10 md:col-span-3 min-w-0">
          <span className="inline-block self-start rounded-full border border-primary/60 bg-primary/10 px-2 py-0.5 text-[11px] uppercase tracking-wider text-primary">
            Your focus
          </span>
          <h2 id="focus-door-heading" className="mt-3 font-serif text-3xl md:text-4xl text-foreground">
            {door.name}
          </h2>
          <p className="mt-2 text-xs text-primary-strong uppercase tracking-wider">
            {door.label}
          </p>
          <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
            {door.description}
          </p>
          <Link
            to={door.href}
            className="mt-4 inline-flex items-center gap-1 text-sm md:text-base text-primary hover:underline"
          >
            Open The Door of Devotion for all resources
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
