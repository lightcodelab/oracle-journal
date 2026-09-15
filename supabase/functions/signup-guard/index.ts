// Sign-up guard. Called by the app immediately before creating an account.
// Refuses throwaway email providers and limits how many accounts can be
// created from the same place in a short window. Never stores raw IP
// addresses - only a salted one-way hash used for counting.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { DISPOSABLE_EMAIL_DOMAINS } from "./disposable-domains.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Attempts allowed from one place per window.
const WINDOW_MINUTES = 60;
const MAX_ATTEMPTS_PER_WINDOW = 5;
const MAX_ATTEMPTS_PER_DAY = 12;

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

async function hashClient(value: string): Promise<string> {
  const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "temple";
  const bytes = new TextEncoder().encode(`${salt}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientAddress(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const first = fwd.split(",")[0]?.trim();
  return first || req.headers.get("cf-connecting-ip") || "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const deny = (reason: string, message: string) =>
    new Response(JSON.stringify({ allowed: false, reason, message }), { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      return deny("invalid_email", "Please enter a valid email address.");
    }

    const domain = email.split("@")[1] ?? "";
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const clientHash = await hashClient(clientAddress(req));
    const record = (outcome: string) =>
      admin.from("signup_attempts").insert({
        client_hash: clientHash,
        email_domain: domain,
        outcome,
      });

    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      await record("blocked_disposable");
      return deny(
        "disposable_email",
        "That email provider can't receive membership emails. Please use a personal or work email address.",
      );
    }

    const sinceWindow = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const sinceDay = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

    const [{ count: windowCount }, { count: dayCount }] = await Promise.all([
      admin
        .from("signup_attempts")
        .select("id", { count: "exact", head: true })
        .eq("client_hash", clientHash)
        .gte("created_at", sinceWindow),
      admin
        .from("signup_attempts")
        .select("id", { count: "exact", head: true })
        .eq("client_hash", clientHash)
        .gte("created_at", sinceDay),
    ]);

    if ((windowCount ?? 0) >= MAX_ATTEMPTS_PER_WINDOW || (dayCount ?? 0) >= MAX_ATTEMPTS_PER_DAY) {
      await record("blocked_rate_limit");
      return deny(
        "rate_limited",
        "Too many accounts have been created from here recently. Please try again later, or contact support if this is a mistake.",
      );
    }

    await record("allowed");
    return new Response(JSON.stringify({ allowed: true }), { headers: cors });
  } catch (_e) {
    // Never block a genuine member because the guard itself failed.
    return new Response(JSON.stringify({ allowed: true, reason: "guard_unavailable" }), {
      headers: cors,
    });
  }
});
