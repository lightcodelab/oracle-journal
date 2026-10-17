import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { collectNewTags, NEW_TAG_WINDOW_MS, TagActivity } from "@/lib/newlyTagged";

const catalogues = ["course_tags", "resource_tags", "symptoms", "conditions"] as const;
const assignments = [
  { table: "content_resource_tag_assignments", catalogue: "course_tags", field: "tag_id" },
  { table: "course_tag_assignments", catalogue: "course_tags", field: "tag_id" },
  { table: "card_tag_assignments", catalogue: "course_tags", field: "tag_id" },
  { table: "deck_tag_assignments", catalogue: "course_tags", field: "tag_id" },
  { table: "symptom_resource_mappings", catalogue: "symptoms", field: "symptom_id" },
  { table: "resource_symptom_mappings", catalogue: "symptoms", field: "symptom_id" },
  { table: "condition_resource_mappings", catalogue: "conditions", field: "condition_id" },
] as const;

export function useNewlyTagged(enabled: boolean) {
  return useQuery({
    queryKey: ["newly-tagged", "all-catalogues"],
    enabled,
    queryFn: async () => {
      const now = Date.now();
      const since = new Date(now - NEW_TAG_WINDOW_MS).toISOString();
      const [catalogueRows, assignmentRows] = await Promise.all([
        Promise.all(catalogues.map(async (table) => {
          const rows: { id: string; name: string; created_at: string }[] = [];
          for (let offset = 0; ; offset += 1000) {
            const { data, error } = await supabase.from(table).select("id, name, created_at").order("id").range(offset, offset + 999);
            if (error) throw error;
            rows.push(...(data || []));
            if (!data || data.length < 1000) break;
          }
          return { table, rows };
        })),
        Promise.all(assignments.map(async (source) => {
          const rows: Record<string, string>[] = [];
          for (let offset = 0; ; offset += 1000) {
            const { data, error } = await supabase.from(source.table)
              .select(`${source.field}, created_at`).gte("created_at", since)
              .order("id").range(offset, offset + 999);
            if (error) throw error;
            const batch = (data || []) as unknown as Record<string, string>[];
            rows.push(...batch);
            if (batch.length < 1000) break;
          }
          return { source, rows };
        })),
      ]);
      const activity: TagActivity[] = catalogueRows.flatMap(({ rows }) => rows);
      for (const { source, rows } of assignmentRows) {
        const catalogue = catalogueRows.find(({ table }) => table === source.catalogue);
        const names = new Map(catalogue?.rows.map(tag => [tag.id, tag.name]));
        for (const row of rows) {
          const name = names.get(row[source.field]);
          if (name) activity.push({ name, created_at: row.created_at });
        }
      }
      return collectNewTags(activity, now);
    },
    staleTime: 60_000,
    retry: 1,
  });
}