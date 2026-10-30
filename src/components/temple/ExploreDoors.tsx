import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import doorRemembrance from "@/assets/door-becoming-journal-writer.png";
import doorBecoming from "@/assets/door-of-remembrance-4.webp";
import doorDevotion from "@/assets/door-of-devotion-temple-thumbnail.webp.asset.json";
import doorCommunion from "@/assets/door-of-communion-temple-thumbnail.webp.asset.json";
import { AdminEditableImage } from "@/components/admin/AdminEditableImage";
import type { TempleFocus } from "@/lib/templeFocus";

export const doors = [
  { key: "temple-door-remembrance", name: "The Door of Remembrance", href: "/remembrance", image: doorRemembrance, label: "What am I willing to see?", chamber: "CHAMBER 1: REVEAL", description: "Explore the mirrors, archetypes and inheritances shaping you through the cards and journal what you discover." },
  { key: "temple-door-devotion", name: "The Door of Devotion", href: "/devotion", image: doorDevotion.url, label: "What do I need to tend to?", chamber: "CHAMBER 2: REGULATE", description: "Return to yourself through foundational rites and restorative practice." },
  { key: "temple-door-becoming", name: "The Door of Becoming", href: "/becoming", image: doorBecoming, label: "What am I ready to build?", chamber: "CHAMBER 3: RESHAPE", description: "Journeys for personal development, self-awareness and conscious identity." },
  { key: "temple-door-communion", name: "The Door of Communion", href: "/communion", image: doorCommunion.url, label: "LIVE GATHERINGS, CIRCLES & COMMUNITY", description: "Find connection, reflection and support within our community." },
];

export type TempleDoor = (typeof doors)[number];

export const focusKey: Record<TempleFocus, string> = {
  remembrance: "temple-door-remembrance",
  devotion: "temple-door-devotion",
  becoming: "temple-door-becoming",
  communion: "temple-door-communion",
};

const COMMUNION_KEY = "temple-door-communion";

/**
 * The Door of Communion is presented beneath "Live, community and support"
 * rather than inside the Explore grid, so the grid carries the remaining
 * Doors only.
 */
export const COMMUNION_DOOR = doors.find((d) => d.key === COMMUNION_KEY)!;

const gridDoors = doors.filter((d) => d.key !== COMMUNION_KEY);

const COUNT_WORDS: Record<number, string> = { 1: "one", 2: "two", 3: "three", 4: "four" };
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

/** One Door tile: square artwork, name, label and description. */
export function DoorCard({ door, delay = 0 }: { door: TempleDoor; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative"
    >
      <Link
        to={door.href}
        className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Open ${door.name}`}
      />
      <div className="group">
        <div className="overflow-hidden rounded-lg aspect-square">
          <AdminEditableImage
            src={door.image}
            imageKey={door.key}
            alt={door.name}
            wrapperClassName="pointer-events-none relative z-20 h-full w-full"
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
        {door.chamber && (
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-primary text-center">
            {door.chamber}
          </p>
        )}
        <p className="mt-1 font-serif text-lg text-foreground text-center">
          {door.name}
        </p>
        <p className="mt-1 text-xs text-primary-strong text-center uppercase tracking-wider">
          {door.label}
        </p>
        <p className="mt-2 text-sm text-muted-foreground text-center leading-relaxed">
          {door.description}
        </p>
      </div>
    </motion.div>
  );
}

export function ExploreDoors({ focus, onChangeFocus }: { focus?: TempleFocus | null; onChangeFocus?: () => void }) {
  // The focused Door gets the full-width FocusDoorBanner above, so the
  // grid here shows only the remaining Doors.
  const visible = focus ? gridDoors.filter((d) => d.key !== focusKey[focus]) : gridDoors;
  return (
    <section aria-labelledby="explore-heading" className="mb-12">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 id="explore-heading" className="font-serif text-2xl text-foreground">
          Move through THE TEMPLE
        </h2>
        {onChangeFocus && (
          <button type="button" onClick={onChangeFocus} className="text-sm text-primary hover:underline">
            {focus ? "Change focus" : "Choose your focus"}
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {focus
          ? `The other ${countWord(visible.length)} pathways for exploring THE TEMPLE. Every pathway is open to every active member.`
          : "What do you need most right now? Choose a Phase that gives you what you need. If you're not sure use The AreekeerA Guide to show you."}
      </p>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${focus ? "lg:grid-cols-2" : "lg:grid-cols-3"} gap-4 mb-6`}>
        {visible.map((door, i) => (
          <DoorCard key={door.name} door={door} delay={i * 0.05} />
        ))}
      </div>

    </section>
  );
}
