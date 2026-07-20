import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Canonical member state for the one-membership model.
 *
 * Reads `public.get_member_state(user)` which returns a single jsonb blob
 * combining active-membership status, founder recognition, founder-price
 * eligibility, and subscription window info. This is the ONLY hook that
 * should be used for gating post-migration; useTierAccess is a thin
 * compatibility wrapper.
 */
export interface MemberState {
  isActiveMember: boolean;
  isFoundingMember: boolean;
  founderBadge: boolean;
  foundingPriceStatus: "active" | "in_grace" | "lost" | null;
  foundingMemberSince: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  isAdmin: boolean;
}

const EMPTY: MemberState = {
  isActiveMember: false,
  isFoundingMember: false,
  founderBadge: false,
  foundingPriceStatus: null,
  foundingMemberSince: null,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  isAdmin: false,
};

export function useMemberState() {
  const { user } = useAuth();
  const [state, setState] = useState<MemberState>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setState(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    // @ts-expect-error - RPC types regenerate after migration
    const { data, error } = await supabase.rpc("get_member_state", {
      _user_id: user.id,
    });
    if (error) {
      console.error("get_member_state error", error);
      setState(EMPTY);
    } else if (data) {
      const d = data as Record<string, unknown>;
      setState({
        isActiveMember: Boolean(d.is_active_member),
        isFoundingMember: Boolean(d.is_founding_member),
        founderBadge: Boolean(d.founder_badge),
        foundingPriceStatus:
          (d.founding_price_status as MemberState["foundingPriceStatus"]) ??
          null,
        foundingMemberSince: (d.founding_member_since as string) ?? null,
        subscriptionStatus: (d.subscription_status as string) ?? null,
        currentPeriodEnd: (d.current_period_end as string) ?? null,
        isAdmin: Boolean(d.is_admin),
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, loading, refetch };
}