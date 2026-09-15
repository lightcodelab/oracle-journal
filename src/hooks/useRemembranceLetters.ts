import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * The Remembrance Letters — a member's own year-long pilgrimage.
 *
 * Letters are written server-side; the browser only reads its own rows (owner
 * scoped RLS) and saves its own private reflections through a security-definer
 * RPC.
 */

export interface RemembranceCardSnapshot {
  id: string;
  card_title: string | null;
  card_number: number | null;
  deck_name: string | null;
  image_file_name: string | null;
}

export interface RemembranceReflection {
  id: string;
  letter_id: string;
  asking_to_be_seen: string;
  invited_to_shift: string;
  how_i_will_live_it: string;
  updated_at: string;
}

export interface RemembranceLetter {
  id: string;
  month_number: number;
  theme: string;
  card_snapshot: RemembranceCardSnapshot[];
  content: string;
  practices: string[];
  generated_at: string;
  read_at: string | null;
}

export interface RemembrancePilgrim {
  id: string;
  joined_at: string;
  current_month: number;
  next_letter_due_at: string | null;
  status: "active" | "paused" | "completed";
  paused_reason: string | null;
}

export function useRemembranceLetters() {
  const [pilgrim, setPilgrim] = useState<RemembrancePilgrim | null>(null);
  const [letters, setLetters] = useState<RemembranceLetter[]>([]);
  const [reflections, setReflections] = useState<Record<string, RemembranceReflection>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pilgrimRes, lettersRes, reflectionsRes] = await Promise.all([
        supabase.from("remembrance_pilgrims").select("*").maybeSingle(),
        supabase.from("remembrance_letters").select("*").order("month_number", { ascending: true }),
        supabase.from("remembrance_reflections").select("*"),
      ]);

      if (pilgrimRes.error) throw pilgrimRes.error;
      if (lettersRes.error) throw lettersRes.error;
      if (reflectionsRes.error) throw reflectionsRes.error;

      setPilgrim((pilgrimRes.data as unknown as RemembrancePilgrim) ?? null);
      setLetters(
        ((lettersRes.data ?? []) as any[]).map((l) => ({
          id: l.id,
          month_number: l.month_number,
          theme: l.theme,
          card_snapshot: Array.isArray(l.card_snapshot) ? l.card_snapshot : [],
          content: l.content,
          practices: Array.isArray(l.practices) ? l.practices : [],
          generated_at: l.generated_at,
          read_at: l.read_at ?? null,
        })),
      );
      const map: Record<string, RemembranceReflection> = {};
      ((reflectionsRes.data ?? []) as any[]).forEach((r) => (map[r.letter_id] = r));
      setReflections(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your letters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Joins the pilgrimage and asks for the first letter straight away. */
  const join = useCallback(async () => {
    const { error: joinError } = await supabase.rpc("remembrance_join");
    if (joinError) throw joinError;
    const { data, error: fnError } = await supabase.functions.invoke("generate-remembrance-letter");
    await load();
    if (fnError) {
      const details = (fnError as any)?.context?.text
        ? await (fnError as any).context.text()
        : fnError.message;
      throw new Error(details);
    }
    return data;
  }, [load]);

  const saveReflection = useCallback(
    async (
      letterId: string,
      values: { asking_to_be_seen: string; invited_to_shift: string; how_i_will_live_it: string },
    ) => {
      const { data, error: rpcError } = await supabase.rpc("remembrance_save_reflection", {
        _letter_id: letterId,
        _asking_to_be_seen: values.asking_to_be_seen,
        _invited_to_shift: values.invited_to_shift,
        _how_i_will_live_it: values.how_i_will_live_it,
      });
      if (rpcError) throw rpcError;
      const row = data as unknown as RemembranceReflection;
      setReflections((prev) => ({ ...prev, [letterId]: row }));
      return row;
    },
    [],
  );

  const markRead = useCallback(
    async (letterId: string) => {
      const { data, error: rpcError } = await supabase.rpc("remembrance_mark_read", {
        _letter_id: letterId,
      });
      if (rpcError) throw rpcError;
      const row = data as unknown as RemembranceLetter;
      setLetters((prev) =>
        prev.map((l) => (l.id === letterId ? { ...l, read_at: row.read_at } : l))
      );
      return row;
    },
    [],
  );

  return { pilgrim, letters, reflections, loading, error, reload: load, join, saveReflection, markRead };
}
