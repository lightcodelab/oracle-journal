import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import doorRemembrance from "@/assets/door-remembrance.png";
import doorDevotion from "@/assets/door-devotion.png";
import doorCommunion from "@/assets/door-communion.png";
import { BookHeart, Search, ListMusic, LineChart } from "lucide-react";

const doors = [
  { name: "Remembrance", href: "/decks", image: doorRemembrance },
  { name: "Devotion", href: "/devotion", image: doorDevotion },
  { name: "Communion", href: "/communion", image: doorCommunion },
];

const secondary = [
  { label: "Journal", href: "/journal", icon: BookHeart },
  { label: "Playlists", href: "/playlists", icon: ListMusic },
  { label: "Search", href: "/search", icon: Search },
  { label: "Tracking", href: "/tracking", icon: LineChart },
];

export function ExploreDoors() {
  return (
    <section aria-labelledby="explore-heading" className="mb-12">
      <h2 id="explore-heading" className="font-serif text-2xl text-foreground mb-1">
        Explore The Temple
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Three pathways for exploring The Temple. Every pathway is open to every active member.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {doors.map((door, i) => (
          <motion.div
            key={door.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Link
              to={door.href}
              className="block group rounded-lg overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Open the Door of ${door.name}`}
            >
              <div className="overflow-hidden rounded-lg">
                <img
                  src={door.image}
                  alt={`The Door of ${door.name}`}
                  className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </div>
              <p className="mt-2 font-serif text-lg text-foreground">
                {door.name}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {secondary.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-card border border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </Link>
        ))}
      </div>
    </section>
  );
}