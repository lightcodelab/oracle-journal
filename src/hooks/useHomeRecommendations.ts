import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Placement = "recommended" | "seasonal";

export interface HomeRecommendation {
  id: string;
  placement: Placement;
  resource_id: string | null;
  internal_route: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  priority: number;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  // Enriched with resource slug when the target is a content_resources row
  resource_slug?: string | null;
  resolved_href?: string | null;
}

function isSafeInternalRoute(route: string | null | undefined): boolean {
  if (!route) return false;
  if (!route.startsWith("/")) return false;
  if (route.startsWith("//")) return false;
  if (route.includes("://")) return false;
  const lower = route.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return false;
  return true;
}

export function useHomeRecommendations(placement: Placement, enabled: boolean) {
  return useQuery<HomeRecommendation[]>({
    queryKey: ["home-recommendations", placement],
    enabled,
    queryFn: async () => {
      // RLS restricts to active + windowed rows for active members / admins.
      const { data, error } = await supabase
        .from("home_recommendations")
        .select(
          "id, placement, resource_id, internal_route, title, description, image_url, priority, start_at, end_at, is_active",
        )
        .eq("placement", placement)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = (data || []) as HomeRecommendation[];

      // Resolve resource slugs so link targets are stable.
      const resourceIds = Array.from(
        new Set(rows.map((r) => r.resource_id).filter(Boolean) as string[]),
      );
      // Map resource id -> canonical href. Only published resources are eligible.
      //
      // Routing is derived from the resource's location.page:
      //   page='devotion', is_course=true  -> /devotion/courses/:slug
      //   page='devotion', is_course=false -> /devotion/resources/:slug
      //   page='remembrance'               -> no per-resource canonical route
      //                                       currently exists; the resource is
      //                                       dropped rather than misrouted to
      //                                       Devotion.
      // Anything without a resolvable page/slug is dropped instead of rendered
      // as a dead card.
      let hrefMap: Record<string, string> = {};
      let slugMap: Record<string, string> = {};
      if (resourceIds.length) {
        const { data: res } = await supabase
          .from("content_resources")
          .select(
            "id, slug, status, is_course, location:content_categories!location_id(page)",
          )
          .in("id", resourceIds)
          .eq("status", "published");
        for (const r of res || []) {
          const slug = r.slug as string | null;
          if (!slug) continue;
          const page = (r as { location?: { page?: string } | null })?.location
            ?.page;
          if (page !== "devotion") continue; // safe default: drop
          slugMap[r.id as string] = slug;
          hrefMap[r.id as string] = (r as { is_course?: boolean }).is_course
            ? `/devotion/courses/${slug}`
            : `/devotion/resources/${slug}`;
        }
      }

      return rows
        .map((r) => {
          let href: string | null = null;
          if (r.resource_id && hrefMap[r.resource_id]) {
            href = hrefMap[r.resource_id];
          } else if (isSafeInternalRoute(r.internal_route)) {
            href = r.internal_route!;
          }
          return { ...r, resource_slug: slugMap[r.resource_id ?? ""] ?? null, resolved_href: href };
        })
        .filter((r) => !!r.resolved_href);
    },
    staleTime: 60_000,
    retry: 1,
  });
}

export { isSafeInternalRoute };