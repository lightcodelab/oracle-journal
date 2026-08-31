import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * LP-F.1B — Active Patterns.
 *
 * Owner-scoped read of her own Patterns of Choosing together with what she has
 * already attached to them. Counts are simple totals of her own records, never
 * scores, streaks, progress, or interpretation. Goes through the accepted
 * `living_active_patterns` SECURITY DEFINER RPC; the tables grant nothing to
 * `authenticated`. Nothing here touches Arrival.
 */

export interface ActivePatternRef {
  kind: string;
  id: string;
  label?: string | null;
  occurred_at?: string | null;
  created_at?: string | null;
  parent_id?: string | null;
}

export interface ActivePatternSupport {
  id: string;
  title: string;
  resource_family: string;
  resource_id: string;
}

export interface ActivePattern {
  id: string;
  label: string;
  commitment: string | null;
  content_revision: number;
  chosen_at: string;
  rechosen_at: string | null;
  retired_at: string | null;
  evidence_count: number;
  linked_count: number;
  experiment_count: number;
  support_count: number;
  evidence: ActivePatternRef[];
  links: ActivePatternRef[];
  experiments: ActivePatternRef[];
  supports: ActivePatternSupport[];
}

function rpc(name: string, args: Record<string, unknown>) {
  return (supabase.rpc as unknown as (
    n: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args);
}

export async function listActivePatterns(includeRetired = false): Promise<ActivePattern[]> {
  const { data, error } = await rpc("living_active_patterns", {
    _include_retired: includeRetired,
    _limit: 50,
  });
  if (error) throw new Error(error.message);
  return ((data as { records?: ActivePattern[] })?.records ?? []) as ActivePattern[];
}

export function useLivingActivePatterns(enabled: boolean) {
  const [includeRetired, setIncludeRetired] = useState(false);
  const [patterns, setPatterns] = useState<ActivePattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPatterns(await listActivePatterns(includeRetired));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open your Patterns.");
    } finally {
      setLoading(false);
    }
  }, [includeRetired]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { patterns, loading, error, reload, includeRetired, setIncludeRetired };
}
