import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * LP-C.1 — Field Notes for Your Experiments (text only).
 *
 * Owner-scoped client surface. Every call goes through the LP-C.1 SECURITY
 * DEFINER RPCs; the living_experiments / living_field_notes tables grant nothing
 * to `authenticated`, so the RPCs are the only door. No media, no sharing, no
 * admin path, and nothing here touches Arrival.
 */

export type ExperimentLifecycle = "active" | "returned" | "changed_course" | "stopped";
export type FieldNotePhase = "try" | "notice" | "return";

export interface LivingExperiment {
  id: string;
  state_id: string | null;
  moment_id: string | null;
  /** LP-E: an experiment may instead originate from one of her own Patterns. */
  pattern_id: string | null;
  guide_key: string | null;
  own_experiment: string | null;

  lifecycle: ExperimentLifecycle;
  content_revision: number;
  created_at: string;
  updated_at: string;
  returned_at: string | null;
  notice_count?: number;
  has_return?: boolean;
}


export interface LivingFieldNote {
  id: string;
  experiment_id: string;
  phase: FieldNotePhase;
  body: string;
  content: Record<string, unknown>;
  outcome: string | null;
  content_revision: number;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

function rpc(name: string, args: Record<string, unknown>) {
  return (supabase.rpc as unknown as (
    n: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args);
}

export async function createExperiment(input: {
  stateId?: string | null;
  /** LP-D: an experiment may instead originate from one of her own Moments. */
  momentId?: string | null;
  /** LP-E: or from one of her own Patterns of Choosing. */
  patternId?: string | null;
  guideKey: string | null;
  ownExperiment?: string | null;
  tryBody?: string;
  trySafeEnough?: string;
}): Promise<LivingExperiment> {
  const content: Record<string, string> = {};
  if (input.trySafeEnough?.trim()) content.safe_enough = input.trySafeEnough.trim();

  const { data, error } = await rpc("living_experiment_create", {
    _state_id: input.stateId ?? null,
    _moment_id: input.momentId ?? null,
    _pattern_id: input.patternId ?? null,
    _guide_key: input.guideKey,
    _own_experiment: input.ownExperiment?.trim() || null,
    _try_body: input.tryBody?.trim() ?? "",
    _try_content: content,
  });

  if (error) throw new Error(error.message);
  return data as LivingExperiment;
}


export async function getExperiment(id: string): Promise<{
  experiment: LivingExperiment;
  field_notes: LivingFieldNote[];
}> {
  const { data, error } = await rpc("living_experiment_get", { _id: id });
  if (error) throw new Error(error.message);
  return data as { experiment: LivingExperiment; field_notes: LivingFieldNote[] };
}

export async function listExperiments(includeClosed = true): Promise<LivingExperiment[]> {
  const { data, error } = await rpc("living_experiments_list", {
    _include_closed: includeClosed,
    _limit: 50,
  });
  if (error) throw new Error(error.message);
  return ((data as { records?: LivingExperiment[] })?.records ?? []) as LivingExperiment[];
}

export async function updateExperiment(
  id: string,
  expectedRevision: number,
  patch: { lifecycle?: ExperimentLifecycle; ownExperiment?: string; guideKey?: string },
): Promise<LivingExperiment> {
  const { data, error } = await rpc("living_experiment_update", {
    _id: id,
    _expected_revision: expectedRevision,
    _guide_key: patch.guideKey ?? null,
    _own_experiment: patch.ownExperiment ?? null,
    _lifecycle: patch.lifecycle ?? null,
  });
  if (error) throw new Error(error.message);
  return data as LivingExperiment;
}

export async function createFieldNote(input: {
  experimentId: string;
  phase: FieldNotePhase;
  body?: string;
  content?: Record<string, unknown>;
  outcome?: string | null;
}): Promise<LivingFieldNote> {
  const { data, error } = await rpc("living_field_note_create", {
    _experiment_id: input.experimentId,
    _phase: input.phase,
    _body: input.body?.trim() ?? "",
    _content: input.content ?? {},
    _outcome: input.outcome ?? null,
  });
  if (error) throw new Error(error.message);
  return data as LivingFieldNote;
}

export async function updateFieldNote(
  id: string,
  expectedRevision: number,
  patch: { body?: string; content?: Record<string, unknown>; outcome?: string | null },
): Promise<LivingFieldNote> {
  const { data, error } = await rpc("living_field_note_update", {
    _id: id,
    _expected_revision: expectedRevision,
    _body: patch.body ?? null,
    _content: patch.content ?? null,
    _outcome: patch.outcome ?? null,
  });
  if (error) throw new Error(error.message);
  return data as LivingFieldNote;
}

/** Minimal owner-only list of her experiments. Not the LP-F Living Thread. */
export function useOwnExperiments(enabled: boolean) {
  const [experiments, setExperiments] = useState<LivingExperiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setExperiments(await listExperiments(true));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open your experiments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { experiments, loading, error, reload };
}
