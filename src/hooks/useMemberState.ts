import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Canonical member state for the one-membership model (post Pass A).
 *
 * Reads `public.get_member_state(user)` which returns a single jsonb blob
 * combining active-membership status, founder recognition, founder-price
 * eligibility, subscription window info, AND the canonical manual-full-access
 * state ('active' | 'scheduled' | 'expired' | 'revoked_only' | 'none').
 *
 * Access precedence for gating protected content:
 *   1. admin OR active membership       → full Temple experience
 *   2. active manual full access        → full Temple experience
 *   3. scheduled manual full access     → dedicated scheduled state, no early access
 *   4. expired manual full access       → dedicated expired-with-Join state
 *   5. revoked-only history             → general no-access
 *   6. none                             → general no-access
 *   7. lookup failure                   → distinct error state; never masquerade
 *
 * IMPORTANT identity/access separation:
 *   - Manual access unlocks the full Temple experience but does NOT create
 *     membership, subscriber, Founder, billing or administrator status.
 *   - Callers should therefore prefer `hasFullTempleAccess` for GATING and
 *     the underlying flags (`isActiveMember`, `isAdmin`, `isFoundingMember`)
 *     only for IDENTITY-driven UI (badges, billing, upgrade CTAs).
 */
export type ManualFullAccessState =
  | "active"
  | "scheduled"
  | "expired"
  | "revoked_only"
  | "none";

export type EntitlementSource =
  | "admin"
  | "membership"
  | "manual"
  | "none"
  | "error";

export interface ManualFullAccess {
  state: ManualFullAccessState;
  startsAt: string | null;
  expiresAt: string | null;
}

export interface MemberState {
  isActiveMember: boolean;
  isFoundingMember: boolean;
  founderBadge: boolean;
  foundingPriceStatus: "active" | "in_grace" | "lost" | null;
  foundingMemberSince: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  isAdmin: boolean;
  manualFullAccess: ManualFullAccess;
  /** Distinct from "no access": true only when the entitlement lookup failed. */
  error: boolean;
  /** Which authority is currently unlocking full Temple content, if any. */
  entitlementSource: EntitlementSource;
  /** Shared gate for /temple, /decks, /devotion, /communion. */
  hasFullTempleAccess: boolean;
}

const EMPTY_MANUAL: ManualFullAccess = {
  state: "none",
  startsAt: null,
  expiresAt: null,
};

const EMPTY: MemberState = {
  isActiveMember: false,
  isFoundingMember: false,
  founderBadge: false,
  foundingPriceStatus: null,
  foundingMemberSince: null,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  isAdmin: false,
  manualFullAccess: EMPTY_MANUAL,
  error: false,
  entitlementSource: "none",
  hasFullTempleAccess: false,
};

function deriveEntitlement(
  isAdmin: boolean,
  isActiveMember: boolean,
  manual: ManualFullAccess,
): { source: EntitlementSource; hasFullTempleAccess: boolean } {
  if (isAdmin) return { source: "admin", hasFullTempleAccess: true };
  if (isActiveMember) return { source: "membership", hasFullTempleAccess: true };
  if (manual.state === "active")
    return { source: "manual", hasFullTempleAccess: true };
  return { source: "none", hasFullTempleAccess: false };
}

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
    const { data, error } = await supabase.rpc("get_member_state", {
      _user_id: user.id,
    });
    if (error) {
      // Fail closed: never masquerade as "no access". Callers must
      // distinguish `error === true` from a confirmed denial.
      console.error("get_member_state error", error);
      setState({ ...EMPTY, error: true, entitlementSource: "error" });
    } else if (data) {
      const d = data as Record<string, unknown>;
      const rawManual = (d.manual_full_access as Record<string, unknown> | null) ?? null;
      const manual: ManualFullAccess = {
        state: ((rawManual?.state as ManualFullAccessState | undefined) ??
          "none") as ManualFullAccessState,
        startsAt: (rawManual?.starts_at as string | null) ?? null,
        expiresAt: (rawManual?.expires_at as string | null) ?? null,
      };
      const isAdmin = Boolean(d.is_admin);
      const isActiveMember = Boolean(d.is_active_member);
      const { source, hasFullTempleAccess } = deriveEntitlement(
        isAdmin,
        isActiveMember,
        manual,
      );
      setState({
        isActiveMember,
        isFoundingMember: Boolean(d.is_founding_member),
        founderBadge: Boolean(d.founder_badge),
        foundingPriceStatus:
          (d.founding_price_status as MemberState["foundingPriceStatus"]) ??
          null,
        foundingMemberSince: (d.founding_member_since as string) ?? null,
        subscriptionStatus: (d.subscription_status as string) ?? null,
        currentPeriodEnd: (d.current_period_end as string) ?? null,
        isAdmin,
        manualFullAccess: manual,
        error: false,
        entitlementSource: source,
        hasFullTempleAccess,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, loading, refetch };
}