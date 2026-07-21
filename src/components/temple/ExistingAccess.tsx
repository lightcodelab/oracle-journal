import { Link } from "react-router-dom";
import NavActions from "@/components/NavActions";
import doorRemembrance from "@/assets/door-remembrance.png";
import doorDevotion from "@/assets/door-devotion.png";
import doorCommunion from "@/assets/door-communion.png";
import type { BucketGrants } from "@/hooks/useBucketGrants";

const DOOR_META = {
  remembrance: {
    name: "Remembrance",
    href: "/decks",
    image: doorRemembrance,
    blurb: "Your card decks and readings.",
  },
  devotion: {
    name: "Devotion",
    href: "/devotion",
    image: doorDevotion,
    blurb: "Your courses and healing resources.",
  },
  communion: {
    name: "Communion",
    href: "/communion",
    image: doorCommunion,
    blurb: "Live sessions and gatherings.",
  },
} as const;

type Key = keyof typeof DOOR_META;

/**
 * Restrained landing for authenticated users who are NOT active full members
 * but still hold one or more valid historical bucket-scoped manual grants.
 *
 * Shows ONLY the Door(s) explicitly granted. Does not infer full membership
 * from multiple bucket grants. Never labels these users members, subscribers,
 * or Founders.
 */
export function ExistingAccess({ grants }: { grants: BucketGrants }) {
  const active: Key[] = (["remembrance", "devotion", "communion"] as Key[]).filter(
    (k) => grants[k],
  );

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-4 right-4 z-20">
        <NavActions />
      </div>
      <main className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-3 text-center">
          Your existing access
        </h1>
        <p className="text-muted-foreground text-center mb-10">
          You still have access to the following part of The Temple.
        </p>

        <div
          className={`grid gap-4 ${
            active.length === 1
              ? "grid-cols-1 max-w-sm mx-auto"
              : active.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-3"
          }`}
        >
          {active.map((k) => {
            const d = DOOR_META[k];
            return (
              <Link
                key={k}
                to={d.href}
                className="block group rounded-lg overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Open the Door of ${d.name}`}
              >
                <div className="overflow-hidden rounded-lg">
                  <img
                    src={d.image}
                    alt={`The Door of ${d.name}`}
                    className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </div>
                <p className="mt-2 font-serif text-lg text-foreground text-center">
                  The Door of {d.name}
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  {d.blurb}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground mb-2">
            To open the whole Temple — every practice, every resource, every
            live gathering — an active membership is required.
          </p>
          <Link
            to="/"
            className="inline-block text-sm text-primary hover:underline"
          >
            See what is currently open →
          </Link>
        </div>
      </main>
    </div>
  );
}