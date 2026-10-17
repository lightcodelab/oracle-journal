import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import { useNewlyTagged } from "@/hooks/useNewlyTagged";

interface RecentItem {
  id: string;
  kind: "Practice" | "Course" | "Card deck";
  title: string;
  description: string | null;
  image_url: string | null;
  href: string;
  created_at: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function useRecentlyAdded(enabled: boolean) {
  return useQuery<RecentItem[]>({
    queryKey: ["recently-added"],
    enabled,
    queryFn: async () => {
      const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
      const [resResult, deckResult] = await Promise.all([
        supabase
          .from("content_resources")
          .select(
            "id, title, summary, thumbnail_url, slug, is_course, created_at, location:content_categories!location_id(page)",
          )
          .eq("status", "published")
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
        supabase
          .from("decks")
          .select("id, name, description, created_at")
          .eq("is_published", true)
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
      ]);
      if (resResult.error) throw resResult.error;
      if (deckResult.error) throw deckResult.error;

      const items: RecentItem[] = [];
      for (const r of resResult.data || []) {
        const page = (r as { location?: { page?: string } | null })?.location?.page;
        const slug = r.slug as string | null;
        if (!slug || (page !== "devotion" && page !== "remembrance" && page !== "becoming")) continue;
        const href = (r as { is_course?: boolean }).is_course
          ? `/${page}/courses/${slug}`
          : `/${page}/resources/${slug}`;
        items.push({
          id: `res-${r.id}`,
          kind: (r as { is_course?: boolean }).is_course ? "Course" : "Practice",
          title: r.title as string,
          description: (r.summary as string | null) ?? null,
          image_url: (r.thumbnail_url as string | null) ?? null,
          href,
          created_at: r.created_at as string,
        });
      }
      for (const d of deckResult.data || []) {
        items.push({
          id: `deck-${d.id}`,
          kind: "Card deck",
          title: d.name as string,
          description: (d.description as string | null) ?? null,
          image_url: null,
          href: `/remembrance?deck=${d.id}`,
          created_at: d.created_at as string,
        });
      }
      return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    staleTime: 60_000,
    retry: 1,
  });
}

export function RecentlyAddedSection({ enabled }: { enabled: boolean }) {
  const { data } = useRecentlyAdded(enabled);
  if (!data || data.length === 0) return null;
  return (
    <section aria-labelledby="recently-added-heading" className="mb-12">
      <h2 id="recently-added-heading" className="font-serif text-2xl text-foreground mb-3">
        Recently added
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          >
            <Card className="h-full overflow-hidden bg-card/70 border-border/60 group-hover:border-primary/40 transition-colors">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt=""
                  aria-hidden
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              )}
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-primary mb-1">
                  New {item.kind}
                </p>
                <h3 className="font-serif text-lg text-foreground">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                    {item.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function NewlyTaggedSection({ enabled }: { enabled: boolean }) {
  const { data: tagged } = useNewlyTagged(enabled);
  if (!tagged || tagged.length === 0) return null;
  return (
    <section aria-labelledby="newly-tagged-heading" className="mb-12">
      <h2 id="newly-tagged-heading" className="font-serif text-2xl text-foreground mb-3">
        Newly tagged
      </h2>
      <div className="flex flex-wrap gap-3">
        {tagged.map((item) => (
          <Button
            key={item.name.toLocaleLowerCase()}
            asChild
            variant="outline"
            className="text-primary border-primary/40"
          >
            <Link to={item.href}>
              <Tag className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
}
