/**
 * Lightweight event tracking for the public sales page.
 *
 * Events are pushed to `window.dataLayer` (GTM) and forwarded to `gtag`
 * when either is present. When no analytics provider is loaded the calls
 * are silent no-ops, so the page never depends on a third-party script.
 */

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

export function trackSalesEvent(event: SalesEvent, params: EventParams = {}) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
    window.gtag?.("event", event, params);
  } catch {
    // Analytics must never break the page.
  }
}
