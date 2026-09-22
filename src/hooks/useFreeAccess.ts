import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FreeAccessState {
  loading: boolean;
  /** Paying or manually granted member. */
  hasFullAccess: boolean;
  /** Signed in, but without membership. */
  isFreeAccount: boolean;
  /** A free account that has already used its one free reading. */
  freeReadingUsed: boolean;
  /** A free account that may still draw its one free reading. */
  canUseFreeReading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Resolves whether the signed-in person is a member, or a free account with
 * (or without) its single Past, Present, Future reading still available.
 * The server enforces the same rule; this only shapes the interface.
 */
export function useFreeAccess(): FreeAccessState {
  const [loading, setLoading] = useState(true);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [freeReadingUsed, setFreeReadingUsed] = useState(false);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSignedIn(false);
      setHasFullAccess(false);
      setFreeReadingUsed(false);
      setLoading(false);
      return;
    }

    setSignedIn(true);
    const [{ data: access }, { data: profile }] = await Promise.all([
      supabase.rpc('has_full_temple_access', { _user_id: session.user.id }),
      supabase
        .from('profiles')
        .select('free_reading_used_at')
        .eq('id', session.user.id)
        .maybeSingle(),
    ]);

    setHasFullAccess(Boolean(access));
    setFreeReadingUsed(Boolean(profile?.free_reading_used_at));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isFreeAccount = signedIn && !hasFullAccess;

  return {
    loading,
    hasFullAccess,
    isFreeAccount,
    freeReadingUsed: isFreeAccount && freeReadingUsed,
    canUseFreeReading: isFreeAccount && !freeReadingUsed,
    refresh: load,
  };
}
