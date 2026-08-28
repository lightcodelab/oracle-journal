import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * LP-D — Moments of Meaning (Presence).
 *
 * Owner-scoped client surface. Every call goes through the LP-D SECURITY DEFINER
 * RPCs; `temple_moments` / `temple_moment_movements` grant nothing to
 * `authenticated`, so the RPCs are the only door. Nothing is inferred, ranked,
 * shared, analysed, or administrator-readable, and nothing here touches Arrival.
 */

export type MomentJson = Record<string, unknown>;

export interface MomentMovement {
  content: MomentJson;
  content_revision: number;
  updated_at: string;
}

export interface MomentRecord {
  id: string;
  label: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  content_revision: number;
}

export interface MomentPayload {
  moment: MomentRecord;
  movements: Partial<Record<"register" | "recognise" | "recalibrate", MomentMovement>>;
}

export interface MomentListRow extends MomentRecord {
  register: MomentJson;
  experiment_count: number;
}

export interface StateSummary {
  id: string;
  occurred_at: string;
}

function rpc(name: string, args: Record<string, unknown>) {
  return (supabase.rpc as unknown as (
    n: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args);
}

export async function createMoment(input: {
  label?: string | null;
  register: MomentJson;
  recognise: MomentJson;
  recalibrate: MomentJson;
}): Promise<MomentPayload> {
  const { data, error } = await rpc("living_moment_create", {
    _label: input.label?.toString().trim() || null,
    _register: input.register,
    _recognise: input.recognise,
    _recalibrate: input.recalibrate,
  });
  if (error) throw new Error(error.message);
  return data as MomentPayload;
}

export async function getMoment(id: string): Promise<MomentPayload> {
  const { data, error } = await rpc("living_moment_get", { _id: id });
  if (error) throw new Error(error.message);
  return data as MomentPayload;
}

export async function updateMoment(
  id: string,
  expectedRevision: number,
  patch: {
    label?: string | null;
    register?: MomentJson;
    recognise?: MomentJson;
    recalibrate?: MomentJson;
  },
): Promise<MomentPayload> {
  const { data, error } = await rpc("living_moment_update", {
    _id: id,
    _expected_revision: expectedRevision,
    _label: patch.label ?? null,
    _register: patch.register ?? null,
    _recognise: patch.recognise ?? null,
    _recalibrate: patch.recalibrate ?? null,
  });
  if (error) throw new Error(error.message);
  return data as MomentPayload;
}

export async function listMoments(limit = 50): Promise<MomentListRow[]> {
  const { data, error } = await rpc("living_moments_list", {
    _include_archived: false,
    _limit: limit,
  });
  if (error) throw new Error(error.message);
  return ((data as { records?: MomentListRow[] })?.records ?? []) as MomentListRow[];
}

/** Member-created, neutral, non-causal association between two of her records. */
export async function linkMoment(
  momentId: string,
  targetKind: "state" | "pattern" | "experiment",
  targetId: string,
): Promise<void> {
  const { error } = await rpc("living_link_create", {
    _source_kind: "moment",
    _source_id: momentId,
    _target_kind: targetKind,
    _target_id: targetId,
  });
  if (error) throw new Error(error.message);
}

/** Optional Temple support tag the member attaches herself. */
export async function tagMomentResource(
  momentId: string,
  resourceId: string,
  noticedAfter?: string,
): Promise<void> {
  const { error } = await rpc("living_resource_tag_add", {
    _target_kind: "moment",
    _target_id: momentId,
    _resource_family: "content_resource",
    _resource_id: resourceId,
    _noticed_after: noticedAfter?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

/** Her own recent States of Being, offered only so she can link one herself. */
export function useOwnStates(enabled: boolean) {
  const [states, setStates] = useState<StateSummary[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await rpc("living_states_list", { _limit: 25 });
      if (cancelled || error) return;
      const records = (data as { records?: StateSummary[] })?.records ?? [];
      setStates(records);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return states;
}

export function useOwnMoments(enabled: boolean) {
  const [moments, setMoments] = useState<MomentListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMoments(await listMoments());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open your Moments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { moments, loading, error, reload };
}
