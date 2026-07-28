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
      const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
      const rows = (data?.users ?? [])
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
      assertMarkerScoped(marker);
      const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
      const victims = (data?.users ?? []).filter((u) =>
        String(u.user_metadata?.fixture_marker ?? "") === marker
      );
      const removed: string[] = [];
      for (const u of victims) {
        // ON DELETE CASCADE from auth.users removes profiles, community
        // rows, evidence rows and audit entries tied to this fixture.
        await admin.auth.admin.deleteUser(u.id);
        removed.push(u.id);
      }
      return json(200, {
        ok: true,
        marker,
        removed_count: removed.length,
        removed,
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