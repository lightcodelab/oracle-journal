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

    // NOTE: fixture provisioning is intentionally omitted from this
    // deployment. It will be added in a separately authorised Stage 1
    // fixture task. Every future provisioning path MUST stamp
    // user_metadata.fixture_marker with a value starting with
    // MARKER_PREFIX, and MUST NOT accept an arbitrary real-user UUID as a
    // target.

    return json(400, { ok: false, error: "unknown or unsupported action" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json(400, { ok: false, error: msg });
  }
});