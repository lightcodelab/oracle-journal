import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * LP-E — Patterns of Choosing (Practice).
 *
 * Owner-scoped client surface. Every call goes through the accepted LP-B/LP-E
 * SECURITY DEFINER RPCs; `living_patterns` and `living_pattern_evidence` grant
 * nothing to `authenticated`, so the RPCs are the only door. Nothing here is
 * scored, ranked, shared, analysed, administrator-readable, or causal, and
 * nothing in this file touches Arrival.
 */

export type PatternJson = Record<string, unknown>;

export interface LivingPatternRecord {
  id: string;
  label: string;
  commitment: string | null;
  content: PatternJson;
  content_revision: number;
  chosen_at: string;
  rechosen_at: string | null;
  retired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LivingPatternEvidence {
  id: string;
  pattern_id: string;
  occurred_at: string;
  content: PatternJson;
  content_revision: number;
  created_at: string;
  updated_at: string;
}

function rpc(name: string, args: Record<string, unknown>) {
  return (supabase.rpc as unknown as (
    n: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args);
}

export async function createPattern(input: {
  label: string;
  commitment?: string | null;
  content?: PatternJson;
}): Promise<LivingPatternRecord> {
  const { data, error } = await rpc("living_pattern_create", {
    _label: input.label.trim(),
    _commitment: input.commitment?.trim() || null,
    _content: input.content ?? {},
  });
  if (error) throw new Error(error.message);
  return data as LivingPatternRecord;
}

export async function getPattern(id: string): Promise<LivingPatternRecord> {
  const { data, error } = await rpc("living_pattern_get", { _id: id });
  if (error) throw new Error(error.message);
  return data as LivingPatternRecord;
}

export async function updatePattern(
  id: string,
  expectedRevision: number,
  patch: {
    label?: string;
    commitment?: string | null;
    content?: PatternJson;
    rechoose?: boolean;
    retire?: boolean;
    unretire?: boolean;
  },
): Promise<LivingPatternRecord> {
  const { data, error } = await rpc("living_pattern_update", {
    _id: id,
    _expected_revision: expectedRevision,
    _label: patch.label?.trim() ?? null,
    _commitment: patch.commitment ?? null,
    _content: patch.content ?? null,
    _rechoose: patch.rechoose ?? false,
    _retire: patch.retire ?? false,
    _unretire: patch.unretire ?? false,
  });
  if (error) throw new Error(error.message);
  return data as LivingPatternRecord;
}

export async function listPatterns(includeRetired = true): Promise<LivingPatternRecord[]> {
  const { data, error } = await rpc("living_patterns_list", {
    _include_retired: includeRetired,
    _limit: 50,
  });
  if (error) throw new Error(error.message);
  return ((data as { records?: LivingPatternRecord[] })?.records ?? []) as LivingPatternRecord[];
}

/** Pattern-specific, member-authored evidence. Never graded, never proof of progress. */
export async function addPatternEvidence(input: {
  patternId: string;
  body: string;
  relation?: string | null;
}): Promise<LivingPatternEvidence> {
  const content: Record<string, string> = {};
  if (input.body.trim()) content.body = input.body.trim();
  if (input.relation) content.relation = input.relation;

  const { data, error } = await rpc("living_pattern_evidence_create", {
    _pattern_id: input.patternId,
    _content: content,
  });
  if (error) throw new Error(error.message);
  return data as LivingPatternEvidence;
}

export async function listPatternEvidence(patternId: string): Promise<LivingPatternEvidence[]> {
  const { data, error } = await rpc("living_pattern_evidence_list", {
    _pattern_id: patternId,
    _limit: 50,
  });
  if (error) throw new Error(error.message);
  return ((data as { records?: LivingPatternEvidence[] })?.records ?? []) as LivingPatternEvidence[];
}

/** Member-created, neutral, non-causal association between two of her records. */
export async function linkPattern(
  patternId: string,
  targetKind: "state" | "moment" | "experiment",
  targetId: string,
): Promise<void> {
  const { error } = await rpc("living_link_create", {
    _source_kind: "pattern",
    _source_id: patternId,
    _target_kind: targetKind,
    _target_id: targetId,
  });
  if (error) throw new Error(error.message);
}

export function usePatternRecord(id: string | undefined, enabled: boolean) {
  const [pattern, setPattern] = useState<LivingPatternRecord | null>(null);
  const [evidence, setEvidence] = useState<LivingPatternEvidence[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [p, e] = await Promise.all([getPattern(id), listPatternEvidence(id)]);
      setPattern(p);
      setEvidence(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open that Pattern.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (enabled && id) void reload();
  }, [enabled, id, reload]);

  return { pattern, setPattern, evidence, loading, error, reload };
}

export function useOwnPatternRecords(enabled: boolean) {
  const [patterns, setPatterns] = useState<LivingPatternRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPatterns(await listPatterns(true));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open your Patterns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { patterns, loading, error, reload };
}
