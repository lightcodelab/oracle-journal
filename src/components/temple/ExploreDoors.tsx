import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import doorRemembrance from "@/assets/door-of-remembrance-4.png.asset.json";
import doorDevotion from "@/assets/door-of-devotion-temple-thumbnail.webp.asset.json";
import doorCommunion from "@/assets/door-of-communion-temple-thumbnail.webp.asset.json";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookHeart, Search, ListMusic, LineChart, Sparkles, HeartPulse } from "lucide-react";

const doors = [
  { name: "The Door of Remembrance", href: "/remembrance", image: doorRemembrance.url, description: "Explore the patterns, stories and inheritances shaping you.\nRITUALS, CARD DECKS & COURSES" },
  { name: "The Door of Devotion", href: "/devotion", image: doorDevotion.url, description: "Return to yourself through guided meditation and restorative practice.\nAREEKEERA HEALING TEMPLATES & MEDITATIONS" },
  { name: "The Door of Communion", href: "/communion", image: doorCommunion.url, description: "Find connection, reflection and support within our community.\nLIVE READINGS, CLASSES, WORKSHOPS & REPLAYS" },
];

const tools = [
  { label: "Journal", href: "/journal", icon: BookHeart },
  { label: "Playlists", href: "/playlists", icon: ListMusic },
  { label: "Tracking", href: "/tracking", icon: LineChart },
  { label: "Readings", href: "/readings", icon: Sparkles },
  { label: "Protocols", href: "/devotion/protocols", icon: HeartPulse },
];

export function ExploreDoors() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

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
              <div className="overflow-hidden rounded-lg aspect-square">
                <img
                  src={door.image}
                  alt={`The Door of ${door.name}`}
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </div>
              <p className="mt-2 font-serif text-lg text-foreground text-center">
                {door.name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground text-center leading-relaxed whitespace-pre-line">
                {door.description}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="rounded-lg border border-border/50 bg-card/50 p-4 mb-6">
        <h3 className="font-serif text-2xl text-foreground mb-1">
          Search The Temple
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Find teachings, resources, and pathways by name or keyword.
        </p>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search The Temple"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={!searchQuery.trim()}>
            Search
          </Button>
        </form>
      </div>

      <div className="rounded-lg border border-border/50 bg-card/50 p-4">
        <h3 className="font-serif text-2xl text-foreground mb-1">
          Tools for Your Return
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Gentle places to reflect, listen, and notice what is changing.
        </p>
        <div className="flex flex-wrap gap-2">
          {tools.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-card border border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}