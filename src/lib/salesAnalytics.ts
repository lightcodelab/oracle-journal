/**
 * Lightweight event tracking for the public sales page.
 *
 * Events are pushed to `window.dataLayer` (GTM), forwarded to `gtag` when
 * present, and recorded in the app's own `launch_events` table so the admin
 * Launch Dashboard can show the funnel without a third-party provider.
 */

import { supabase } from "@/integrations/supabase/client";
import { getStoredAffiliateRef } from "@/lib/affiliateTracking";

export type SalesEvent =
  | "sales_page_view"
  | "hero_enter_temple_clicked"
  | "midpage_enter_temple_clicked"
  | "final_enter_temple_clicked"
  | "faq_opened"
  | "membership_checkout_started"
  | "membership_checkout_completed";

type EventParams = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const SESSION_KEY = "launch_session_v1";

/** Anonymous, per-browser-session id. Never tied to a person. */
function getSessionId(): string | null {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function referrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname;
    if (host && host === window.location.hostname) return null;
    return host || null;
  } catch {
    return null;
  }
}

function trim(value: string | null | undefined, max: number): string | undefined {
  if (!value) return undefined;
  return value.slice(0, max);
}

async function recordEvent(event: SalesEvent, params: EventParams) {
  try {
    const search = new URLSearchParams(window.location.search);
    await supabase.from("launch_events").insert({
      event,
      session_id: getSessionId() ?? undefined,
      path: trim(window.location.pathname, 500),
      referrer: trim(document.referrer || null, 500),
      referrer_host: trim(referrerHost(), 255),
      utm_source: trim(search.get("utm_source"), 120),
      utm_medium: trim(search.get("utm_medium"), 120),
      utm_campaign: trim(search.get("utm_campaign"), 120),
      affiliate_code: trim(getStoredAffiliateRef()?.code ?? null, 64),
      metadata: params as unknown as Record<string, never>,
    });
  } catch {
    // Analytics must never break the page.
  }
}

export function trackSalesEvent(event: SalesEvent, params: EventParams = {}) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
    window.gtag?.("event", event, params);
  } catch {
    // Analytics must never break the page.
  }
  void recordEvent(event, params);
}
