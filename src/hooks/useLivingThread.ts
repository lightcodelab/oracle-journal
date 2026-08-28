import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * LP-F.0 — owner-only chronological read of her own Living Pattern records.
 *
 * Every call goes through the accepted `living_thread_page` SECURITY DEFINER
 * RPC. There is no table access here: the living_* tables grant nothing to
 * `authenticated`, so the RPC is the only door. Keyset pagination only —
 * 20 records per deliberate request, never infinite scroll or offset paging.
 * Nothing here scores, ranks, interprets, or touches Arrival.
 */

export type ThreadKind =
  | "state"
  | "moment"
  | "pattern"
  | "pattern_evidence"
  | "experiment"
  | "field_note";

export interface ThreadRecord {
  kind: ThreadKind;
  id: string;
  occurred_at: string;
  parent_id: string | null;
  label: string | null;
  content_revision: number;
  created_at: string;
  updated_at: string;
}

interface ThreadCursor {
  occurred_at: string;
  id: string;
}

interface ThreadPage {
  records: ThreadRecord[];
  next_cursor: ThreadCursor | null;
}

function rpc(name: string, args: Record<string, unknown>) {
  return (supabase.rpc as unknown as (
    n: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args);
}

export async function fetchThreadPage(cursor?: ThreadCursor | null): Promise<ThreadPage> {
  const { data, error } = await rpc("living_thread_page", {
    _cursor_occurred_at: cursor?.occurred_at ?? null,
    _cursor_id: cursor?.id ?? null,
  });
  if (error) throw new Error(error.message);
  const page = (data ?? {}) as Partial<ThreadPage>;
  return {
    records: page.records ?? [],
    next_cursor: page.next_cursor ?? null,
  };
}

export function useLivingThread(enabled: boolean) {
  const [records, setRecords] = useState<ThreadRecord[]>([]);
  const [cursor, setCursor] = useState<ThreadCursor | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchThreadPage(null);
      setRecords(page.records);
      setCursor(page.next_cursor);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open your record.");
    } finally {
      setLoading(false);
    }
  }, []);

  /** Deliberate, member-initiated "Go back further". */
  const loadOlder = useCallback(async () => {
    if (!cursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await fetchThreadPage(cursor);
      setRecords((prev) => {
        const seen = new Set(prev.map((r) => `${r.kind}:${r.id}`));
        return [...prev, ...page.records.filter((r) => !seen.has(`${r.kind}:${r.id}`))];
      });
      setCursor(page.next_cursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not go back further.");
    } finally {
      setLoadingMore(false);
    }
  }, [cursor]);

  useEffect(() => {
    if (enabled && !loaded && !loading) void reload();
  }, [enabled, loaded, loading, reload]);

  return {
    records,
    loading,
    loadingMore,
    error,
    hasOlder: !!cursor,
    reload,
    loadOlder,
  };
}
