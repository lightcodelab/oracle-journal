import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Owner-scoped Living Pattern client surface (LP-C).
 *
 * Every call goes through the accepted LP-B SECURITY DEFINER RPCs. There are no
 * table reads or writes here: the living_* tables grant nothing to
 * `authenticated`, so the RPCs are the only door. Nothing in this file touches
 * Arrival.
 */

export type StateJson = Record<string, unknown>;

export interface LivingStateRecord {
  id: string;
  occurred_at: string;
  content_revision: number;
  feeling: StateJson;
  body: StateJson;
  capacity: StateJson;
  desired_state: StateJson;
  receive: StateJson;
  reorient: StateJson;
  created_at: string;
  updated_at: string;
}

export interface LivingPatternSummary {
  id: string;
  label: string;
  commitment: string | null;
}

function rpc(name: string, args: Record<string, unknown>) {
  // Cast: the generated types expose these RPCs, but the arg unions are wide.
  return (supabase.rpc as unknown as (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(
    name,
    args,
  );
}

export async function createLivingState(input: {
  feeling: StateJson;
  body: StateJson;
  capacity: StateJson;
  desired_state: StateJson;
  receive: StateJson;
  reorient: StateJson;
}): Promise<LivingStateRecord> {
  const { data, error } = await rpc("living_state_create", {
    _feeling: input.feeling,
    _body: input.body,
    _capacity: input.capacity,
    _desired_state: input.desired_state,
    _receive: input.receive,
    _reorient: input.reorient,
  });
  if (error) throw new Error(error.message);
  return data as LivingStateRecord;
}

export async function getLivingState(id: string): Promise<LivingStateRecord> {
  const { data, error } = await rpc("living_state_get", { _id: id });
  if (error) throw new Error(error.message);
  return data as LivingStateRecord;
}

export async function updateLivingState(
  id: string,
  expectedRevision: number,
  patch: Partial<Record<"feeling" | "body" | "capacity" | "desired_state" | "receive" | "reorient", StateJson>>,
): Promise<LivingStateRecord> {
  const { data, error } = await rpc("living_state_update", {
    _id: id,
    _expected_revision: expectedRevision,
    _feeling: patch.feeling ?? null,
    _body: patch.body ?? null,
    _capacity: patch.capacity ?? null,
    _desired_state: patch.desired_state ?? null,
    _receive: patch.receive ?? null,
    _reorient: patch.reorient ?? null,
  });
  if (error) throw new Error(error.message);
  return data as LivingStateRecord;
}

export async function linkStateToPattern(stateId: string, patternId: string): Promise<void> {
  const { error } = await rpc("living_link_create", {
    _source_kind: "state",
    _source_id: stateId,
    _target_kind: "pattern",
    _target_id: patternId,
  });
  if (error) throw new Error(error.message);
}

/**
 * Existing owner-scoped Patterns of Choosing, used only to offer an optional
 * link. LP-C never creates a Pattern.
 */
export function useOwnPatterns(enabled: boolean) {
  const [patterns, setPatterns] = useState<LivingPatternSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await rpc("living_patterns_list", { _limit: 50 });
    if (!error && data && typeof data === "object") {
      const records = (data as { records?: LivingPatternSummary[] }).records ?? [];
      setPatterns(records);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  return { patterns, loading };
}
