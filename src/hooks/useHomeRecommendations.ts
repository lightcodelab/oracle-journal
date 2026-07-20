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
      let slugMap: Record<string, string> = {};
      if (resourceIds.length) {
        const { data: res } = await supabase
          .from("content_resources")
          .select("id, slug, status")
          .in("id", resourceIds)
          .eq("status", "published");
        slugMap = Object.fromEntries(
          (res || []).map((r) => [r.id as string, r.slug as string]),
        );
      }

      return rows
        .map((r) => {
          let href: string | null = null;
          if (r.resource_id && slugMap[r.resource_id]) {
            href = `/devotion/resources/${slugMap[r.resource_id]}`;
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