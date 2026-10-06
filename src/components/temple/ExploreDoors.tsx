import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import doorRemembrance from "@/assets/door-becoming-journal-writer.png";
import doorBecoming from "@/assets/door-of-remembrance-4.webp";
import doorDevotion from "@/assets/door-of-devotion-temple-thumbnail.webp.asset.json";
import doorCommunion from "@/assets/door-of-communion-temple-thumbnail.webp.asset.json";
import { AdminEditableImage } from "@/components/admin/AdminEditableImage";
import type { TempleFocus } from "@/lib/templeFocus";


export const doors = [
  { key: "temple-door-remembrance", name: "The Door of Remembrance", href: "/remembrance", image: doorRemembrance, label: "CARD DECKS & SACRED SPREADS", description: "Explore the mirrors, archetypes and inheritances shaping you through the cards." },
  { key: "temple-door-devotion", name: "The Door of Devotion", href: "/devotion", image: doorDevotion.url, label: "RITES, AREEKEERA® TEMPLATES & MEDITATIONS", description: "Return to yourself through foundational rites and restorative practice." },
  { key: "temple-door-becoming", name: "The Door of Becoming", href: "/becoming", image: doorBecoming, label: "COURSES, INTEGRATION & SELF-INQUIRY", description: "Journeys for personal development, self-awareness and conscious identity." },
  { key: "temple-door-communion", name: "The Door of Communion", href: "/communion", image: doorCommunion.url, label: "LIVE GATHERINGS, CIRCLES & COMMUNITY", description: "Find connection, reflection and support within our community." },
];


export const focusKey: Record<TempleFocus, string> = {
  remembrance: "temple-door-remembrance",
  devotion: "temple-door-devotion",
  becoming: "temple-door-becoming",
  communion: "temple-door-communion",
};

export function ExploreDoors({ focus, onChangeFocus }: { focus?: TempleFocus | null; onChangeFocus?: () => void }) {
  // The focused Door gets the full-width FocusDoorBanner above, so the
  // grid here shows only the remaining three Doors.
  const visible = focus ? doors.filter((d) => d.key !== focusKey[focus]) : doors;
  return (
    <section aria-labelledby="explore-heading" className="mb-12">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 id="explore-heading" className="font-serif text-2xl text-foreground">
          Explore THE TEMPLE
        </h2>
        {onChangeFocus && (
          <button type="button" onClick={onChangeFocus} className="text-sm text-primary hover:underline">
            {focus ? "Change focus" : "Choose your focus"}
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        The other three pathways for exploring THE TEMPLE. Every pathway is open to every active member.
      </p>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${focus ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-4 mb-6`}>
        {visible.map((door, i) => (
          <motion.div
            key={door.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
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
              <p className="mt-2 font-serif text-lg text-foreground text-center">
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
        ))}
      </div>

    </section>
  );
}