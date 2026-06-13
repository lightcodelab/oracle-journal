import { supabase } from "@/integrations/supabase/client";

const KEY = "affiliate_ref_v1";
const DEFAULT_WINDOW_DAYS = 60;

export interface StoredAffiliateRef {
  code: string;
  linkCode?: string | null;
  commissionModel: "one_time" | "recurring";
  capturedAt: number; // epoch ms
}

export function captureAffiliateRef(ref: StoredAffiliateRef) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ref));
  } catch (e) {
    console.warn("Failed to store affiliate ref", e);
  }
}

export function getStoredAffiliateRef(): StoredAffiliateRef | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAffiliateRef;
    const ageDays = (Date.now() - parsed.capturedAt) / 86400000;
    if (ageDays > DEFAULT_WINDOW_DAYS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearAffiliateRef() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/**
 * Captures ?ref=CODE (or ?aff=CODE) from the current URL into localStorage.
 * Safe to call on every app load.
 */
export async function captureRefFromQueryString() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("ref") || params.get("aff");
  if (!code) return;

  try {
    const { data, error } = await supabase.rpc("track_affiliate_click", { _code: code });
    if (error || !data || !Array.isArray(data) || data.length === 0) return;
    const row = data[0] as any;
    captureAffiliateRef({
      code: row.referral_code ?? code,
      linkCode: code !== row.referral_code ? code : null,
      commissionModel: (row.commission_model as "one_time" | "recurring") || "recurring",
      capturedAt: Date.now(),
    });
  } catch (e) {
    console.warn("Affiliate ref capture failed", e);
  }
}