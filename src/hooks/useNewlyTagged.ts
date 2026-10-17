import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { collectNewTags, NEW_TAG_WINDOW_MS, TagActivity } from "@/lib/newlyTagged";

const catalogues = ["course_tags", "resource_tags", "symptoms", "conditions"] as const;

export function useNewlyTagged(enabled: boolean) {
  return useQuery({
    queryKey: ["newly-tagged", "catalogue-creations-only"],
    enabled,
    queryFn: async () => {
      const now = Date.now();
      const since = new Date(now - NEW_TAG_WINDOW_MS).toISOString();
      const catalogueRows = await Promise.all(catalogues.map(async (table) => {
          const rows: { id: string; name: string; created_at: string }[] = [];
          for (let offset = 0; ; offset += 1000) {
            const { data, error } = await supabase.from(table).select("id, name, created_at").gte("created_at", since).order("id").range(offset, offset + 999);
            if (error) throw error;
            rows.push(...(data || []));
            if (!data || data.length < 1000) break;
          }
          return { table, rows };
        }));
      const activity: TagActivity[] = catalogueRows.flatMap(({ rows }) => rows);
      return collectNewTags(activity, now);
    },
    staleTime: 60_000,
    retry: 1,
  });
}