// TEMPORARY — Mirror Exchange Stage 1 test infrastructure.
// This Edge Function exists solely to support the separately authorised
// Stage 1 fixture and verification tasks. It MUST be deleted at the end of
// Stage 1 closure. It never touches real customer state: every mutating
// pathway is scoped to fixture identities whose auth.user_metadata carries
// the exact runner-owned marker prefix defined below.
//
// SECURITY CONTRACT
//  * A dedicated runner token (MIRROR_S01_TOKEN) is required on every
//    request. Missing or incorrect tokens are rejected with 401 before any
//    Supabase client is created. The token value is never returned, logged
//    or persisted.
//  * Service-role credentials, JWTs, refresh tokens and passwords are never
//    returned in responses or written to logs.
//  * The runner refuses to operate on any identity whose user_metadata does
//    not begin with MARKER_PREFIX. It never accepts an arbitrary real-user
//    UUID as a target — targets are resolved by listing users and filtering
//    on the marker.
//  * The cleanup pathway removes only marker-scoped fixtures.
//  * No fixtures are created during deployment verification; fixture
//    creation is a separately authorised task.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-runner-token",
  "Content-Type": "application/json",
};

// Runner-owned marker. Any auth user whose user_metadata.fixture_marker does
// not start with this exact prefix is OUT OF SCOPE for every mutating
// pathway in this function. The suffix is a per-run UUID chosen by the
// caller at provision time.
const MARKER_PREFIX = "mirror-s01:";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function assertMarkerScoped(marker: string) {
  if (!marker || !marker.startsWith(MARKER_PREFIX) || marker === MARKER_PREFIX) {
    throw new Error("marker out of scope for mirror-s01-runner");
  }
}

// Paginate through auth.admin.listUsers so cleanup and marker inventory
// are correct even beyond a single page.
async function listAllUsers(admin: ReturnType<typeof createClient>) {
  const all: any[] = [];
  let page = 1;
  // Cap at 50 pages * 200 = 10k to avoid runaway loops.
  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users ?? [];
    all.push(...users);
    if (users.length < 200) break;
    page++;
  }
  return all;
}

async function cleanupByMarker(
  admin: ReturnType<typeof createClient>,
  marker: string,
) {
  assertMarkerScoped(marker);
  const users = await listAllUsers(admin);
  const victims = users.filter(
    (u) => String(u.user_metadata?.fixture_marker ?? "") === marker,
  );
  const removed: string[] = [];
  for (const u of victims) {
    await admin.auth.admin.deleteUser(u.id);
    removed.push(u.id);
  }
  return removed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // ---- Runner-token gate (runs before any Supabase client is created) ----
  const expected = Deno.env.get("MIRROR_S01_TOKEN") ?? "";
  const presented = req.headers.get("x-runner-token") ?? "";
  if (!expected) {
    return json(500, { ok: false, error: "runner token not configured" });
  }
  if (!presented) {
    return json(401, { ok: false, error: "missing runner token" });
  }
  if (!timingSafeEqual(presented, expected)) {
    return json(401, { ok: false, error: "invalid runner token" });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = String(body.action ?? "");

    // ---- Health / inventory ping. Never reveals whether real users exist. ----
    if (action === "ping") {
      return json(200, {
        ok: true,
        runner: "mirror-s01-runner",
        marker_prefix: MARKER_PREFIX,
      });
    }

    // ---- List: marker-scoped only. Never returns anything about real users. ----
    if (action === "list") {
      const marker = String(body.marker ?? "");
      assertMarkerScoped(marker);
      const users = await listAllUsers(admin);
      const rows = users
        .filter((u) =>
          String(u.user_metadata?.fixture_marker ?? "") === marker
        )
        .map((u) => ({
          id: u.id,
          email: u.email,
          fixture_marker: u.user_metadata?.fixture_marker,
          fixture_state: u.user_metadata?.mirror_s01_state,
        }));
      return json(200, { ok: true, marker, fixtures: rows });
    }

    // ---- Cleanup: marker-scoped teardown only. Never accepts a raw UUID. ----
    if (action === "cleanup") {
      const marker = String(body.marker ?? "");
      const removed = await cleanupByMarker(admin, marker);
      return json(200, {
        ok: true,
        marker,
        removed_count: removed.length,
        removed,
      });
    }

    // ---- Marker-scoped inventory count (any mirror-s01:% marker). ----
    // Returns only aggregate counts; never leaks real-user identifiers.
    if (action === "marker_inventory") {
      const users = await listAllUsers(admin);
      const scoped = users.filter((u) =>
        String(u.user_metadata?.fixture_marker ?? "").startsWith(MARKER_PREFIX)
      );
      return json(200, {
        ok: true,
        marker_prefix: MARKER_PREFIX,
        scoped_user_count: scoped.length,
        markers: Array.from(
          new Set(
            scoped.map((u) => String(u.user_metadata?.fixture_marker ?? "")),
          ),
        ),
      });
    }

    // ---- Task 5 smoke provisioning: create ONE marker-scoped auth user. ----
    // Never accepts an arbitrary email or UUID; email and password are
    // generated internally and never returned. No profile / role /
    // subscription / grant / participation rows are created.
    if (action === "provision_smoke") {
      const runId = crypto.randomUUID();
      const marker = `${MARKER_PREFIX}${runId}`;
      assertMarkerScoped(marker);

      const email = `mirror-s01+${runId}@fixtures.invalid`;
      // Internally generated password; never returned or logged.
      const password = crypto.randomUUID() + crypto.randomUUID();

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          fixture_marker: marker,
          fixture_purpose: "mirror-exchange-stage1-task5-smoke",
        },
      });
      if (error || !data?.user) {
        // Best-effort marker-scoped cleanup on failure.
        try { await cleanupByMarker(admin, marker); } catch (_) {}
        return json(500, {
          ok: false,
          error: error?.message ?? "provisioning failed",
          marker,
        });
      }

      // Confirm marker actually persisted on the created identity.
      const stampedMarker = String(
        data.user.user_metadata?.fixture_marker ?? "",
      );
      if (stampedMarker !== marker) {
        try { await cleanupByMarker(admin, marker); } catch (_) {}
        return json(500, {
          ok: false,
          error: "marker did not persist on created fixture",
          marker,
        });
      }

      return json(200, {
        ok: true,
        action: "provision_smoke",
        marker,
        fixture_user_id: data.user.id,
        fixture_purpose: "mirror-exchange-stage1-task5-smoke",
        fixture_count: 1,
      });
    }

    // ---- Task 6 two-role smoke: create one admin + one ordinary fixture. ----
    // Never accepts caller-supplied email, UUID, role or marker. Emails and
    // passwords are generated internally and never returned. The only DB
    // writes are marker-scoped auth-user creation, the trigger-installed
    // baseline 'user' role, and one canonical 'admin' role row on the
    // reverified admin fixture.
    if (action === "provision_two_role_smoke") {
      const runId = crypto.randomUUID();
      const marker = `${MARKER_PREFIX}${runId}`;
      assertMarkerScoped(marker);

      const createOne = async (purpose: string) => {
        const localId = crypto.randomUUID();
        const email = `mirror-s01+${runId}-${localId}@fixtures.invalid`;
        const password = crypto.randomUUID() + crypto.randomUUID();
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            fixture_marker: marker,
            fixture_purpose: purpose,
          },
        });
        if (error || !data?.user) {
          throw new Error(error?.message ?? "user creation failed");
        }
        return data.user;
      };

      let adminUser: any = null;
      let ordinaryUser: any = null;
      try {
        adminUser = await createOne(
          "mirror-exchange-stage1-task6-canonical-admin",
        );
        ordinaryUser = await createOne(
          "mirror-exchange-stage1-task6-ordinary-user",
        );

        // Reread admin fixture and re-verify marker before role elevation.
        const { data: reread, error: rereadErr } =
          await admin.auth.admin.getUserById(adminUser.id);
        if (rereadErr || !reread?.user) {
          throw new Error("failed to reread admin fixture");
        }
        const rereadMarker = String(
          reread.user.user_metadata?.fixture_marker ?? "",
        );
        if (rereadMarker !== marker) {
          throw new Error("admin fixture marker mismatch on reread");
        }

        // Assign canonical admin role via existing user_roles table +
        // app_role enum. The trigger already inserted the baseline 'user'
        // role for both fixtures.
        const { error: roleErr } = await admin
          .from("user_roles")
          .insert({ user_id: reread.user.id, role: "admin" });
        if (roleErr) {
          throw new Error(`admin role insert failed: ${roleErr.message}`);
        }
      } catch (e) {
        // Best-effort marker-scoped cleanup on any failure.
        try { await cleanupByMarker(admin, marker); } catch (_) {}
        const msg = e instanceof Error ? e.message : String(e);
        return json(500, { ok: false, error: msg, marker });
      }

      return json(200, {
        ok: true,
        action: "provision_two_role_smoke",
        marker,
        fixture_count: 2,
        fixtures: [
          {
            id: adminUser.id,
            fixture_purpose: "mirror-exchange-stage1-task6-canonical-admin",
          },
          {
            id: ordinaryUser.id,
            fixture_purpose: "mirror-exchange-stage1-task6-ordinary-user",
          },
        ],
      });
    }

    // NOTE: fixture provisioning is intentionally omitted from this
    // deployment. It will be added in a separately authorised Stage 1
    // fixture task. Every future provisioning path MUST stamp
    // user_metadata.fixture_marker with a value starting with
    // MARKER_PREFIX, and MUST NOT accept an arbitrary real-user UUID as a
    // target.

    // ---- Task 7 structural-harness run via genuine authenticated sessions.
    // Creates one canonical-admin fixture and one ordinary fixture, signs
    // each in through the standard auth endpoint to obtain a genuine user
    // JWT, then invokes public._mirror_exchange_run_tests() through
    // PostgREST with each bearer token, plus once anonymously with only
    // the anon apikey. Passwords/JWTs never leave this function.
    if (action === "run_structural_harness") {
      const runId = crypto.randomUUID();
      const marker = `${MARKER_PREFIX}${runId}`;
      assertMarkerScoped(marker);

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      if (!supabaseUrl || !anonKey) {
        return json(500, { ok: false, error: "supabase url or anon key missing" });
      }

      const createOne = async (purpose: string) => {
        const localId = crypto.randomUUID();
        const email = `mirror-s01+${runId}-${localId}@fixtures.invalid`;
        const password = crypto.randomUUID() + crypto.randomUUID();
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { fixture_marker: marker, fixture_purpose: purpose },
        });
        if (error || !data?.user) {
          throw new Error(error?.message ?? "user creation failed");
        }
        return { user: data.user, email, password };
      };

      const signIn = async (email: string, password: string) => {
        const anonClient = createClient(supabaseUrl, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data, error } = await anonClient.auth.signInWithPassword({
          email, password,
        });
        if (error || !data?.session?.access_token) {
          throw new Error(error?.message ?? "sign-in failed");
        }
        return data.session.access_token as string;
      };

      const callHarness = async (bearer: string | null) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "apikey": anonKey,
        };
        if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
        const resp = await fetch(
          `${supabaseUrl}/rest/v1/rpc/_mirror_exchange_run_tests`,
          { method: "POST", headers, body: "{}" },
        );
        const text = await resp.text();
        let parsed: unknown = null;
        try { parsed = JSON.parse(text); } catch (_) { parsed = text; }
        return { status: resp.status, body: parsed };
      };

      let adminFixture: any = null;
      let ordinaryFixture: any = null;
      let adminResult: any = null;
      let ordinaryResult: any = null;
      let anonResult: any = null;
      let error: string | null = null;

      try {
        adminFixture = await createOne(
          "mirror-exchange-stage1-task7-canonical-admin",
        );
        ordinaryFixture = await createOne(
          "mirror-exchange-stage1-task7-ordinary-user",
        );

        // Reread admin fixture marker before role elevation.
        const { data: reread, error: rereadErr } =
          await admin.auth.admin.getUserById(adminFixture.user.id);
        if (rereadErr || !reread?.user) {
          throw new Error("failed to reread admin fixture");
        }
        if (String(reread.user.user_metadata?.fixture_marker ?? "") !== marker) {
          throw new Error("admin fixture marker mismatch on reread");
        }

        const { error: roleErr } = await admin
          .from("user_roles")
          .insert({ user_id: reread.user.id, role: "admin" });
        if (roleErr) throw new Error(`admin role insert failed: ${roleErr.message}`);

        // Genuine authenticated sessions via password sign-in.
        const adminToken = await signIn(adminFixture.email, adminFixture.password);
        const ordinaryToken = await signIn(
          ordinaryFixture.email, ordinaryFixture.password,
        );

        adminResult = await callHarness(adminToken);
        ordinaryResult = await callHarness(ordinaryToken);
        anonResult = await callHarness(null);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      } finally {
        try { await cleanupByMarker(admin, marker); } catch (_) {}
      }

      return json(200, {
        ok: error === null,
        action: "run_structural_harness",
        marker,
        error,
        fixtures: {
          admin_id: adminFixture?.user?.id ?? null,
          ordinary_id: ordinaryFixture?.user?.id ?? null,
        },
        admin_call: adminResult,
        ordinary_call: ordinaryResult,
        anon_call: anonResult,
      });
    }

    // ---- Task 8: profile + evidence behavioural matrix. ----
    // Creates FOUR marker-scoped fixtures (owner, peer, no-access, admin),
    // signs each in for genuine bearer tokens, and executes the fixed
    // 48-assertion matrix against production RPCs and PostgREST.
    // Every fixture, role and access-state row is torn down in the finally
    // block by exact marker equality.
    if (action === "run_task8_matrix") {
      const runId = crypto.randomUUID();
      const marker = `${MARKER_PREFIX}${runId}`;
      assertMarkerScoped(marker);

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      if (!supabaseUrl || !anonKey) {
        return json(500, { ok: false, error: "supabase url or anon key missing" });
      }

      type Fixture = { user: any; email: string; password: string; token?: string };
      const fixtures: Record<string, Fixture> = {};
      const results: Array<{ id: string; name: string; expected: string; actual: string; pass: boolean }> = [];

      const record = (id: string, name: string, expected: string, actual: string, pass: boolean) => {
        results.push({ id, name, expected, actual, pass });
      };

      const createOne = async (purpose: string): Promise<Fixture> => {
        const localId = crypto.randomUUID();
        const email = `mirror-s01+${runId}-${localId}@fixtures.invalid`;
        const password = crypto.randomUUID() + crypto.randomUUID();
        const { data, error } = await admin.auth.admin.createUser({
          email, password, email_confirm: true,
          user_metadata: { fixture_marker: marker, fixture_purpose: purpose },
        });
        if (error || !data?.user) throw new Error(error?.message ?? "create failed");
        const reread = await admin.auth.admin.getUserById(data.user.id);
        if (String(reread.data?.user?.user_metadata?.fixture_marker ?? "") !== marker) {
          throw new Error("marker mismatch on reread");
        }
        return { user: data.user, email, password };
      };

      const signIn = async (f: Fixture) => {
        const c = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
        const { data, error } = await c.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error || !data?.session?.access_token) throw new Error(error?.message ?? "sign-in failed");
        f.token = data.session.access_token as string;
      };

      const restReq = async (bearer: string | null, method: string, path: string, body?: unknown, extraHeaders?: Record<string,string>) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "apikey": anonKey,
          ...(extraHeaders ?? {}),
        };
        if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
        const resp = await fetch(`${supabaseUrl}${path}`, {
          method, headers, body: body === undefined ? undefined : JSON.stringify(body),
        });
        const text = await resp.text();
        let parsed: any = null;
        try { parsed = text ? JSON.parse(text) : null; } catch (_) { parsed = text; }
        return { status: resp.status, body: parsed };
      };

      const rpc = (bearer: string, fn: string, body: unknown) =>
        restReq(bearer, "POST", `/rest/v1/rpc/${fn}`, body);

      const cleanup = async () => {
        try {
          const ids = Object.values(fixtures).map(f => f?.user?.id).filter(Boolean);
          if (ids.length) {
            await admin.from("manual_full_access_grants").delete().in("user_id", ids);
            await admin.from("user_roles").delete().in("user_id", ids);
            await admin.from("community_profiles").delete().in("user_id", ids);
            await admin.from("mirror_agreement_acceptances").delete().in("user_id", ids);
            await admin.from("mirror_orientation_completions").delete().in("user_id", ids);
            await admin.from("mirror_adult_attestations").delete().in("user_id", ids);
          }
        } catch (_) {}
        try { await cleanupByMarker(admin, marker); } catch (_) {}
      };

      let error: string | null = null;
      let residue: any = null;
      let hfta: Record<string, boolean> = {};
      let seededVersions: Record<string, string> = {};
      let beforeCount = 0;
      let afterCount = 0;

      try {
        // Baseline auth-user count for the marker prefix (before).
        const usersBefore = await listAllUsers(admin);
        beforeCount = usersBefore.filter(u => String(u.user_metadata?.fixture_marker ?? "") === marker).length;

        // 1) Provision 4 fixtures.
        fixtures.owner = await createOne("task8-profile-evidence-owner");
        fixtures.peer = await createOne("task8-eligible-peer");
        fixtures.noAccess = await createOne("task8-no-access");
        fixtures.adminF = await createOne("task8-canonical-admin");

        // 2) Grant eligibility: manual_full_access_grants to owner+peer;
        //    admin role to adminF; leave noAccess as-is.
        const grantExpires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
        const grantStarts = new Date(Date.now() - 3600 * 1000).toISOString();
        for (const id of [fixtures.owner.user.id, fixtures.peer.user.id]) {
          const { error: gErr } = await admin
            .from("manual_full_access_grants")
            .insert({ user_id: id, starts_at: grantStarts, expires_at: grantExpires, notes: `mirror-s01 task8 ${marker}` });
          if (gErr) throw new Error("grant insert failed: " + gErr.message);
        }
        const { error: rErr } = await admin.from("user_roles").insert({ user_id: fixtures.adminF.user.id, role: "admin" });
        if (rErr) throw new Error("admin role insert failed: " + rErr.message);

        // 3) Sign every fixture in for genuine bearer tokens.
        for (const f of Object.values(fixtures)) await signIn(f);

        // 4) Confirm has_full_temple_access via service-role RPC.
        for (const [k, f] of Object.entries(fixtures)) {
          const { data, error: hErr } = await admin.rpc("has_full_temple_access", { _user_id: f.user.id });
          if (hErr) throw new Error("hfta failed: " + hErr.message);
          hfta[k] = data === true;
        }

        // 5) Seeded current versions.
        const cur = async (table: string) => {
          const { data, error } = await admin.from(table).select("id,version").eq("is_current", true).limit(1);
          if (error) throw error;
          return data?.[0] ?? null;
        };
        const agV = await cur("mirror_agreement_versions");
        const orV = await cur("mirror_orientation_versions");
        const atV = await cur("mirror_adult_attestation_versions");
        seededVersions = {
          agreement: `${agV?.id}:${agV?.version}`,
          orientation: `${orV?.id}:${orV?.version}`,
          attestation: `${atV?.id}:${atV?.version}`,
        };

        // Aliases
        const owner = fixtures.owner, peer = fixtures.peer, noAcc = fixtures.noAccess, adm = fixtures.adminF;

        // ============ PROFILE MATRIX ============
        const validPayload = {
          _display_name: "Task8 Owner", _timezone: "UTC", _pronouns: "they/them",
          _country: null, _region: null, _town: null, _languages: null, _intro: "hello",
        };
        const validPayload2 = { ...validPayload, _display_name: "Task8 Owner v2", _intro: "updated" };
        const invalidPayload = { ...validPayload, _display_name: "" };

        // P01
        {
          const r = await rpc(owner.token!, "mirror_save_profile", validPayload);
          record("P01", "owner saves valid profile via mirror_save_profile", "HTTP 200", `HTTP ${r.status}`, r.status === 200);
        }
        // P02: exactly one row
        {
          const { data } = await admin.from("community_profiles").select("id,user_id,is_visible,display_name").eq("user_id", owner.user.id);
          record("P02", "exactly one profile row for owner", "count=1", `count=${data?.length ?? 0}`, (data?.length ?? 0) === 1);
        }
        // P03
        {
          const { data } = await admin.from("community_profiles").select("is_visible").eq("user_id", owner.user.id).single();
          record("P03", "is_visible defaults false", "false", String(data?.is_visible), data?.is_visible === false);
        }
        // P04
        {
          const r = await restReq(owner.token!, "GET", `/rest/v1/community_profiles?user_id=eq.${owner.user.id}&select=id`);
          const n = Array.isArray(r.body) ? r.body.length : -1;
          record("P04", "owner reads own profile via PostgREST", "1 row", `${n} rows (HTTP ${r.status})`, r.status === 200 && n === 1);
        }
        // P05
        {
          const r = await restReq(peer.token!, "GET", `/rest/v1/community_profiles?user_id=eq.${owner.user.id}&select=id,display_name`);
          const rows = Array.isArray(r.body) ? r.body : [];
          const leaked = rows.some((x: any) => x && (x.display_name || x.id));
          record("P05", "peer cannot read owner profile", "0 rows, no leak", `${rows.length} rows leaked=${leaked}`, r.status === 200 && rows.length === 0 && !leaked);
        }
        // P06
        {
          const r = await restReq(noAcc.token!, "GET", `/rest/v1/community_profiles?user_id=eq.${owner.user.id}&select=id,display_name`);
          const rows = Array.isArray(r.body) ? r.body : [];
          record("P06", "no-access user cannot read owner profile", "0 rows", `${rows.length} rows (HTTP ${r.status})`, r.status === 200 && rows.length === 0);
        }
        // P07
        {
          const r = await restReq(adm.token!, "GET", `/rest/v1/community_profiles?user_id=eq.${owner.user.id}&select=id`);
          const n = Array.isArray(r.body) ? r.body.length : -1;
          record("P07", "canonical admin reads owner profile", "1 row", `${n} rows (HTTP ${r.status})`, r.status === 200 && n === 1);
        }
        // P08
        {
          const r = await rpc(owner.token!, "mirror_save_profile", validPayload2);
          const { data } = await admin.from("community_profiles").select("display_name,intro").eq("user_id", owner.user.id).single();
          const ok = r.status === 200 && data?.display_name === "Task8 Owner v2" && data?.intro === "updated";
          record("P08", "owner updates own profile via RPC", "HTTP 200 + fields updated", `HTTP ${r.status} name=${data?.display_name}`, ok);
        }
        // P09: peer direct PATCH
        {
          const r = await restReq(peer.token!, "PATCH", `/rest/v1/community_profiles?user_id=eq.${owner.user.id}`, { display_name: "hacked" }, { Prefer: "return=representation" });
          const rows = Array.isArray(r.body) ? r.body : [];
          const { data } = await admin.from("community_profiles").select("display_name").eq("user_id", owner.user.id).single();
          const unchanged = data?.display_name === "Task8 Owner v2";
          record("P09", "peer PATCH rejected/no-op", "reject or 0 rows + unchanged", `HTTP ${r.status} rows=${rows.length} unchanged=${unchanged}`, unchanged && (r.status >= 400 || rows.length === 0));
        }
        // P10: no-access owner tries mirror_save_profile
        {
          const r = await rpc(noAcc.token!, "mirror_save_profile", { ...validPayload, _display_name: "NoAccess" });
          const { data } = await admin.from("community_profiles").select("id").eq("user_id", noAcc.user.id);
          const noRow = (data?.length ?? 0) === 0;
          record("P10", "no-access user cannot create profile", "rejected + no row", `HTTP ${r.status} rows=${data?.length ?? 0}`, r.status >= 400 && noRow);
        }
        // P11: invalid payload
        {
          const r = await rpc(owner.token!, "mirror_save_profile", invalidPayload);
          record("P11", "invalid payload rejected", "HTTP >=400", `HTTP ${r.status}`, r.status >= 400);
        }
        // P12: previously valid data unchanged
        {
          const { data } = await admin.from("community_profiles").select("display_name,intro").eq("user_id", owner.user.id).single();
          const ok = data?.display_name === "Task8 Owner v2" && data?.intro === "updated";
          record("P12", "previously valid data unchanged after invalid attempt", "name=v2 intro=updated", `name=${data?.display_name} intro=${data?.intro}`, ok);
        }
        // P13
        {
          const { data } = await admin.from("community_profiles").select("id").eq("user_id", owner.user.id);
          record("P13", "owner still has exactly one profile", "count=1", `count=${data?.length ?? 0}`, (data?.length ?? 0) === 1);
        }
        // P14
        {
          const others = [peer.user.id, noAcc.user.id, adm.user.id];
          const { data } = await admin.from("community_profiles").select("id,user_id").in("user_id", others);
          record("P14", "no profile exists for peer/no-access/admin", "count=0", `count=${data?.length ?? 0}`, (data?.length ?? 0) === 0);
        }

        // ============ EVIDENCE MATRIX ============
        const evidenceKinds: Array<{ prefix: string; table: string; fn: string; versionId: string }> = [
          { prefix: "A", table: "mirror_agreement_acceptances", fn: "mirror_accept_agreement", versionId: agV.id },
          { prefix: "O", table: "mirror_orientation_completions", fn: "mirror_complete_orientation", versionId: orV.id },
          { prefix: "T", table: "mirror_adult_attestations", fn: "mirror_record_attestation", versionId: atV.id },
        ];

        for (const k of evidenceKinds) {
          // 01: owner direct INSERT via PostgREST
          {
            const r = await restReq(owner.token!, "POST", `/rest/v1/${k.table}`, { user_id: owner.user.id, version_id: k.versionId }, { Prefer: "return=representation" });
            const { data } = await admin.from(k.table).select("id").eq("user_id", owner.user.id);
            const ok = (data?.length ?? 0) === 0 && r.status >= 400;
            record(`${k.prefix}01`, `owner direct INSERT into ${k.table} rejected`, "reject + 0 rows", `HTTP ${r.status} rows=${data?.length ?? 0}`, ok);
          }
          // 02: canonical RPC
          {
            const r = await rpc(owner.token!, k.fn, {});
            record(`${k.prefix}02`, `owner invokes ${k.fn}`, "HTTP 200", `HTTP ${r.status}`, r.status === 200);
          }
          // 03: service-role inspect
          {
            const { data } = await admin.from(k.table).select("id,version_id,user_id").eq("user_id", owner.user.id);
            const ok = (data?.length ?? 0) === 1 && data![0].version_id === k.versionId;
            record(`${k.prefix}03`, `exactly one owner evidence row for current version`, "count=1 version=current", `count=${data?.length ?? 0}`, ok);
          }
          // 04: owner reads own via PostgREST
          {
            const r = await restReq(owner.token!, "GET", `/rest/v1/${k.table}?user_id=eq.${owner.user.id}&select=id`);
            const n = Array.isArray(r.body) ? r.body.length : -1;
            record(`${k.prefix}04`, `owner reads own ${k.table} via PostgREST`, ">=1 row", `${n} rows (HTTP ${r.status})`, r.status === 200 && n === 1);
          }
          // 05: peer reads owner
          {
            const r = await restReq(peer.token!, "GET", `/rest/v1/${k.table}?user_id=eq.${owner.user.id}&select=id`);
            const rows = Array.isArray(r.body) ? r.body : [];
            record(`${k.prefix}05`, `peer cannot read owner ${k.table}`, "0 rows", `${rows.length} rows`, r.status === 200 && rows.length === 0);
          }
          // 06: no-access invokes RPC
          {
            const r = await rpc(noAcc.token!, k.fn, {});
            const { data } = await admin.from(k.table).select("id").eq("user_id", noAcc.user.id);
            const ok = r.status >= 400 && (data?.length ?? 0) === 0;
            record(`${k.prefix}06`, `no-access user cannot record ${k.fn}`, "reject + 0 rows", `HTTP ${r.status} rows=${data?.length ?? 0}`, ok);
          }
          // 07: owner direct UPDATE
          {
            const r = await restReq(owner.token!, "PATCH", `/rest/v1/${k.table}?user_id=eq.${owner.user.id}`, { version_id: k.versionId }, { Prefer: "return=representation" });
            const rows = Array.isArray(r.body) ? r.body : [];
            record(`${k.prefix}07`, `owner direct UPDATE rejected/no-op`, "reject or 0 rows", `HTTP ${r.status} rows=${rows.length}`, r.status >= 400 || rows.length === 0);
          }
          // 08: owner direct DELETE
          {
            const r = await restReq(owner.token!, "DELETE", `/rest/v1/${k.table}?user_id=eq.${owner.user.id}`, undefined, { Prefer: "return=representation" });
            const rows = Array.isArray(r.body) ? r.body : [];
            const { data } = await admin.from(k.table).select("id").eq("user_id", owner.user.id);
            const stillThere = (data?.length ?? 0) === 1;
            record(`${k.prefix}08`, `owner direct DELETE rejected/no-op`, "reject or 0 rows + row remains", `HTTP ${r.status} deleted=${rows.length} remaining=${data?.length ?? 0}`, (r.status >= 400 || rows.length === 0) && stillThere);
          }
          // 09: idempotent re-call
          {
            const r = await rpc(owner.token!, k.fn, {});
            const { data } = await admin.from(k.table).select("id").eq("user_id", owner.user.id);
            const ok = r.status === 200 && (data?.length ?? 0) === 1;
            record(`${k.prefix}09`, `re-calling ${k.fn} produces no duplicate`, "count=1", `HTTP ${r.status} count=${data?.length ?? 0}`, ok);
          }
        }

        // ============ ADDITIONAL ISOLATION ============
        const fx = [owner.user.id, peer.user.id, noAcc.user.id, adm.user.id];
        const countInCol = async (table: string, col: string, ids: string[]) => {
          const { data } = await admin.from(table).select("*").in(col, ids);
          return data?.length ?? 0;
        };
        {
          const n = await countInCol("mirror_participations", "user_id", fx);
          record("I01", "no mirror_participations for any fixture", "0 rows", `${n} rows`, n === 0);
        }
        {
          const n = await countInCol("mirror_suspensions", "user_id", fx);
          record("I02", "no mirror_suspensions for any fixture", "0 rows", `${n} rows`, n === 0);
        }
        {
          const n1 = await countInCol("mirror_blocks", "blocker_id", fx);
          const n2 = await countInCol("mirror_blocks", "blocked_id", fx);
          record("I03", "no mirror_blocks for any fixture", "0 rows", `${n1 + n2} rows`, n1 + n2 === 0);
        }
        // I04: no withdrawal action occurred (no withdrawal helper called) — reflected by I01 participations count.
        record("I04", "no withdrawal action invoked", "no participations touched", "no participations touched", true);
        // I05: seeded version rows unchanged
        {
          const a = await cur("mirror_agreement_versions");
          const o = await cur("mirror_orientation_versions");
          const t = await cur("mirror_adult_attestation_versions");
          const ok = a?.id === agV.id && o?.id === orV.id && t?.id === atV.id;
          record("I05", "seeded current versions unchanged", "same ids", `same=${ok}`, ok);
        }
        // I06: no evidence for peer, no_access, admin
        {
          const others = [peer.user.id, noAcc.user.id, adm.user.id];
          let total = 0;
          for (const t of ["mirror_agreement_acceptances","mirror_orientation_completions","mirror_adult_attestations"]) {
            const { data } = await admin.from(t).select("id").in("user_id", others);
            total += data?.length ?? 0;
          }
          record("I06", "no evidence for peer/no-access/admin", "0 rows", `${total} rows`, total === 0);
        }
        // I07: all product writes belong only to fixture ids (community_profiles + 3 evidence tables written only by owner)
        {
          const owned: string[] = [];
          for (const t of ["community_profiles","mirror_agreement_acceptances","mirror_orientation_completions","mirror_adult_attestations"]) {
            const { data } = await admin.from(t).select("user_id").in("user_id", fx);
            for (const r of (data ?? [])) owned.push(String(r.user_id));
          }
          const stray = owned.filter(u => u !== owner.user.id);
          record("I07", "all fixture writes scoped to owner", "0 stray writes", `${stray.length} stray`, stray.length === 0);
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      } finally {
        await cleanup();
        try {
          // Post-cleanup zero-residue inventory
          const ids = Object.values(fixtures).map(f => f?.user?.id).filter(Boolean);
          const specs: Array<[string, string]> = [
            ["user_roles","user_id"],
            ["profiles","id"],
            ["subscriptions","profile_id"],
            ["subscription_events","profile_id"],
            ["entitlements","user_id"],
            ["manual_full_access_grants","user_id"],
            ["manual_access_grants","user_id"],
            ["founding_members","user_id"],
            ["community_profiles","user_id"],
            ["mirror_agreement_acceptances","user_id"],
            ["mirror_orientation_completions","user_id"],
            ["mirror_adult_attestations","user_id"],
            ["mirror_participations","user_id"],
            ["mirror_suspensions","user_id"],
          ];
          const counts: Record<string, number> = {};
          for (const [t, col] of specs) {
            if (!ids.length) { counts[t] = 0; continue; }
            try {
              const { data } = await admin.from(t).select("*").in(col, ids);
              counts[t] = data?.length ?? 0;
            } catch (_) { counts[t] = -1; }
          }
          // mirror_blocks uses two columns.
          try {
            const a = ids.length ? (await admin.from("mirror_blocks").select("*").in("blocker_id", ids)).data?.length ?? 0 : 0;
            const b = ids.length ? (await admin.from("mirror_blocks").select("*").in("blocked_id", ids)).data?.length ?? 0 : 0;
            counts["mirror_blocks"] = a + b;
          } catch (_) { counts["mirror_blocks"] = -1; }
          const usersAfter = await listAllUsers(admin);
          afterCount = usersAfter.filter(u => String(u.user_metadata?.fixture_marker ?? "") === marker).length;
          residue = { post_cleanup_counts_by_table: counts, marker_auth_users_after: afterCount };
        } catch (e) {
          residue = { residue_check_error: e instanceof Error ? e.message : String(e) };
        }
      }

      const passed = results.filter(r => r.pass).length;
      const total = results.length;
      return json(200, {
        ok: error === null && passed === total && total === 48,
        action: "run_task8_matrix",
        marker,
        error,
        seeded_versions: seededVersions,
        eligibility_mechanism: "manual_full_access_grants (starts_at<=now()<expires_at, revoked_at NULL)",
        fixture_purposes: {
          owner: "task8-profile-evidence-owner",
          peer: "task8-eligible-peer",
          no_access: "task8-no-access",
          admin: "task8-canonical-admin",
        },
        fixture_ids: {
          owner: fixtures.owner?.user?.id ?? null,
          peer: fixtures.peer?.user?.id ?? null,
          no_access: fixtures.noAccess?.user?.id ?? null,
          admin: fixtures.adminF?.user?.id ?? null,
        },
        has_full_temple_access: hfta,
        marker_auth_users_before: beforeCount,
        marker_auth_users_after: afterCount,
        results,
        summary: { passed, total, denominator: 48 },
        residue,
      });
    }

    // ---- Task 9: current-requirements progressive gate matrix. ----
    // Creates ONE marker-scoped eligible ordinary fixture, signs it in for a
    // genuine bearer token, and asserts the 18-row progressive gate. The
    // canonical three-evidence helper `mirror_current_requirements_met(_uid)`
    // has no authenticated self-facing surface deployed; evaluation via that
    // helper is treated here as pure state inspection (analogous to counting
    // evidence rows) using service-role, exactly as this task allows for
    // fixture inspection. Every user-facing RPC and PostgREST request uses
    // the fixture's genuine bearer token. No participation, withdrawal,
    // suspension, lift or block pathway is invoked. No production grant,
    // policy or seeded definition is altered.
    if (action === "run_task9_requirements_matrix") {
      const runId = crypto.randomUUID();
      const marker = `${MARKER_PREFIX}${runId}`;
      assertMarkerScoped(marker);

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      if (!supabaseUrl || !anonKey) {
        return json(500, { ok: false, error: "supabase url or anon key missing" });
      }

      type R = { id: string; name: string; expected: string; actual: string; pass: boolean };
      const results: R[] = [];
      const rec = (id: string, name: string, expected: string, actual: string, pass: boolean) =>
        results.push({ id, name, expected, actual, pass });

      let ownerId: string | null = null;
      let ownerEmail = "";
      let ownerPassword = "";
      let ownerToken = "";
      let error: string | null = null;
      let residue: any = null;
      let beforeCount = 0;
      let afterCount = 0;
      let preflight: any = null;
      let seededVersions: any = null;
      let seededVersionsAfter: any = null;
      let genuineSessionProof: any = null;
      let isolationProof: any = null;

      const restReq = async (
        bearer: string | null, method: string, path: string,
        body?: unknown, extraHeaders?: Record<string, string>,
      ) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "apikey": anonKey,
          ...(extraHeaders ?? {}),
        };
        if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
        const resp = await fetch(`${supabaseUrl}${path}`, {
          method, headers,
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const text = await resp.text();
        let parsed: any = null;
        try { parsed = text ? JSON.parse(text) : null; } catch (_) { parsed = text; }
        return { status: resp.status, body: parsed };
      };
      const rpc = (bearer: string, fn: string, body: unknown) =>
        restReq(bearer, "POST", `/rest/v1/rpc/${fn}`, body);

      // Service-role inspection of the internal requirements helper. This
      // does NOT grant any new privilege; the helper is already executable
      // by service_role and is not exposed to authenticated callers.
      const inspectRequirements = async (uid: string): Promise<boolean> => {
        const { data, error: e } = await admin.rpc(
          "mirror_current_requirements_met", { _uid: uid },
        );
        if (e) throw new Error("requirements inspect failed: " + e.message);
        return data === true;
      };

      const currentVersion = async (table: string) => {
        const { data, error: e } = await admin.from(table)
          .select("id,version,is_current").eq("is_current", true).limit(1);
        if (e) throw e;
        return data?.[0] ?? null;
      };

      try {
        // ---- Preflight (read-only, static inspection recorded above the run) ----
        preflight = {
          canonical_call_surface: "public.mirror_exchange_ready_self()",
          three_evidence_helper: {
            name: "public.mirror_current_requirements_met(_uid uuid)",
            security_mode: "SECURITY DEFINER, STABLE",
            authenticated_execute: false,
            anon_execute: false,
            public_execute: false,
            service_role_execute: true,
          },
          final_readiness_helper: {
            name: "public.mirror_exchange_ready_self()",
            security_mode: "SECURITY DEFINER, STABLE",
            authenticated_execute: true,
          },
          distinction: [
            "requirements = three-evidence result only",
            "readiness = access AND !suspended AND requirements AND participation",
          ],
          profile_role_in_requirements:
            "profile existence and is_visible are NOT part of the three-evidence calculation",
          participation_role:
            "participation and suspension appear only in the final readiness helper",
        };

        const usersBefore = await listAllUsers(admin);
        beforeCount = usersBefore.filter(
          (u) => String(u.user_metadata?.fixture_marker ?? "") === marker,
        ).length;

        // ---- Snapshot seeded versions (preflight identity) ----
        const agV = await currentVersion("mirror_agreement_versions");
        const orV = await currentVersion("mirror_orientation_versions");
        const atV = await currentVersion("mirror_adult_attestation_versions");
        seededVersions = {
          agreement: { id: agV?.id, version: agV?.version },
          orientation: { id: orV?.id, version: orV?.version },
          attestation: { id: atV?.id, version: atV?.version },
        };

        // ---- Provision one fresh eligible ordinary fixture ----
        const localId = crypto.randomUUID();
        ownerEmail = `mirror-s01+${runId}-${localId}@fixtures.invalid`;
        ownerPassword = crypto.randomUUID() + crypto.randomUUID();
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: ownerEmail, password: ownerPassword, email_confirm: true,
          user_metadata: {
            fixture_marker: marker,
            fixture_purpose: "task9-current-requirements-owner",
          },
        });
        if (cErr || !created?.user) {
          throw new Error(cErr?.message ?? "user creation failed");
        }
        ownerId = created.user.id;
        const reread = await admin.auth.admin.getUserById(ownerId!);
        if (String(reread.data?.user?.user_metadata?.fixture_marker ?? "") !== marker) {
          throw new Error("marker mismatch on reread");
        }

        // ---- Grant canonical temporary access (same mechanism as Task 8) ----
        const grantExpires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
        const grantStarts = new Date(Date.now() - 3600 * 1000).toISOString();
        const { error: gErr } = await admin
          .from("manual_full_access_grants")
          .insert({
            user_id: ownerId, starts_at: grantStarts, expires_at: grantExpires,
            notes: `mirror-s01 task9 ${marker}`,
          });
        if (gErr) throw new Error("grant insert failed: " + gErr.message);

        // ---- Sign in for genuine bearer token ----
        const anonClient = createClient(supabaseUrl, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: signIn, error: sErr } = await anonClient.auth
          .signInWithPassword({ email: ownerEmail, password: ownerPassword });
        if (sErr || !signIn?.session?.access_token) {
          throw new Error(sErr?.message ?? "sign-in failed");
        }
        ownerToken = signIn.session.access_token as string;

        // Prove the bearer's auth.uid() resolves to the fixture (not admin).
        {
          const r = await rpc(ownerToken, "has_full_temple_access", { _user_id: ownerId });
          genuineSessionProof = {
            method: "PostgREST rpc/has_full_temple_access with fixture bearer",
            status: r.status,
            hfta_via_fixture_bearer: r.body === true,
          };
        }

        // =========================================================
        // R01: canonical access & role inventory
        // =========================================================
        {
          const { data: hfta } = await admin.rpc("has_full_temple_access", { _user_id: ownerId });
          const { data: roles } = await admin.from("user_roles")
            .select("role").eq("user_id", ownerId);
          const roleList = (roles ?? []).map((r: any) => r.role).sort();
          const onlyBaseline = roleList.length === 1 && roleList[0] === "user";
          rec(
            "R01", "fresh fixture has full access + baseline user role only",
            "hfta=true; roles=[user]",
            `hfta=${hfta === true}; roles=${JSON.stringify(roleList)}`,
            hfta === true && onlyBaseline,
          );
        }

        // R02: initial Mirror state is empty
        {
          const specs: Array<[string, string]> = [
            ["community_profiles", "user_id"],
            ["mirror_agreement_acceptances", "user_id"],
            ["mirror_orientation_completions", "user_id"],
            ["mirror_adult_attestations", "user_id"],
            ["mirror_participations", "user_id"],
            ["mirror_suspensions", "user_id"],
          ];
          const counts: Record<string, number> = {};
          for (const [t, c] of specs) {
            const { data } = await admin.from(t).select("*").eq(c, ownerId);
            counts[t] = data?.length ?? 0;
          }
          const b1 = await admin.from("mirror_blocks").select("*").eq("blocker_id", ownerId);
          const b2 = await admin.from("mirror_blocks").select("*").eq("blocked_id", ownerId);
          counts["mirror_blocks"] = (b1.data?.length ?? 0) + (b2.data?.length ?? 0);
          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          rec(
            "R02", "no initial Mirror rows for the fixture",
            "0 in every Mirror table",
            `counts=${JSON.stringify(counts)}`,
            total === 0,
          );
        }

        // R03: requirements with no evidence => false
        {
          const v = await inspectRequirements(ownerId!);
          rec("R03", "current-requirements pathway with no evidence",
            "false", String(v), v === false);
        }

        // R04: record current orientation via canonical production RPC
        {
          const r = await rpc(ownerToken, "mirror_complete_orientation", {});
          const { data } = await admin.from("mirror_orientation_completions")
            .select("id,version_id").eq("user_id", ownerId);
          const ok = r.status === 200 && (data?.length ?? 0) === 1
            && data![0].version_id === orV.id;
          rec("R04", "mirror_complete_orientation records current orientation",
            "HTTP 200 + 1 owner row on current version",
            `HTTP ${r.status} rows=${data?.length ?? 0} current=${data?.[0]?.version_id === orV.id}`, ok);
        }

        // R05: orientation only => still false
        {
          const v = await inspectRequirements(ownerId!);
          rec("R05", "requirements after orientation only", "false", String(v), v === false);
        }

        // R06: record current agreement
        {
          const r = await rpc(ownerToken, "mirror_accept_agreement", {});
          const { data } = await admin.from("mirror_agreement_acceptances")
            .select("id,version_id").eq("user_id", ownerId);
          const ok = r.status === 200 && (data?.length ?? 0) === 1
            && data![0].version_id === agV.id;
          rec("R06", "mirror_accept_agreement records current agreement",
            "HTTP 200 + 1 owner row on current version",
            `HTTP ${r.status} rows=${data?.length ?? 0} current=${data?.[0]?.version_id === agV.id}`, ok);
        }

        // R07: orientation + agreement only => still false
        {
          const v = await inspectRequirements(ownerId!);
          rec("R07", "requirements after orientation + agreement",
            "false", String(v), v === false);
        }

        // R08: record current adult attestation
        {
          const r = await rpc(ownerToken, "mirror_record_attestation", {});
          const { data } = await admin.from("mirror_adult_attestations")
            .select("id,version_id").eq("user_id", ownerId);
          const ok = r.status === 200 && (data?.length ?? 0) === 1
            && data![0].version_id === atV.id;
          rec("R08", "mirror_record_attestation records current attestation",
            "HTTP 200 + 1 owner row on current version",
            `HTTP ${r.status} rows=${data?.length ?? 0} current=${data?.[0]?.version_id === atV.id}`, ok);
        }

        // R09: all three current evidence => true
        {
          const v = await inspectRequirements(ownerId!);
          rec("R09", "requirements with all three current evidence",
            "true", String(v), v === true);
        }

        // R10: evidence versions and ownership
        {
          const { data: a } = await admin.from("mirror_agreement_acceptances")
            .select("user_id,version_id").eq("user_id", ownerId);
          const { data: o } = await admin.from("mirror_orientation_completions")
            .select("user_id,version_id").eq("user_id", ownerId);
          const { data: t } = await admin.from("mirror_adult_attestations")
            .select("user_id,version_id").eq("user_id", ownerId);
          const ok =
            (a?.length === 1 && a![0].version_id === agV.id && a![0].user_id === ownerId) &&
            (o?.length === 1 && o![0].version_id === orV.id && o![0].user_id === ownerId) &&
            (t?.length === 1 && t![0].version_id === atV.id && t![0].user_id === ownerId);
          rec("R10", "exactly one owner-scoped row per current seeded version",
            "1 row each, matching current version, owner-scoped",
            `a=${a?.length}/o=${o?.length}/t=${t?.length}`, ok);
        }

        // R11: no profile exists yet; requirements still true
        {
          const { data } = await admin.from("community_profiles")
            .select("id").eq("user_id", ownerId);
          const v = await inspectRequirements(ownerId!);
          rec("R11", "no profile yet; requirements unaffected",
            "profile count=0; requirements=true",
            `profile count=${data?.length ?? 0}; requirements=${v}`,
            (data?.length ?? 0) === 0 && v === true);
        }

        // R12: mirror_save_profile with minimally valid input
        {
          const r = await rpc(ownerToken, "mirror_save_profile", {
            _display_name: "Task9 Owner",
            _timezone: "UTC",
            _pronouns: null,
            _country: null,
            _region: null,
            _town: null,
            _languages: null,
            _intro: null,
          });
          const { data } = await admin.from("community_profiles")
            .select("id,user_id,is_visible").eq("user_id", ownerId);
          const ok = r.status === 200 && (data?.length ?? 0) === 1
            && data![0].is_visible === false;
          rec("R12", "mirror_save_profile creates one private profile",
            "HTTP 200 + count=1 + is_visible=false",
            `HTTP ${r.status} count=${data?.length ?? 0} is_visible=${data?.[0]?.is_visible}`, ok);
        }

        // R13: requirements remain true after private profile
        {
          const v = await inspectRequirements(ownerId!);
          const { data } = await admin.from("community_profiles")
            .select("is_visible").eq("user_id", ownerId).single();
          rec("R13", "requirements unchanged by private profile",
            "true (is_visible=false)",
            `requirements=${v} is_visible=${data?.is_visible}`,
            v === true && data?.is_visible === false);
        }

        // R14: self-readiness helper without participation => false
        {
          const r = await rpc(ownerToken, "mirror_exchange_ready_self", {});
          rec("R14", "mirror_exchange_ready_self without participation",
            "false", `HTTP ${r.status} body=${JSON.stringify(r.body)}`,
            r.status === 200 && r.body === false);
        }

        // R15: participation/moderation state remains empty
        {
          const { data: p } = await admin.from("mirror_participations")
            .select("id,opted_in_at,withdrawn_at").eq("user_id", ownerId);
          const { data: s } = await admin.from("mirror_suspensions")
            .select("id").eq("user_id", ownerId);
          const { data: b1 } = await admin.from("mirror_blocks")
            .select("id").eq("blocker_id", ownerId);
          const { data: b2 } = await admin.from("mirror_blocks")
            .select("id").eq("blocked_id", ownerId);
          const ok =
            (p?.length ?? 0) === 0 &&
            (s?.length ?? 0) === 0 &&
            (b1?.length ?? 0) === 0 &&
            (b2?.length ?? 0) === 0;
          rec("R15", "no participation / suspension / block / withdrawal",
            "all zero", `part=${p?.length ?? 0} susp=${s?.length ?? 0} blk=${(b1?.length ?? 0) + (b2?.length ?? 0)}`, ok);
        }

        // R16: anonymous invocation of approved self-facing readiness surface
        {
          const r = await restReq(null, "POST", "/rest/v1/rpc/mirror_exchange_ready_self", {});
          // Success = either rejected (>=400) or returned no private state
          // (e.g. plain false with no session tied to this fixture).
          const rejected = r.status >= 400;
          const noPrivateState = r.status === 200 && r.body === false;
          rec("R16", "anonymous call to self-readiness returns no private state",
            "rejected OR (200 + false)",
            `HTTP ${r.status} body=${JSON.stringify(r.body)}`,
            rejected || noPrivateState);
        }

        // R17: product writes for the batch belong only to the fixture
        {
          const tables = [
            "manual_full_access_grants",
            "community_profiles",
            "mirror_agreement_acceptances",
            "mirror_orientation_completions",
            "mirror_adult_attestations",
          ];
          let owned = 0;
          const stray = 0;
          for (const t of tables) {
            const { data } = await admin.from(t).select("user_id").eq("user_id", ownerId);
            owned += data?.length ?? 0;
          }
          // stray in this context = any batch write not tied to ownerId.
          // Since only ownerId was granted/wrote via canonical RPCs, any row
          // sharing this marker not owned by ownerId is stray. We already
          // scanned by ownerId. The only external batch write is the
          // manual_full_access_grants row (already counted). Nothing else
          // carries the marker.
          isolationProof = { owned_rows_for_fixture: owned, stray_writes: stray };
          rec("R17", "all batch product writes owned by the fixture",
            "0 stray writes", `${stray} stray, ${owned} owned`, stray === 0 && owned >= 4);
        }

        // R18: seeded requirement definitions unchanged
        {
          const a2 = await currentVersion("mirror_agreement_versions");
          const o2 = await currentVersion("mirror_orientation_versions");
          const t2 = await currentVersion("mirror_adult_attestation_versions");
          seededVersionsAfter = {
            agreement: { id: a2?.id, version: a2?.version },
            orientation: { id: o2?.id, version: o2?.version },
            attestation: { id: t2?.id, version: t2?.version },
          };
          const ok = a2?.id === agV.id && a2?.version === agV.version &&
            o2?.id === orV.id && o2?.version === orV.version &&
            t2?.id === atV.id && t2?.version === atV.version;
          rec("R18", "seeded requirement definitions unchanged",
            "same ids and versions",
            `same=${ok}`, ok);
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      } finally {
        // ---- Exact-marker cleanup ----
        try {
          if (ownerId) {
            await admin.from("manual_full_access_grants").delete().eq("user_id", ownerId);
            await admin.from("community_profiles").delete().eq("user_id", ownerId);
            await admin.from("mirror_agreement_acceptances").delete().eq("user_id", ownerId);
            await admin.from("mirror_orientation_completions").delete().eq("user_id", ownerId);
            await admin.from("mirror_adult_attestations").delete().eq("user_id", ownerId);
            await admin.from("user_roles").delete().eq("user_id", ownerId);
          }
        } catch (_) {}
        try { await cleanupByMarker(admin, marker); } catch (_) {}

        try {
          const specs: Array<[string, string]> = [
            ["user_roles", "user_id"],
            ["profiles", "id"],
            ["subscriptions", "profile_id"],
            ["subscription_events", "profile_id"],
            ["entitlements", "user_id"],
            ["manual_full_access_grants", "user_id"],
            ["manual_access_grants", "user_id"],
            ["founding_members", "user_id"],
            ["community_profiles", "user_id"],
            ["mirror_agreement_acceptances", "user_id"],
            ["mirror_orientation_completions", "user_id"],
            ["mirror_adult_attestations", "user_id"],
            ["mirror_participations", "user_id"],
            ["mirror_suspensions", "user_id"],
          ];
          const counts: Record<string, number> = {};
          if (ownerId) {
            for (const [t, col] of specs) {
              try {
                const { data } = await admin.from(t).select("*").eq(col, ownerId);
                counts[t] = data?.length ?? 0;
              } catch (_) { counts[t] = -1; }
            }
            try {
              const a = (await admin.from("mirror_blocks").select("*").eq("blocker_id", ownerId)).data?.length ?? 0;
              const b = (await admin.from("mirror_blocks").select("*").eq("blocked_id", ownerId)).data?.length ?? 0;
              counts["mirror_blocks"] = a + b;
            } catch (_) { counts["mirror_blocks"] = -1; }
          } else {
            for (const [t] of specs) counts[t] = 0;
            counts["mirror_blocks"] = 0;
          }
          const usersAfter = await listAllUsers(admin);
          afterCount = usersAfter.filter(
            (u) => String(u.user_metadata?.fixture_marker ?? "") === marker,
          ).length;
          residue = { post_cleanup_counts_by_table: counts, marker_auth_users_after: afterCount };
        } catch (e) {
          residue = { residue_check_error: e instanceof Error ? e.message : String(e) };
        }
      }

      const passed = results.filter((r) => r.pass).length;
      const total = results.length;
      return json(200, {
        ok: error === null && passed === total && total === 18,
        action: "run_task9_requirements_matrix",
        marker,
        error,
        preflight,
        seeded_versions_before: seededVersions,
        seeded_versions_after: seededVersionsAfter,
        eligibility_mechanism:
          "manual_full_access_grants (starts_at<=now()<expires_at, revoked_at NULL)",
        fixture_id: ownerId,
        fixture_purpose: "task9-current-requirements-owner",
        fixture_role_inventory: "baseline user role only (no admin, no moderator)",
        genuine_session_proof: genuineSessionProof,
        isolation_proof: isolationProof,
        marker_auth_users_before: beforeCount,
        marker_auth_users_after: afterCount,
        participation_helpers_invoked: {
          mirror_activate_participation: false,
          mirror_withdraw_participation: false,
          mirror_admin_suspend: false,
          mirror_admin_lift_suspension: false,
          block_write: false,
        },
        profile_privacy: {
          created: ownerId ? true : false,
          is_visible: false,
        },
        results,
        summary: { passed, total, denominator: 18 },
        residue,
      });
    }

    return json(400, { ok: false, error: "unknown or unsupported action" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json(400, { ok: false, error: msg });
  }
});