import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Reads active, non-expired manual bucket grants for the current user.
 *
 * Uses the authoritative SECURITY DEFINER function `public.has_manual_access`
 * so we honour the same window semantics (starts_at <= now() < ends_at) that
 * `is_active_member` uses. Never widens or converts grants.
 */
export type BucketKey = "remembrance" | "devotion" | "communion";
const BUCKETS: BucketKey[] = ["remembrance", "devotion", "communion"];

export interface BucketGrants {
  remembrance: boolean;
  devotion: boolean;
  communion: boolean;
  any: boolean;
  loading: boolean;
  error: boolean;
}

const EMPTY: BucketGrants = {
  remembrance: false,
  devotion: false,
  communion: false,
  any: false,
  loading: true,
  error: false,
};

export function useBucketGrants(enabled: boolean): BucketGrants {
  const { user } = useAuth();
  const [state, setState] = useState<BucketGrants>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !user) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      const results = await Promise.all(
        BUCKETS.map((b) =>
          supabase.rpc("has_manual_access", {
            _user_id: user.id,
            _bucket_key: b,
          }),
        ),
      );
      if (cancelled) return;
      // Fail closed: if any bucket RPC returned an error, do NOT silently
      // report "no grants" — that is indistinguishable from a confirmed
      // no-access result and would misrepresent the user's true access.
      const anyError = results.some((r) => r.error);
      if (anyError) {
        setState({
          remembrance: false,
          devotion: false,
          communion: false,
          any: false,
          loading: false,
          error: true,
        });
        return;
      }
      const [rem, dev, com] = results.map((r) => Boolean(r.data));
      setState({
        remembrance: rem,
        devotion: dev,
        communion: com,
        any: rem || dev || com,
        loading: false,
        error: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, user]);

  return state;
}