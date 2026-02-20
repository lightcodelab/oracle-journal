import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

const TIER_NAMES: Record<string, string> = {
  T1: "The Seeker",
  T2: "The Devotee",
  T3: "The Initiate",
};

const BUCKET_TO_TIER: Record<string, { minTier: string; tierName: string }> = {
  remembrance: { minTier: "T1", tierName: "The Seeker" },
  devotion: { minTier: "T2", tierName: "The Devotee" },
  communion: { minTier: "T3", tierName: "The Initiate" },
};

export function useTierAccess(): TierAccess {
  const { isAdmin } = useAuth();
  const [memberTierCode, setMemberTierCode] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [bucketAccess, setBucketAccess] = useState<Record<string, boolean>>({});
  const [tierName, setTierName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccess = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // Get user's profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("member_tier_code, subscription_status")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setLoading(false);
        return;
      }

      setMemberTierCode(profile?.member_tier_code || null);
      setSubscriptionStatus(profile?.subscription_status || null);
      setTierName(profile?.member_tier_code ? TIER_NAMES[profile.member_tier_code] || null : null);

      const access: Record<string, boolean> = {};

      // Get bucket access for user's tier (paid subscription)
      if (profile?.member_tier_code && 
          (profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing')) {
        const { data: accessData, error: accessError } = await supabase
          .from("tier_bucket_access")
          .select("bucket_key, is_granted")
          .eq("tier_code", profile.member_tier_code);

        if (!accessError && accessData) {
          accessData.forEach((item) => {
            access[item.bucket_key] = item.is_granted;
          });
        }
      }

      // Also check manual access grants (admin-granted temporary access)
      const { data: manualGrants } = await supabase
        .from("manual_access_grants")
        .select("bucket_key, starts_at, ends_at")
        .eq("user_id", session.user.id);

      if (manualGrants) {
        const now = new Date();
        manualGrants.forEach((grant) => {
          if (new Date(grant.starts_at) <= now && new Date(grant.ends_at) > now) {
            access[grant.bucket_key] = true;
          }
        });
      }

      setBucketAccess(access);
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

  const hasAccess = useCallback((bucket: string): boolean => {
    // Admins have full access to all content
    if (isAdmin) {
      return true;
    }
    // Check bucket access (includes both paid subscription AND manual grants)
    if (bucketAccess[bucket] === true) {
      return true;
    }
    // Check if user has active/trialing subscription for tier-based access
    if (subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing') {
      return false;
    }
    return false;
  }, [bucketAccess, subscriptionStatus, isAdmin]);

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
