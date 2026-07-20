import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Compatibility wrapper over the new one-membership model.
 *
 * In the previous three-tier system this hook computed per-bucket
 * access from `tier_bucket_access`. Under the new model there are no
 * tier-based gates: every active member (or admin, or any user with
 * a valid manual grant) can open every Door.
 *
 * The old shape is preserved so existing callers keep working; new
 * code should prefer `useMemberState`.
 */
interface TierAccess {
  memberTierCode: string | null;
  subscriptionStatus: string | null;
  bucketAccess: Record<string, boolean>;
  loading: boolean;
  hasAccess: (bucket: string) => boolean;
  tierName: string | null;
  refetch: () => Promise<void>;
  isAdmin: boolean;
}

// Retained for a small number of admin surfaces that still reference the
// legacy tier labels; the app no longer surfaces these to members.
const TIER_NAMES: Record<string, string> = {
  T1: "Member",
  T2: "Member",
  T3: "Member",
};

const BUCKET_TO_TIER: Record<string, { minTier: string; tierName: string }> = {
  remembrance: { minTier: "member", tierName: "Membership" },
  devotion: { minTier: "member", tierName: "Membership" },
  communion: { minTier: "member", tierName: "Membership" },
};

const ALL_BUCKETS = ["remembrance", "devotion", "communion"] as const;

export function useTierAccess(): TierAccess {
  const { isAdmin } = useAuth();
  const [memberTierCode, setMemberTierCode] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [isActiveMember, setIsActiveMember] = useState(false);
  const [tierName, setTierName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccess = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("member_tier_code, subscription_status, is_active_member")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setLoading(false);
        return;
      }

      setMemberTierCode(profile?.member_tier_code || null);
      setSubscriptionStatus(profile?.subscription_status || null);
      setIsActiveMember(Boolean(profile?.is_active_member));
      setTierName(profile?.is_active_member ? "Member" : null);
    } catch (error) {
      console.error("Error in useTierAccess:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAccess();
    });

    return () => subscription.unsubscribe();
  }, [fetchAccess]);

  const hasAccess = useCallback(
    (_bucket: string): boolean => {
      // Under the one-membership model every active member opens every Door.
      if (isAdmin) return true;
      return isActiveMember;
    },
    [isActiveMember, isAdmin],
  );

  const bucketAccess: Record<string, boolean> = Object.fromEntries(
    ALL_BUCKETS.map((b) => [b, isAdmin || isActiveMember]),
  );

  return {
    memberTierCode,
    subscriptionStatus,
    bucketAccess,
    loading,
    hasAccess,
    tierName,
    refetch: fetchAccess,
    isAdmin,
  };
}

export function getRequiredTierForBucket(bucket: string): { minTier: string; tierName: string } | null {
  return BUCKET_TO_TIER[bucket] || null;
}

export { TIER_NAMES, BUCKET_TO_TIER };
