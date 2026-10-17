import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

interface RecentItem {
  id: string;
  kind: "Practice" | "Course" | "Card deck";
  title: string;
  description: string | null;
  image_url: string | null;
  href: string;
  created_at: string;
}

interface TaggedItem {
  id: string;
  tagName: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  href: string;
  created_at: string;
}

function resourceHref(r: { slug: string | null; is_course?: boolean; location?: { page?: string } | null }): string | null {
  const page = r.location?.page;
  if (!r.slug || (page !== "devotion" && page !== "remembrance" && page !== "becoming")) return null;
  return r.is_course ? `/${page}/courses/${r.slug}` : `/${page}/resources/${r.slug}`;
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

function useNewlyTagged(enabled: boolean) {
  return useQuery<TaggedItem[]>({
    queryKey: ["newly-tagged"],
    enabled,
    queryFn: async () => {
      const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
      const { data, error } = await supabase
        .from("content_resource_tag_assignments")
        .select(
          "created_at, tag:resource_tags!tag_id(name), resource:content_resources!resource_id(id, title, summary, thumbnail_url, slug, is_course, status, location:content_categories!location_id(page))",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const seen = new Set<string>();
      const items: TaggedItem[] = [];
      for (const row of data || []) {
        const r = row.resource as {
          id: string; title: string; summary: string | null; thumbnail_url: string | null;
          slug: string | null; is_course?: boolean; status: string;
          location?: { page?: string } | null;
        } | null;
        if (!r || r.status !== "published" || seen.has(r.id)) continue;
        const href = resourceHref(r);
        if (!href) continue;
        seen.add(r.id);
        items.push({
          id: `tag-${r.id}`,
          tagName: (row.tag as { name?: string } | null)?.name ?? "New tag",
          title: r.title,
          summary: r.summary,
          image_url: r.thumbnail_url,
          href,
          created_at: row.created_at as string,
        });
      }
      return items;
    },
    staleTime: 60_000,
    retry: 1,
  });
}

export function RecentlyAddedSection({ enabled }: { enabled: boolean }) {
  const { data } = useRecentlyAdded(enabled);
  const { data: tagged } = useNewlyTagged(enabled);
  if ((!data || data.length === 0) && (!tagged || tagged.length === 0)) return null;
  return (
    <>
      {data && data.length > 0 && (
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
