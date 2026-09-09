import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pattern Records (LP-G.1) — owner-only access.
 *
 * Every read and write goes through security-definer RPCs that derive the owner
 * from the session. The tables have forced RLS and no direct grants, so no
 * user_id is ever sent from the browser.
 */

export interface PatternRecord {
  id: string;
  occurred_at: string;
  schema_version: number;
  content_revision: number;
  moment_text: string;
  state_words: string[];
  body_text: string;
  body_cues: string[];
  capacity: string;
  meaning_text: string;
  prediction_text: string;
  familiarity: string;
  protection_text: string | null;
  action_text: string;
  identity_text: string;
  continue_identity: string;
  experiment_text: string;
  initial_completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface PatternReturn {
  id: string;
  record_id: string;
  content_revision: number;
  tried_text: string;
  happened_text: string;
  noticed_text: string;
  prediction_outcome: string;
  support_text: string | null;
  carry_forward_text: string;
  recorded_at: string;
}

export interface PatternRecordWithReturns {
  record: PatternRecord;
  returns: PatternReturn[];
}

export interface PatternRecordSummary {
  id: string;
  occurred_at: string;
  moment_text: string;
  state_words: string[];
  capacity: string;
  familiarity: string;
  experiment_text: string;
  content_revision: number;
  return_count: number;
}

export interface ThemeCount {
  value: string;
  count: number;
  record_ids: string[];
}

export interface CommonThemes {
  state_words: ThemeCount[];
  body_cues: ThemeCount[];
  capacity: ThemeCount[];
  familiarity: ThemeCount[];
  continue_identity: ThemeCount[];
  prediction_outcome: ThemeCount[];
  repeated_meanings: ThemeCount[];
}

export interface PatternRecordDraft {
  moment_text: string;
  state_words: string[];
  body_text: string;
  body_cues: string[];
  capacity: string;
  meaning_text: string;
  prediction_text: string;
  familiarity: string;
  protection_text: string | null;
  action_text: string;
  identity_text: string;
  continue_identity: string;
  experiment_text: string;
}

const rpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw new Error(friendlyError(error.message));
  return data as T;
};

const friendlyError = (message: string) => {
  if (message.includes("living_unauthenticated")) return "Please sign in again to open your record.";
  if (message.includes("living_forbidden")) return "Your membership does not currently open this record.";
  if (message.includes("living_not_found")) return "That record could not be found.";
  if (message.includes("living_revision_conflict"))
    return "This record changed elsewhere. Reopen it and try again.";
  if (message.includes("living_incomplete_record"))
    return "Every question needs an answer before this can be saved.";
  return message;
};

export const createPatternRecord = (draft: PatternRecordDraft) =>
  rpc<PatternRecordWithReturns>("pattern_record_create", {
    _moment_text: draft.moment_text,
    _state_words: draft.state_words,
    _body_text: draft.body_text,
    _body_cues: draft.body_cues,
    _capacity: draft.capacity,
    _meaning_text: draft.meaning_text,
    _prediction_text: draft.prediction_text,
    _familiarity: draft.familiarity,
    _protection_text: draft.protection_text,
    _action_text: draft.action_text,
    _identity_text: draft.identity_text,
    _continue_identity: draft.continue_identity,
    _experiment_text: draft.experiment_text,
  });

export const getPatternRecord = (id: string) =>
  rpc<PatternRecordWithReturns>("pattern_record_get", { _id: id });

export const updatePatternRecord = (
  id: string,
  expectedRevision: number,
  patch: Partial<PatternRecordDraft>,
) =>
  rpc<PatternRecordWithReturns>("pattern_record_update", {
    _id: id,
    _expected_revision: expectedRevision,
    _moment_text: patch.moment_text ?? null,
    _state_words: patch.state_words ?? null,
    _body_text: patch.body_text ?? null,
    _body_cues: patch.body_cues ?? null,
    _capacity: patch.capacity ?? null,
    _meaning_text: patch.meaning_text ?? null,
    _prediction_text: patch.prediction_text ?? null,
    _familiarity: patch.familiarity ?? null,
    _protection_text: patch.protection_text ?? null,
    _action_text: patch.action_text ?? null,
    _identity_text: patch.identity_text ?? null,
    _continue_identity: patch.continue_identity ?? null,
    _experiment_text: patch.experiment_text ?? null,
  });

export interface PatternReturnDraft {
  tried_text: string;
  happened_text: string;
  noticed_text: string;
  prediction_outcome: string;
  support_text: string | null;
  carry_forward_text: string;
}

export const createPatternReturn = (recordId: string, draft: PatternReturnDraft) =>
  rpc<PatternRecordWithReturns>("pattern_return_create", {
    _record_id: recordId,
    _tried_text: draft.tried_text,
    _happened_text: draft.happened_text,
    _noticed_text: draft.noticed_text,
    _prediction_outcome: draft.prediction_outcome,
    _support_text: draft.support_text,
    _carry_forward_text: draft.carry_forward_text,
  });

/** Pattern Records newest first. */
export const usePatternRecords = () => {
  const [records, setRecords] = useState<PatternRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rpc<{ records: PatternRecordSummary[] }>("pattern_records_list", {
        _limit: 50,
      });
      setRecords(data?.records ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open your records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { records, loading, error, reload: load };
};

/** Records saved a while ago with no Return yet — an invitation, never overdue. */
export const useRecordsAwaitingReturn = () => {
  const [records, setRecords] = useState<
    { id: string; occurred_at: string; moment_text: string; experiment_text: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rpc<{ records: typeof records }>("pattern_records_awaiting_return", {});
      setRecords(data?.records ?? []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { records, loading, reload: load };
};

/** Deterministic counts of her own answers. No inference, no scoring. */
export const useCommonThemes = () => {
  const [themes, setThemes] = useState<CommonThemes | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setThemes(await rpc<CommonThemes>("pattern_common_themes", {}));
    } catch {
      setThemes(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { themes, loading, reload: load };
};
