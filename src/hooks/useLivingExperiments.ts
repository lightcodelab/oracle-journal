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
  /** TL-1B: present only on resource/card-origin listings. */
  title_snapshot?: string | null;
}

/** TL-1B — explicitly member-authored "Temple support I used" evidence. */
export type LivingResourceFamily =
  | "content_resource"
  | "healing_resource"
  | "course"
  | "lesson"
  | "card";

export interface LivingSupportTag {
  id: string;
  target_kind: string;
  target_id: string;
  resource_family: LivingResourceFamily;
  resource_id: string;
  title_snapshot: string;
  noticed_after: string | null;
  created_at: string;
  /** False when the support is no longer available to her; never substituted. */
  available: boolean;
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


/**
 * TL-1B — begin a private experiment from an eligible resource or card she is
 * looking at. The server derives and snapshots the member-readable title and
 * refuses any resource she is not entitled to see, so nothing about the
 * resource is ever client-declared.
 */
export async function createExperimentFromResource(input: {
  resourceFamily: LivingResourceFamily;
  resourceId: string;
  guideKey?: string | null;
  ownExperiment?: string | null;
  tryBody?: string;
  trySafeEnough?: string;
}): Promise<{ experiment: LivingExperiment; support: LivingSupportTag }> {
  const content: Record<string, string> = {};
  if (input.trySafeEnough?.trim()) content.safe_enough = input.trySafeEnough.trim();

  const { data, error } = await rpc("living_experiment_create_from_resource", {
    _resource_family: input.resourceFamily,
    _resource_id: input.resourceId,
    _guide_key: input.guideKey ?? null,
    _own_experiment: input.ownExperiment?.trim() || null,
    _try_body: input.tryBody?.trim() ?? "",
    _try_content: content,
  });
  if (error) throw new Error(error.message);
  return data as { experiment: LivingExperiment; support: LivingSupportTag };
}

/** Her own experiments that began from this exact resource/card. Owner-only. */
export async function listExperimentsFromResource(
  resourceFamily: LivingResourceFamily,
  resourceId: string,
): Promise<LivingExperiment[]> {
  const { data, error } = await rpc("living_experiments_from_resource", {
    _resource_family: resourceFamily,
    _resource_id: resourceId,
    _limit: 20,
  });
  if (error) throw new Error(error.message);
  return ((data as { records?: LivingExperiment[] })?.records ?? []) as LivingExperiment[];
}

/** Record this resource/card as support she used inside an existing experiment. */
export async function addResourceSupport(input: {
  experimentId: string;
  resourceFamily: LivingResourceFamily;
  resourceId: string;
}): Promise<LivingSupportTag> {
  const { data, error } = await rpc("living_resource_tag_add", {
    _target_kind: "experiment",
    _target_id: input.experimentId,
    _resource_family: input.resourceFamily,
    _resource_id: input.resourceId,
  });
  if (error) throw new Error(error.message);
  return data as LivingSupportTag;
}

export async function getExperiment(id: string): Promise<{
  experiment: LivingExperiment;
  field_notes: LivingFieldNote[];
  support?: LivingSupportTag[];
}> {
  const { data, error } = await rpc("living_experiment_get", { _id: id });
  if (error) throw new Error(error.message);
  return data as {
    experiment: LivingExperiment;
    field_notes: LivingFieldNote[];
    support?: LivingSupportTag[];
  };
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
