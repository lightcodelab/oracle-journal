import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SPREAD_TYPES } from "@/components/SpreadSelection";

export type RitualRhythm = "daily" | "weekly" | "monthly";
export type RitualStepKind = "deck" | "spread" | "resource";

export const RHYTHMS: { value: RitualRhythm; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export interface Ritual {
  id: string;
  user_id: string;
  name: string;
  intention: string | null;
  rhythm: RitualRhythm;
  created_at: string;
  updated_at: string;
}

export interface RitualStep {
  id: string;
  ritual_id: string;
  position: number;
  kind: RitualStepKind;
  deck_id: string | null;
  spread_type: string | null;
  resource_source: "content" | "healing" | null;
  resource_id: string | null;
  label: string | null;
  journal_prompt: string | null;
}

export interface RitualVisit {
  id: string;
  ritual_id: string;
  status: "in_progress" | "saved";
  ritual_name: string;
  ritual_rhythm: RitualRhythm;
  ritual_intention: string | null;
  closing_reflection: string | null;
  started_at: string;
  saved_at: string | null;
}

export interface RitualVisitStep extends Omit<RitualStep, "ritual_id"> {
  visit_id: string;
  source_step_id: string | null;
  note: string | null;
  marked_done: boolean;
  saved_reading_id: string | null;
  drawn_card_id: string | null;
}

/** What the member is adding to a ritual from a thumbnail or detail page. */
export type RitualAddItem =
  | { kind: "deck"; deckId: string; name: string }
  | { kind: "spread"; spreadType: string; name: string }
  | { kind: "resource"; source: "content" | "healing"; resourceId: string; name: string };

export const itemTypeLabel = (kind: RitualStepKind) =>
  kind === "deck" ? "Card draw from one deck" : kind === "spread" ? "Sacred Spread" : "Resource";

export const spreadName = (id: string | null) =>
  SPREAD_TYPES.find((s) => s.id === id)?.name ?? "Sacred Spread";

const db = supabase as any;

export const useRituals = (enabled = true) =>
  useQuery({
    queryKey: ["rituals"],
    enabled,
    queryFn: async (): Promise<Ritual[]> => {
      const { data, error } = await db.from("rituals").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useRitual = (id: string | undefined) =>
  useQuery({
    queryKey: ["ritual", id],
    enabled: !!id,
    queryFn: async () => {
      const [r, s] = await Promise.all([
        db.from("rituals").select("*").eq("id", id).maybeSingle(),
        db.from("ritual_steps").select("*").eq("ritual_id", id).order("position").order("created_at"),
      ]);
      if (r.error) throw r.error;
      if (s.error) throw s.error;
      return { ritual: r.data as Ritual | null, steps: (s.data ?? []) as RitualStep[] };
    },
  });

export const useRitualVisits = (ritualId?: string) =>
  useQuery({
    queryKey: ["ritual-visits", ritualId ?? "all"],
    queryFn: async (): Promise<RitualVisit[]> => {
      let q = db.from("ritual_visits").select("*").order("started_at", { ascending: false });
      if (ritualId) q = q.eq("ritual_id", ritualId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateRitual = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; rhythm: RitualRhythm; intention?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in");
      const { data, error } = await db
        .from("rituals")
        .insert({ user_id: user.id, name: input.name.trim(), rhythm: input.rhythm, intention: input.intention?.trim() || null })
        .select()
        .single();
      if (error) throw error;
      return data as Ritual;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rituals"] }),
  });
};

/** Append a step. `requestId` makes retries/double-taps idempotent. */
export async function appendRitualStep(ritualId: string, item: RitualAddItem, label: string | null, requestId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in");
  const { data: last } = await db
    .from("ritual_steps")
    .select("position")
    .eq("ritual_id", ritualId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row: Record<string, unknown> = {
    ritual_id: ritualId,
    user_id: user.id,
    position: (last?.position ?? -1) + 1,
    kind: item.kind,
    label: label?.trim() || item.name,
    client_request_id: requestId,
  };
  if (item.kind === "deck") row.deck_id = item.deckId;
  if (item.kind === "spread") row.spread_type = item.spreadType;
  if (item.kind === "resource") {
    row.resource_source = item.source;
    row.resource_id = item.resourceId;
  }
  const { error } = await db.from("ritual_steps").insert(row);
  // A duplicate request id means this exact add already landed — treat as success.
  if (error && error.code !== "23505") throw error;
}

export const ritualsDb = db;
