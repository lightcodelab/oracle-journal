import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SPREAD_TYPES } from "@/components/SpreadSelection";
import type { RitualStepKind } from "@/lib/rituals";

type StepRef = {
  kind: RitualStepKind;
  deck_id: string | null;
  spread_type: string | null;
  resource_source: "content" | "healing" | string | null;
  resource_id: string | null;
};

export interface StepInfo {
  name: string;
  available: boolean;
  href: string | null; // base link to open the experience
}

const key = (s: StepRef) =>
  s.kind === "deck" ? `deck:${s.deck_id}` : s.kind === "spread" ? `spread:${s.spread_type}` : `${s.resource_source}:${s.resource_id}`;
export const stepKey = key;

/** Resolve current names and availability for a set of steps (members only see published items). */
export function useStepCatalog(steps: StepRef[]) {
  const deckIds = [...new Set(steps.filter((s) => s.kind === "deck" && s.deck_id).map((s) => s.deck_id!))];
  const contentIds = [...new Set(steps.filter((s) => s.kind === "resource" && s.resource_source === "content").map((s) => s.resource_id!))];
  const healingIds = [...new Set(steps.filter((s) => s.kind === "resource" && s.resource_source === "healing").map((s) => s.resource_id!))];

  return useQuery({
    queryKey: ["ritual-catalog", deckIds, contentIds, healingIds],
    queryFn: async () => {
      const map: Record<string, StepInfo> = {};
      const [d, c, h] = await Promise.all([
        deckIds.length ? supabase.from("decks").select("id,name,is_published,is_starter").in("id", deckIds) : { data: [] as any[] },
        contentIds.length ? supabase.from("content_resources").select("id,title,slug,status,is_course").in("id", contentIds) : { data: [] as any[] },
        healingIds.length ? supabase.from("healing_resources").select("id,title,slug,status").in("id", healingIds) : { data: [] as any[] },
      ]);
      for (const x of (d.data ?? []) as any[]) {
        map[`deck:${x.id}`] = { name: x.name, available: x.is_published !== false && !x.is_starter, href: `/remembrance?deck=${x.id}` };
      }
      for (const x of (c.data ?? []) as any[]) {
        map[`content:${x.id}`] = { name: x.title, available: x.status === "published" && !x.is_course, href: `/devotion/resources/${x.slug}` };
      }
      for (const x of (h.data ?? []) as any[]) {
        map[`healing:${x.id}`] = { name: x.title, available: x.status === "published", href: `/devotion/resources/healing-${x.slug || x.id}` };
      }
      for (const s of SPREAD_TYPES) {
        map[`spread:${s.id}`] = { name: s.name, available: true, href: `/remembrance/spreads?spread=${s.id}` };
      }
      return map;
    },
  });
}
