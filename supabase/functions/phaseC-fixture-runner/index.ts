// Temporary Pass C fixture runner.
// Deployed for Phase 4e-ii / Pass C verification only. Provisions disposable
// synthetic auth users with fixture_marker = 'phaseC:<uuid>' and returns
// their credentials for use by the Playwright matrix. All rows created here
// are removable via the teardown action, which cascades from auth.users.
//
// SECURITY:
//  * Verify-jwt is enforced in code (bearer must be admin).
//  * Uses service role only after admin check.
//  * Never touches real customer state: only rows whose user_metadata contains
//    fixture_marker starting with 'phaseC:' are created, listed or removed.
//  * All manual grants inserted here are annotated notes='phaseC-fixture'.
//  * Entitlements are inserted with source='admin', source_ref='phaseC:<uuid>'.
//  * stripe_environment is left NULL and no subscription rows are written.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const MARKER_PREFIX = "phaseC:";

type StateCode =
  | "admin"
  | "active_member"
  | "founding_member"
  | "grace"
  | "canceled"
  | "manual_active"
  | "manual_scheduled"
  | "manual_expired"
  | "manual_revoked_only"
  | "no_access";

const STATES: StateCode[] = [
  "admin",
  "active_member",
  "founding_member",
  "grace",
  "canceled",
  "manual_active",
  "manual_scheduled",
  "manual_expired",
  "manual_revoked_only",
  "no_access",
];

function pw(): string {
  // strong random password: 24 chars mixed
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return "Ph4seC!" + btoa(String.fromCharCode(...b)).replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("no auth");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const asCaller = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: caller } } = await asCaller.auth.getUser();
    if (!caller) throw new Error("not authenticated");
    const { data: role } = await admin
      .from("user_roles").select("role")
      .eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("admin only");

    const body = await req.json().catch(() => ({}));
    const action = body.action as "provision" | "teardown" | "list";
    const runId = (body.run_id as string) || crypto.randomUUID();
    const marker = MARKER_PREFIX + runId;

    if (action === "list") {
      const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
      const rows = (data?.users ?? [])
        .filter((u) => String(u.user_metadata?.fixture_marker ?? "").startsWith(MARKER_PREFIX))
        .map((u) => ({
          id: u.id, email: u.email,
          marker: u.user_metadata?.fixture_marker,
          state: u.user_metadata?.phaseC_state,
        }));
      return new Response(JSON.stringify({ ok: true, fixtures: rows }), { headers: cors });
    }

    if (action === "teardown") {
      const targetMarker = (body.marker as string) || null; // null = all phaseC:*
      const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
      const victims = (data?.users ?? []).filter((u) => {
        const m = String(u.user_metadata?.fixture_marker ?? "");
        if (!m.startsWith(MARKER_PREFIX)) return false;
        return targetMarker ? m === targetMarker : true;
      });
      const removed: string[] = [];
      for (const u of victims) {
        // ON DELETE CASCADE from auth.users removes profiles, entitlements,
        // manual_full_access_grants (via user_id FK) and audit rows.
        await admin.auth.admin.deleteUser(u.id);
        removed.push(u.id);
      }
      // Belt & braces: nuke any dangling rows tagged with our marker.
      await admin.from("entitlements").delete()
        .like("source_ref", `${MARKER_PREFIX}%`).eq("source", "admin");
      return new Response(JSON.stringify({ ok: true, removed_count: removed.length, removed }), { headers: cors });
    }

    if (action !== "provision") throw new Error("unknown action");

    // ---- provision ----
    const now = new Date();
    const iso = (d: Date) => d.toISOString();
    const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);
    const foundingStart = "2026-09-14T00:00:00Z";
    const foundingEnd = "2026-12-13T23:59:59Z";

    const fixtures: any[] = [];

    async function make(state: StateCode) {
      const email = `phasec-${state.replace(/_/g, "-")}-${runId.slice(0, 8)}@fixture.test`;
      const password = pw();
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: {
          fixture_marker: marker,
          phaseC_state: state,
          full_name: `PhaseC ${state}`,
        },
      });
      if (error || !created.user) throw new Error(`create ${state}: ${error?.message}`);
      const uid = created.user.id;

      // Ensure profile exists (trigger should have created it)
      await admin.from("profiles").upsert({ id: uid, email, full_name: `PhaseC ${state}` });

      if (state === "admin") {
        await admin.from("user_roles").insert({ user_id: uid, role: "admin" });
      }
      if (state === "active_member" || state === "founding_member" || state === "grace" || state === "canceled") {
        const status = state === "grace" ? "in_grace" :
                       state === "canceled" ? "canceled" : "active";
        const starts = state === "founding_member" ? foundingStart : iso(addDays(now, -10));
        const ends = state === "canceled" ? iso(addDays(now, -1)) : iso(addDays(now, 20));
        const grace = state === "grace" ? iso(addDays(now, 5)) : null;
        await admin.from("entitlements").insert({
          user_id: uid, source: "admin", source_ref: `${marker}:${state}`,
          product_kind: "app_membership", status,
          starts_at: starts, ends_at: ends, grace_until: grace,
          metadata: { fixture: true, phaseC_state: state },
        });
        await admin.from("profiles").update({
          is_active_member: state !== "canceled",
          subscription_status: status,
          current_period_end: ends,
          active_member_since: state === "founding_member" ? foundingStart : starts,
        }).eq("id", uid);
      }
      if (state === "manual_active") {
        await admin.from("manual_full_access_grants").insert({
          user_id: uid, starts_at: iso(addDays(now, -5)), expires_at: iso(addDays(now, 25)),
          granted_by: caller.id, notes: "phaseC-fixture",
        });
      }
      if (state === "manual_scheduled") {
        await admin.from("manual_full_access_grants").insert({
          user_id: uid, starts_at: iso(addDays(now, 10)), expires_at: iso(addDays(now, 40)),
          granted_by: caller.id, notes: "phaseC-fixture",
        });
      }
      if (state === "manual_expired") {
        await admin.from("manual_full_access_grants").insert({
          user_id: uid, starts_at: iso(addDays(now, -30)), expires_at: iso(addDays(now, -1)),
          granted_by: caller.id, notes: "phaseC-fixture",
        });
      }
      if (state === "manual_revoked_only") {
        const { data: g } = await admin.from("manual_full_access_grants").insert({
          user_id: uid, starts_at: iso(addDays(now, -20)), expires_at: iso(addDays(now, 20)),
          granted_by: caller.id, notes: "phaseC-fixture",
        }).select("id").single();
        if (g) await admin.from("manual_full_access_grants").update({
          revoked_at: iso(now),
        }).eq("id", g.id);
      }

      fixtures.push({ state, user_id: uid, email, password });
    }

    for (const s of STATES) {
      try { await make(s); } catch (e) { fixtures.push({ state: s, error: String(e) }); }
    }

    return new Response(JSON.stringify({ ok: true, marker, run_id: runId, fixtures }), { headers: cors });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message ?? err) }),
      { status: 400, headers: cors });
  }
});