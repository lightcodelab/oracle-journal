// Mirror Exchange Stage 1 fixture runner.
//
// Admin-gated. Provisions marker-scoped disposable auth users, mints genuine
// per-user JWTs, runs the full Stage 1 authenticated RLS+RPC matrix using
// separate anon-key clients, and tears everything down inside a finally
// block. Modeled on phaseC-fixture-runner.
//
// Access: either
//   (a) Authorization: Bearer <admin JWT>   — user_roles.role='admin', OR
//   (b) X-Fixture-Token: <MIRROR_FIXTURE_TOKEN secret> (internal-only).
// Anonymous and ordinary authenticated callers are rejected.
//
// The runner never returns the service-role key, never logs passwords or
// access tokens, and never touches rows outside its `mirror-fx:<runId>`
// marker.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fixture-token",
  "Content-Type": "application/json",
};

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SB_SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FIXTURE_TOKEN = Deno.env.get("MIRROR_FIXTURE_TOKEN") ?? "";

function pw(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return "MfxA1!" + btoa(String.fromCharCode(...b)).replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
}

type Result = { name: string; passed: boolean; note?: string };

function makeReporter() {
  const results: Result[] = [];
  return {
    results,
    async run(name: string, fn: () => Promise<void>) {
      try {
        await fn();
        results.push({ name, passed: true });
      } catch (e) {
        results.push({ name, passed: false, note: String((e as Error)?.message ?? e).slice(0, 400) });
      }
    },
  };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function signIn(email: string, password: string): Promise<string> {
  const anon = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`signIn failed for ${email}: ${error?.message}`);
  return data.session.access_token;
}

function asUser(jwt: string): SupabaseClient {
  return createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asAnon(): SupabaseClient {
  return createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // ---- Auth gate ----
  try {
    const headerToken = req.headers.get("x-fixture-token");
    const authz = req.headers.get("Authorization");
    let authorized = false;

    if (FIXTURE_TOKEN && headerToken && headerToken === FIXTURE_TOKEN) {
      authorized = true;
    } else if (authz) {
      const admin = createClient(SB_URL, SB_SRV, { auth: { persistSession: false } });
      const caller = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: authz } } });
      const { data: { user } } = await caller.auth.getUser();
      if (user) {
        const { data: role } = await admin.from("user_roles").select("role")
          .eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (role) authorized = true;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: cors });
    }
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "auth check failed: " + String((e as Error).message) }),
      { status: 401, headers: cors });
  }

  const admin = createClient(SB_URL, SB_SRV, { auth: { persistSession: false } });
  const runId = crypto.randomUUID();
  const marker = "mirror-fx:" + runId;
  const reporter = makeReporter();
  const createdUserIds: string[] = [];
  const createdVersionIds: string[] = [];
  const iso = (d: Date) => d.toISOString();
  const now = new Date();
  const addDays = (n: number) => new Date(now.getTime() + n * 86400_000);

  // Pre-count baselines
  const beforeCounts: Record<string, number> = {};
  async function countRows(table: string, filter?: (q: any) => any) {
    let q = admin.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count } = await q;
    return count ?? 0;
  }
  for (const t of ["community_profiles","mirror_agreement_acceptances","mirror_orientation_completions",
                    "mirror_adult_attestations","mirror_participations","mirror_suspensions",
                    "mirror_blocks","manual_full_access_grants","entitlements","user_roles"]) {
    beforeCounts[t] = await countRows(t);
  }

  const fixtures: Record<string, { id: string; email: string; password: string; jwt?: string }> = {};

  async function mkUser(tag: string, meta: Record<string, unknown> = {}) {
    const email = `mirrorfx-${tag}-${runId.slice(0, 8)}@fixture.test`;
    const password = pw();
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { fixture_marker: marker, mirror_fx: tag, ...meta },
    });
    if (error || !data.user) throw new Error(`createUser ${tag}: ${error?.message}`);
    createdUserIds.push(data.user.id);
    fixtures[tag] = { id: data.user.id, email, password };
    await admin.from("profiles").upsert({ id: data.user.id, email, full_name: `MFX ${tag}` });
    return data.user.id;
  }

  const failures: Result[] = [];

  try {
    // ============ PROVISION ============
    // Identities
    await mkUser("admin");
    await mkUser("memberA");
    await mkUser("memberB");
    await mkUser("noAccess");
    await mkUser("active");
    await mkUser("grace");
    await mkUser("graceExpired");
    await mkUser("cancelScheduled");
    await mkUser("cancelExpired");
    await mkUser("manualActive");
    await mkUser("manualScheduled");
    await mkUser("manualExpired");
    await mkUser("manualRevoked");

    // Admin role
    await admin.from("user_roles").insert({ user_id: fixtures.admin.id, role: "admin" });

    // Entitlements: memberA/B/active as active
    for (const tag of ["memberA","memberB","active"]) {
      await admin.from("entitlements").insert({
        user_id: fixtures[tag].id, source: "admin", source_ref: `${marker}:${tag}`,
        product_kind: "app_membership", status: "active",
        starts_at: iso(addDays(-10)), ends_at: iso(addDays(20)),
        metadata: { fixture: marker },
      });
      await admin.from("profiles").update({
        is_active_member: true, subscription_status: "active",
        current_period_end: iso(addDays(20)),
      }).eq("id", fixtures[tag].id);
    }
    // Grace (in-grace, still active)
    await admin.from("entitlements").insert({
      user_id: fixtures.grace.id, source: "admin", source_ref: `${marker}:grace`,
      product_kind: "app_membership", status: "in_grace",
      starts_at: iso(addDays(-30)), ends_at: iso(addDays(-2)), grace_until: iso(addDays(5)),
      metadata: { fixture: marker },
    });
    await admin.from("profiles").update({ is_active_member: true, subscription_status: "in_grace",
      current_period_end: iso(addDays(-2)) }).eq("id", fixtures.grace.id);

    // Grace expired (past grace window → no access)
    await admin.from("entitlements").insert({
      user_id: fixtures.graceExpired.id, source: "admin", source_ref: `${marker}:graceExpired`,
      product_kind: "app_membership", status: "in_grace",
      starts_at: iso(addDays(-40)), ends_at: iso(addDays(-15)), grace_until: iso(addDays(-1)),
      metadata: { fixture: marker },
    });

    // Scheduled cancellation while paid period active
    await admin.from("entitlements").insert({
      user_id: fixtures.cancelScheduled.id, source: "admin", source_ref: `${marker}:cancelScheduled`,
      product_kind: "app_membership", status: "active",
      starts_at: iso(addDays(-10)), ends_at: iso(addDays(20)),
      metadata: { fixture: marker, cancel_at_period_end: true },
    });
    await admin.from("profiles").update({ is_active_member: true, subscription_status: "active",
      current_period_end: iso(addDays(20)) }).eq("id", fixtures.cancelScheduled.id);

    // Cancel expired
    await admin.from("entitlements").insert({
      user_id: fixtures.cancelExpired.id, source: "admin", source_ref: `${marker}:cancelExpired`,
      product_kind: "app_membership", status: "canceled",
      starts_at: iso(addDays(-30)), ends_at: iso(addDays(-1)),
      metadata: { fixture: marker },
    });

    // Manual grants
    await admin.from("manual_full_access_grants").insert({
      user_id: fixtures.manualActive.id, starts_at: iso(addDays(-5)),
      expires_at: iso(addDays(25)), granted_by: fixtures.admin.id, notes: marker,
    });
    await admin.from("manual_full_access_grants").insert({
      user_id: fixtures.manualScheduled.id, starts_at: iso(addDays(10)),
      expires_at: iso(addDays(40)), granted_by: fixtures.admin.id, notes: marker,
    });
    await admin.from("manual_full_access_grants").insert({
      user_id: fixtures.manualExpired.id, starts_at: iso(addDays(-30)),
      expires_at: iso(addDays(-1)), granted_by: fixtures.admin.id, notes: marker,
    });
    const { data: revokedGrant } = await admin.from("manual_full_access_grants").insert({
      user_id: fixtures.manualRevoked.id, starts_at: iso(addDays(-20)),
      expires_at: iso(addDays(20)), granted_by: fixtures.admin.id, notes: marker,
    }).select("id").single();
    if (revokedGrant) await admin.from("manual_full_access_grants").update({
      revoked_at: iso(now), revoked_by: fixtures.admin.id,
    }).eq("id", revokedGrant.id);

    // Sign every fixture in
    for (const tag of Object.keys(fixtures)) {
      fixtures[tag].jwt = await signIn(fixtures[tag].email, fixtures[tag].password);
    }
    const A = asUser(fixtures.memberA.jwt!);
    const B = asUser(fixtures.memberB.jwt!);
    const AdminC = asUser(fixtures.admin.jwt!);
    const NoAcc = asUser(fixtures.noAccess.jwt!);
    const Anon = asAnon();
    const Grace = asUser(fixtures.grace.jwt!);
    const GraceExp = asUser(fixtures.graceExpired.jwt!);
    const CancelSched = asUser(fixtures.cancelScheduled.jwt!);
    const CancelExp = asUser(fixtures.cancelExpired.jwt!);
    const MAct = asUser(fixtures.manualActive.jwt!);
    const MSched = asUser(fixtures.manualScheduled.jwt!);
    const MExp = asUser(fixtures.manualExpired.jwt!);
    const MRev = asUser(fixtures.manualRevoked.jwt!);

    // ============ CANONICAL ENTITLEMENT REGRESSION ============
    const entitlementCases: Array<[string, keyof typeof fixtures, boolean]> = [
      ["active paid", "active", true],
      ["grace valid", "grace", true],
      ["grace expired", "graceExpired", false],
      ["cancel scheduled", "cancelScheduled", true],
      ["cancel expired", "cancelExpired", false],
      ["manual active", "manualActive", true],
      ["manual scheduled", "manualScheduled", false],
      ["manual expired", "manualExpired", false],
      ["manual revoked", "manualRevoked", false],
      ["no access", "noAccess", false],
      ["admin", "admin", true],
    ];
    for (const [label, tag, expected] of entitlementCases) {
      await reporter.run(`C:${label} → has_full_temple_access=${expected}`, async () => {
        const { data, error } = await admin.rpc("has_full_temple_access", { _user_id: fixtures[tag].id });
        if (error) throw new Error(error.message);
        assert(Boolean(data) === expected, `got=${data} expected=${expected}`);
      });
    }

    // ============ PROFILE MATRIX ============
    // P01 memberA saves via RPC
    await reporter.run("P01 memberA mirror_save_profile ok", async () => {
      const { error } = await A.rpc("mirror_save_profile", {
        _display_name: "Member A", _timezone: "Australia/Melbourne",
        _languages: ["English"], _intro: "hi",
      });
      if (error) throw new Error(error.message);
    });
    // P02 no-access rejected
    await reporter.run("P02 noAccess mirror_save_profile rejected", async () => {
      const { error } = await NoAcc.rpc("mirror_save_profile", {
        _display_name: "N", _timezone: "Australia/Melbourne", _languages: ["English"],
      });
      assert(error, "expected error");
      assert(/not eligible/i.test(error!.message), `msg=${error!.message}`);
    });
    // P03 anonymous rejected
    await reporter.run("P03 anonymous mirror_save_profile rejected", async () => {
      const { error } = await Anon.rpc("mirror_save_profile", {
        _display_name: "X", _timezone: "Australia/Melbourne", _languages: ["English"],
      });
      assert(error, "expected error");
    });
    // P04 manualActive works
    await reporter.run("P04 manualActive mirror_save_profile ok", async () => {
      const { error } = await MAct.rpc("mirror_save_profile", {
        _display_name: "MA", _timezone: "Australia/Sydney", _languages: ["English"],
      });
      if (error) throw new Error(error.message);
    });
    // P05 manualScheduled rejected
    await reporter.run("P05 manualScheduled rejected", async () => {
      const { error } = await MSched.rpc("mirror_save_profile", {
        _display_name: "MS", _timezone: "Australia/Melbourne", _languages: ["English"],
      });
      assert(error, "expected error");
    });
    // P06 manualExpired rejected
    await reporter.run("P06 manualExpired rejected", async () => {
      const { error } = await MExp.rpc("mirror_save_profile", {
        _display_name: "ME", _timezone: "Australia/Melbourne", _languages: ["English"],
      });
      assert(error, "expected error");
    });
    // P07 manualRevoked rejected
    await reporter.run("P07 manualRevoked rejected", async () => {
      const { error } = await MRev.rpc("mirror_save_profile", {
        _display_name: "MR", _timezone: "Australia/Melbourne", _languages: ["English"],
      });
      assert(error, "expected error");
    });
    // P08 grace can save
    await reporter.run("P08 grace save ok", async () => {
      const { error } = await Grace.rpc("mirror_save_profile", {
        _display_name: "G", _timezone: "Australia/Melbourne", _languages: ["English"],
      });
      if (error) throw new Error(error.message);
    });
    // P09 graceExpired rejected
    await reporter.run("P09 graceExpired rejected", async () => {
      const { error } = await GraceExp.rpc("mirror_save_profile", {
        _display_name: "GE", _timezone: "Australia/Melbourne", _languages: ["English"],
      });
      assert(error, "expected error");
    });
    // P10 cancelScheduled works
    await reporter.run("P10 cancelScheduled save ok", async () => {
      const { error } = await CancelSched.rpc("mirror_save_profile", {
        _display_name: "CS", _timezone: "Australia/Melbourne", _languages: ["English"],
      });
      if (error) throw new Error(error.message);
    });
    // P11 cancelExpired rejected
    await reporter.run("P11 cancelExpired rejected", async () => {
      const { error } = await CancelExp.rpc("mirror_save_profile", {
        _display_name: "CE", _timezone: "Australia/Melbourne", _languages: ["English"],
      });
      assert(error, "expected error");
    });
    // P12 invalid timezone rejected
    await reporter.run("P12 invalid timezone rejected", async () => {
      const { error } = await A.rpc("mirror_save_profile", {
        _display_name: "A", _timezone: "Not/A_Zone", _languages: ["English"],
      });
      assert(error, "expected error");
      assert(/invalid timezone/i.test(error!.message), `msg=${error!.message}`);
    });
    // P13 blank display name rejected
    await reporter.run("P13 blank display name rejected", async () => {
      const { error } = await A.rpc("mirror_save_profile", {
        _display_name: "   ", _timezone: "Australia/Melbourne", _languages: ["English"],
      });
      assert(error, "expected error");
      assert(/display_name/i.test(error!.message), `msg=${error!.message}`);
    });
    // P14 blank language rejected
    await reporter.run("P14 blank language rejected", async () => {
      const { error } = await A.rpc("mirror_save_profile", {
        _display_name: "A", _timezone: "Australia/Melbourne", _languages: ["English", ""],
      });
      assert(error, "expected error");
    });
    // P15 too many languages rejected
    await reporter.run("P15 too many languages rejected", async () => {
      const langs = Array.from({ length: 11 }, (_, i) => `L${i}`);
      const { error } = await A.rpc("mirror_save_profile", {
        _display_name: "A", _timezone: "Australia/Melbourne", _languages: langs,
      });
      assert(error, "expected error");
    });
    // P16 oversized language rejected
    await reporter.run("P16 oversized language rejected", async () => {
      const { error } = await A.rpc("mirror_save_profile", {
        _display_name: "A", _timezone: "Australia/Melbourne", _languages: ["x".repeat(41)],
      });
      assert(error, "expected error");
    });
    // P17 direct INSERT denied
    await reporter.run("P17 direct INSERT into community_profiles denied", async () => {
      const { error } = await B.from("community_profiles").insert({
        user_id: fixtures.memberB.id, display_name: "Direct", timezone: "Australia/Melbourne",
      });
      assert(error, "expected error");
    });
    // P18 direct UPDATE denied
    await reporter.run("P18 direct UPDATE community_profiles denied", async () => {
      const { data, error } = await B.from("community_profiles")
        .update({ display_name: "hax" }).eq("user_id", fixtures.memberB.id).select();
      // Either permission error, or 0 rows because grant revoked
      if (!error) assert((data?.length ?? 0) === 0, "expected 0 affected rows");
    });
    // P19 direct DELETE denied
    await reporter.run("P19 direct DELETE community_profiles denied", async () => {
      const { data, error } = await A.from("community_profiles")
        .delete().eq("user_id", fixtures.memberA.id).select();
      if (!error) assert((data?.length ?? 0) === 0, "expected 0 affected rows");
    });
    // P20 cannot set is_visible=true through RPC (RPC forces false)
    await reporter.run("P20 RPC forces is_visible=false", async () => {
      const { data, error } = await A.from("community_profiles")
        .select("is_visible").eq("user_id", fixtures.memberA.id).maybeSingle();
      if (error) throw new Error(error.message);
      assert(data && data.is_visible === false, `is_visible=${data?.is_visible}`);
    });
    // P21 memberA reads own profile
    await reporter.run("P21 memberA reads own profile", async () => {
      const { data, error } = await A.from("community_profiles")
        .select("*").eq("user_id", fixtures.memberA.id);
      if (error) throw new Error(error.message);
      assert((data?.length ?? 0) === 1, `rows=${data?.length}`);
    });
    // P22 memberA cannot read memberB profile
    // First create memberB profile via RPC
    await B.rpc("mirror_save_profile", {
      _display_name: "Member B", _timezone: "Australia/Melbourne", _languages: ["English"],
    });
    await reporter.run("P22 memberA cannot read memberB profile", async () => {
      const { data, error } = await A.from("community_profiles")
        .select("*").eq("user_id", fixtures.memberB.id);
      if (error) return;
      assert((data?.length ?? 0) === 0, `visible=${data?.length}`);
    });
    // P23 memberB cannot read memberA profile
    await reporter.run("P23 memberB cannot read memberA profile", async () => {
      const { data } = await B.from("community_profiles")
        .select("*").eq("user_id", fixtures.memberA.id);
      assert((data?.length ?? 0) === 0, `visible=${data?.length}`);
    });
    // P24 anonymous cannot read
    await reporter.run("P24 anonymous cannot read profiles", async () => {
      const { data } = await Anon.from("community_profiles").select("*");
      assert((data?.length ?? 0) === 0, `visible=${data?.length}`);
    });
    // P25 server-owned fields preserved: user_id matches auth.uid
    await reporter.run("P25 user_id preserved to auth.uid()", async () => {
      const { data } = await A.from("community_profiles").select("user_id,created_at")
        .eq("user_id", fixtures.memberA.id).single();
      assert(data && data.user_id === fixtures.memberA.id, "user_id mismatch");
      assert(data.created_at, "created_at missing");
    });

    // ============ EVIDENCE MATRIX ============
    // E01 accept agreement
    await reporter.run("E01 memberA accept agreement", async () => {
      const { error } = await A.rpc("mirror_accept_agreement");
      if (error) throw new Error(error.message);
    });
    // E02 idempotent
    await reporter.run("E02 accept idempotent", async () => {
      await A.rpc("mirror_accept_agreement");
      await A.rpc("mirror_accept_agreement");
      const { count } = await admin.from("mirror_agreement_acceptances")
        .select("*", { count: "exact", head: true }).eq("user_id", fixtures.memberA.id);
      assert(count === 1, `count=${count}`);
    });
    // E03 direct insert denied
    await reporter.run("E03 direct evidence insert denied", async () => {
      const { data: v } = await admin.from("mirror_agreement_versions").select("id").eq("is_current", true).single();
      const { error } = await B.from("mirror_agreement_acceptances")
        .insert({ user_id: fixtures.memberA.id, version_id: v!.id });
      assert(error, "expected error");
    });
    // E04 direct update denied
    await reporter.run("E04 direct evidence update denied", async () => {
      const { data, error } = await A.from("mirror_agreement_acceptances")
        .update({ accepted_at: iso(addDays(-100)) }).eq("user_id", fixtures.memberA.id).select();
      if (!error) assert((data?.length ?? 0) === 0, "should not affect rows");
    });
    // E05 direct delete denied
    await reporter.run("E05 direct evidence delete denied", async () => {
      const { data, error } = await A.from("mirror_agreement_acceptances")
        .delete().eq("user_id", fixtures.memberA.id).select();
      if (!error) assert((data?.length ?? 0) === 0, "should not affect rows");
    });
    // E06 caller without access denied
    await reporter.run("E06 noAccess accept rejected", async () => {
      const { error } = await NoAcc.rpc("mirror_accept_agreement");
      assert(error, "expected error");
    });
    // E07 anonymous denied
    await reporter.run("E07 anonymous accept rejected", async () => {
      const { error } = await Anon.rpc("mirror_accept_agreement");
      assert(error, "expected error");
    });
    // E08 orientation + attestation
    await reporter.run("E08 memberA complete orientation", async () => {
      const { error } = await A.rpc("mirror_complete_orientation");
      if (error) throw new Error(error.message);
    });
    await reporter.run("E09 memberA record attestation", async () => {
      const { error } = await A.rpc("mirror_record_attestation");
      if (error) throw new Error(error.message);
    });
    // E10 orientation idempotent
    await reporter.run("E10 orientation idempotent", async () => {
      await A.rpc("mirror_complete_orientation");
      const { count } = await admin.from("mirror_orientation_completions")
        .select("*", { count: "exact", head: true }).eq("user_id", fixtures.memberA.id);
      assert(count === 1, `count=${count}`);
    });
    // E11 attestation idempotent
    await reporter.run("E11 attestation idempotent", async () => {
      await A.rpc("mirror_record_attestation");
      const { count } = await admin.from("mirror_adult_attestations")
        .select("*", { count: "exact", head: true }).eq("user_id", fixtures.memberA.id);
      assert(count === 1, `count=${count}`);
    });
    // E12 unique constraints exist
    await reporter.run("E12 evidence unique(user_id,version_id) enforced", async () => {
      const { data: v } = await admin.from("mirror_agreement_versions").select("id").eq("is_current", true).single();
      // Try to insert dup via service role → must fail
      const { error } = await admin.from("mirror_agreement_acceptances")
        .insert({ user_id: fixtures.memberA.id, version_id: v!.id });
      assert(error, "expected unique violation");
      assert(/duplicate|unique/i.test(error!.message), `msg=${error!.message}`);
    });
    // E13 evidence for obsolete version does not satisfy — controlled version rollover
    await reporter.run("E13 obsolete version does not satisfy requirements", async () => {
      // Insert v2 as new current
      const { data: v2 } = await admin.from("mirror_agreement_versions").insert({
        version: 9999, title: `MFX v2 ${runId.slice(0,8)}`, body: "test", is_current: false,
      }).select("id").single();
      if (!v2) throw new Error("v2 not created");
      createdVersionIds.push(v2.id);
      // Flip current: set old to false, new to true
      const { data: prevCurrent } = await admin.from("mirror_agreement_versions")
        .select("id").eq("is_current", true).single();
      await admin.from("mirror_agreement_versions").update({ is_current: false }).eq("id", prevCurrent!.id);
      await admin.from("mirror_agreement_versions").update({ is_current: true }).eq("id", v2.id);
      try {
        const { data: ready } = await AdminC.rpc("mirror_current_requirements_met", { _user_id: fixtures.memberA.id });
        // Should be false because memberA accepted old version, not v2
        // BUT mirror_current_requirements_met revoked from authenticated; call as admin service instead
        const { data: ready2 } = await admin.rpc("mirror_current_requirements_met", { _user_id: fixtures.memberA.id });
        assert(ready2 === false, `expected false, got ${ready2}`);
        // Original evidence intact
        const { count } = await admin.from("mirror_agreement_acceptances")
          .select("*", { count: "exact", head: true }).eq("user_id", fixtures.memberA.id);
        assert(count === 1, `historical rows count=${count}`);
      } finally {
        // Restore
        await admin.from("mirror_agreement_versions").update({ is_current: false }).eq("id", v2.id);
        await admin.from("mirror_agreement_versions").update({ is_current: true }).eq("id", prevCurrent!.id);
      }
    });

    // ============ PARTICIPATION / READINESS / SUSPENSION ============
    // Prep: memberB has profile but no evidence → cannot activate
    await reporter.run("R01 activate without agreement fails", async () => {
      const { error } = await B.rpc("mirror_activate_participation");
      assert(error, "expected error");
    });
    // Give B agreement only, orientation missing
    await B.rpc("mirror_accept_agreement");
    await reporter.run("R02 activate without orientation fails", async () => {
      const { error } = await B.rpc("mirror_activate_participation");
      assert(error, "expected error");
    });
    await B.rpc("mirror_complete_orientation");
    await reporter.run("R03 activate without attestation fails", async () => {
      const { error } = await B.rpc("mirror_activate_participation");
      assert(error, "expected error");
    });
    await B.rpc("mirror_record_attestation");
    await reporter.run("R04 activate with all requirements ok", async () => {
      const { error } = await B.rpc("mirror_activate_participation");
      if (error) throw new Error(error.message);
    });
    // R05 readiness only reads caller
    await reporter.run("R05 mirror_exchange_ready_self only checks caller", async () => {
      const { data: aReady } = await A.rpc("mirror_exchange_ready_self");
      const { data: bReady } = await B.rpc("mirror_exchange_ready_self");
      // A activated below; here just verify per-caller isolation via known differing state
      // At this point A hasn't activated → should be false
      // B activated → should be true
      assert(aReady === false, `A ready=${aReady}`);
      assert(bReady === true, `B ready=${bReady}`);
    });
    // R06 anonymous readiness
    await reporter.run("R06 anonymous readiness = false", async () => {
      const { data } = await Anon.rpc("mirror_exchange_ready_self");
      // Anon call likely errors or returns false
      assert(data === false || data === null, `got=${data}`);
    });
    // R07 access loss → readiness false without deleting evidence
    await reporter.run("R07 access loss revokes readiness, keeps evidence", async () => {
      // Temporarily deactivate memberB's entitlement
      await admin.from("entitlements").update({ status: "canceled", ends_at: iso(addDays(-1)) })
        .eq("source_ref", `${marker}:memberB`);
      await admin.from("profiles").update({ is_active_member: false }).eq("id", fixtures.memberB.id);
      try {
        const { data } = await B.rpc("mirror_exchange_ready_self");
        assert(data === false, `ready=${data}`);
        const { count } = await admin.from("mirror_agreement_acceptances")
          .select("*", { count: "exact", head: true }).eq("user_id", fixtures.memberB.id);
        assert(count === 1, `evidence gone: ${count}`);
      } finally {
        await admin.from("entitlements").update({ status: "active", ends_at: iso(addDays(20)) })
          .eq("source_ref", `${marker}:memberB`);
        await admin.from("profiles").update({ is_active_member: true }).eq("id", fixtures.memberB.id);
      }
    });
    // R08 non-admin cannot suspend
    await reporter.run("R08 non-admin suspend rejected", async () => {
      const { error } = await A.rpc("mirror_admin_suspend", { _user_id: fixtures.memberB.id, _reason: "x" });
      assert(error, "expected error");
    });
    // R09 anonymous cannot suspend
    await reporter.run("R09 anonymous suspend rejected", async () => {
      const { error } = await Anon.rpc("mirror_admin_suspend", { _user_id: fixtures.memberB.id, _reason: "x" });
      assert(error, "expected error");
    });
    // R10 admin can suspend
    await reporter.run("R10 admin can suspend", async () => {
      const { error } = await AdminC.rpc("mirror_admin_suspend",
        { _user_id: fixtures.memberB.id, _reason: "test" });
      if (error) throw new Error(error.message);
    });
    // R11 suspended member cannot activate/be ready
    await reporter.run("R11 suspended member cannot be ready", async () => {
      const { data } = await B.rpc("mirror_exchange_ready_self");
      assert(data === false, `ready=${data}`);
    });
    // R12 member cannot lift own suspension
    await reporter.run("R12 member cannot lift own suspension", async () => {
      const { error } = await B.rpc("mirror_admin_lift_suspension", { _user_id: fixtures.memberB.id });
      assert(error, "expected error");
    });
    // R13 admin can lift
    await reporter.run("R13 admin can lift suspension", async () => {
      const { error } = await AdminC.rpc("mirror_admin_lift_suspension", { _user_id: fixtures.memberB.id });
      if (error) throw new Error(error.message);
    });
    // R14 withdraw preserves evidence + suspension unchanged
    await reporter.run("R14 withdraw preserves evidence", async () => {
      const beforeEv = await admin.from("mirror_agreement_acceptances")
        .select("*", { count: "exact", head: true }).eq("user_id", fixtures.memberB.id);
      const { error } = await B.rpc("mirror_withdraw_participation");
      if (error) throw new Error(error.message);
      const afterEv = await admin.from("mirror_agreement_acceptances")
        .select("*", { count: "exact", head: true }).eq("user_id", fixtures.memberB.id);
      assert(beforeEv.count === afterEv.count, `ev before=${beforeEv.count} after=${afterEv.count}`);
      const { data: p } = await admin.from("community_profiles").select("is_visible")
        .eq("user_id", fixtures.memberB.id).single();
      assert(p!.is_visible === false, `is_visible=${p!.is_visible}`);
    });

    // ============ BLOCK ISOLATION ============
    // B01 self-block rejected
    await reporter.run("B01 self-block rejected", async () => {
      const { error } = await A.from("mirror_blocks").insert({
        blocker_id: fixtures.memberA.id, blocked_id: fixtures.memberA.id,
      });
      assert(error, "expected error");
    });
    // B02 A blocks B
    await reporter.run("B02 memberA creates block", async () => {
      const { error } = await A.from("mirror_blocks").insert({
        blocker_id: fixtures.memberA.id, blocked_id: fixtures.memberB.id,
      });
      if (error) throw new Error(error.message);
    });
    // B03 B cannot see A's block records
    await reporter.run("B03 memberB cannot query A's blocks", async () => {
      const { data } = await B.from("mirror_blocks").select("*")
        .eq("blocker_id", fixtures.memberA.id);
      assert((data?.length ?? 0) === 0, `visible=${data?.length}`);
    });
    // B04 B cannot delete A's block
    await reporter.run("B04 memberB cannot delete A's block", async () => {
      const { data, error } = await B.from("mirror_blocks")
        .delete().eq("blocker_id", fixtures.memberA.id).select();
      if (!error) assert((data?.length ?? 0) === 0, "should be 0");
    });
    // B05 anonymous cannot access blocks
    await reporter.run("B05 anonymous cannot access blocks", async () => {
      const { data } = await Anon.from("mirror_blocks").select("*");
      assert((data?.length ?? 0) === 0, `visible=${data?.length}`);
    });
    // B06 ordinary user cannot execute helper
    await reporter.run("B06 authenticated cannot exec _mirror_blocks_bidirectional", async () => {
      const { error } = await A.rpc("_mirror_blocks_bidirectional", { _a: fixtures.memberA.id, _b: fixtures.memberB.id });
      assert(error, "expected error");
    });
    // B07 internal evaluation (via admin service role) sees the block bidirectionally
    await reporter.run("B07 internal helper sees block bidirectionally", async () => {
      const { data: d1 } = await admin.rpc("_mirror_blocks_bidirectional",
        { _a: fixtures.memberA.id, _b: fixtures.memberB.id });
      const { data: d2 } = await admin.rpc("_mirror_blocks_bidirectional",
        { _a: fixtures.memberB.id, _b: fixtures.memberA.id });
      assert(d1 === true, `d1=${d1}`);
      assert(d2 === true, `d2=${d2}`);
    });
    // B08 A can delete own block
    await reporter.run("B08 memberA deletes own block", async () => {
      const { data, error } = await A.from("mirror_blocks")
        .delete().eq("blocker_id", fixtures.memberA.id).eq("blocked_id", fixtures.memberB.id).select();
      if (error) throw new Error(error.message);
      assert((data?.length ?? 0) === 1, `deleted=${data?.length}`);
    });

    // ============ STRUCTURAL HARNESS ============
    await reporter.run("S01 _mirror_exchange_run_tests (admin)", async () => {
      const { data, error } = await AdminC.rpc("_mirror_exchange_run_tests");
      if (error) throw new Error(error.message);
      const rows = (data as Array<{ passed: boolean; name: string; detail?: string }>) ?? [];
      const failed = rows.filter((r) => !r.passed);
      if (failed.length) throw new Error(`${failed.length} structural fails: ` +
        failed.map((f) => `${f.name}:${f.detail}`).join("; "));
      (globalThis as any).__structural = { total: rows.length, passed: rows.length - failed.length };
    });

    // Collect any collected failures
    for (const r of reporter.results) if (!r.passed) failures.push(r);
  } catch (bootErr) {
    reporter.results.push({ name: "PROVISION/RUN", passed: false, note: String((bootErr as Error)?.message ?? bootErr) });
  } finally {
    // ============ TEARDOWN ============
    const teardown: Record<string, unknown> = {};
    try {
      // Any temporary versions created must be removed
      for (const vid of createdVersionIds) {
        await admin.from("mirror_agreement_versions").delete().eq("id", vid);
      }
      // Cascade from auth.users removes profiles, entitlements, grants, etc via FK
      let removed = 0;
      for (const uid of createdUserIds) {
        const { error } = await admin.auth.admin.deleteUser(uid);
        if (!error) removed++;
      }
      teardown.users_removed = removed;

      // Belt-and-braces: any lingering marker-scoped rows
      const cleanTables = ["manual_full_access_grants", "entitlements"];
      for (const t of cleanTables) {
        if (t === "entitlements") {
          await admin.from(t).delete().like("source_ref", `${marker}%`);
        } else {
          await admin.from(t).delete().eq("notes", marker);
        }
      }

      // Residue counts vs before
      const afterCounts: Record<string, number> = {};
      for (const t of Object.keys(beforeCounts)) {
        afterCounts[t] = await countRows(t);
      }
      teardown.before_counts = beforeCounts;
      teardown.after_counts = afterCounts;
      // Verify no fixture users remain with our marker
      const { data: leftover } = await admin.auth.admin.listUsers({ perPage: 200 });
      const stragglers = (leftover?.users ?? []).filter(
        (u) => String(u.user_metadata?.fixture_marker ?? "").startsWith("mirror-fx:"),
      ).map((u) => u.id);
      teardown.leftover_fixture_users = stragglers;
    } catch (tdErr) {
      teardown.error = String((tdErr as Error)?.message ?? tdErr);
    }

    const total = reporter.results.length;
    const passed = reporter.results.filter((r) => r.passed).length;
    return new Response(JSON.stringify({
      ok: failures.length === 0,
      run_id: runId,
      marker,
      totals: { total, passed, failed: total - passed },
      results: reporter.results,
      teardown,
    }, null, 2), { headers: cors });
  }
});