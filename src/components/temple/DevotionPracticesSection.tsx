import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid } from "lucide-react";

interface LocationCategory {
  id: string;
  name: string;
  slug: string;
}

export function DevotionPracticesSection() {
  const [locations, setLocations] = useState<LocationCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase
        .from("content_categories")
        .select("id, name, slug")
        .eq("type", "location")
        .eq("active", true)
        .eq("page", "devotion")
        .order("display_order");
      setLocations(data || []);
      setLoading(false);
    };
    fetchLocations();
  }, []);

  if (loading || locations.length === 0) return null;

  return (
    <section
      id="devotion-practices"
      aria-labelledby="devotion-practices-heading"
      className="mb-12"
    >
      <h2
        id="devotion-practices-heading"
        className="font-serif text-2xl text-foreground mb-3"
      >
        All Resources
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Link
          to="/devotion"
          className="group flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[64px]"
        >
          <LayoutGrid
            className="h-5 w-5 text-primary flex-shrink-0"
            aria-hidden
          />
          <span className="font-serif text-foreground text-sm sm:text-base">
            All
          </span>
        </Link>
        {locations.map(({ id, name, slug }) => (
          <Link
            key={id}
            to={`/devotion/section/${slug.replace(/^loc-/, "")}`}
            className="group flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[64px]"
          >
            <LayoutGrid
              className="h-5 w-5 text-primary flex-shrink-0"
              aria-hidden
            />
            <span className="font-serif text-foreground text-sm sm:text-base">
              {name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
