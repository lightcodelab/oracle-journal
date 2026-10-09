import { supabase } from "@/integrations/supabase/client";

// Privacy-first analytics: no IP address, no precise location.
// "Where in the world" comes from the browser's time zone and language region.

const SESSION_KEY = "temple_analytics_session";
const SESSION_IDLE_MS = 30 * 60 * 1000;

function getSessionId(): string {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const now = Date.now();
    if (raw) {
      const parsed = JSON.parse(raw) as { id: string; t: number };
      if (now - parsed.t < SESSION_IDLE_MS) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ id: parsed.id, t: now }));
        return parsed.id;
      }
    }
    const id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, t: now }));
    return id;
  } catch {
    return "no-storage";
  }
}

function deviceInfo() {
  const ua = navigator.userAgent;
  const device = /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    ? "Tablet"
    : /Mobi|Android|iPhone/i.test(ua) ? "Mobile" : "Desktop";
  const os = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux" : "Other";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari" : "Other";
  return { device, os, browser };
}

function regionName(): string | null {
  try {
    const code = navigator.language.split("-")[1];
    if (!code) return null;
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return null;
  }
}

export function doorForPath(path: string): string | null {
  if (path.startsWith("/devotion") || path.startsWith("/rituals")) return "Devotion";
  if (path.startsWith("/remembrance") || path.startsWith("/sacred-spreads") || path.startsWith("/readings")) return "Remembrance";
  if (path.startsWith("/becoming") || path.startsWith("/tracking")) return "Becoming";
  if (path.startsWith("/communion") || path.includes("live-session") || path.startsWith("/mirror")) return "Communion";
  return null;
}

let prevPath: string | null = null;

async function send(row: Record<string, unknown>) {
  try {
    const { data } = await supabase.auth.getSession();
    const now = new Date();
    const { device, os, browser } = deviceInfo();
    await supabase.from("site_analytics_events").insert({
      user_id: data.session?.user.id ?? null,
      session_id: getSessionId(),
      device_type: device,
      os,
      browser,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
      region: regionName(),
      local_hour: now.getHours(),
      local_dow: now.getDay(),
      ...row,
    } as never);
  } catch {
    // analytics must never break the site
  }
}

export function trackPageView(path: string) {
  if (path.startsWith("/admin")) return; // keep admin work out of member stats
  const from = prevPath;
  prevPath = path;
  // wait for the page to render so we can label it with its heading
  window.setTimeout(() => {
    const h1 = document.querySelector("main h1, h1")?.textContent?.trim();
    const title = (h1 || document.title || "").slice(0, 280);
    void send({ event_type: "page_view", path: path.slice(0, 490), prev_path: from?.slice(0, 490) ?? null, page_title: title || null, door: doorForPath(path) });
  }, 1500);
}

export function trackSearch(query: string, resultsCount: number) {
  const q = query.trim().slice(0, 190);
  if (!q) return;
  void send({ event_type: "search", path: "/search", search_query: q, results_count: resultsCount });
}
