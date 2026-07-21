// TEMPORARY Phase 4e-ii fixture runner.
//
// Creates disposable authenticated users representing every rendered
// access state on `/temple`. Each fixture is uniquely marked with a
// Phase 4e-ii run ID and cleaned up in try/finally. Never mutates or
// deletes any record without the correct marker. Service-role authority
// is scoped to this Edge Function only and never returned to callers.
//
// This file, its config entry, and its shared secret are all removed at
// the end of Phase 4e-ii.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-phase-token",
};

const MARKER_PREFIX = "phase4eii_";
const NOTE_MARKER = "PHASE4E-II-FIXTURE";

type BucketKey = "remembrance" | "devotion" | "communion";

interface CreateFixture {
  slug: string; // e.g. "rem_only"
  grants?: { bucket: BucketKey; expired?: boolean }[];
  activeFullMember?: boolean;
}

const FIXTURES: CreateFixture[] = [
  { slug: "none" },
  { slug: "rem_only", grants: [{ bucket: "remembrance" }] },
  { slug: "dev_only", grants: [{ bucket: "devotion" }] },
  { slug: "com_only", grants: [{ bucket: "communion" }] },
  {
    slug: "multi",
    grants: [{ bucket: "remembrance" }, { bucket: "devotion" }],
  },
  { slug: "expired", grants: [{ bucket: "remembrance", expired: true }] },
  { slug: "full_member", activeFullMember: true },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "create";
  const runId =
    url.searchParams.get("run_id") ?? `${MARKER_PREFIX}${Date.now()}`;

  try {
    const phaseToken = req.headers.get("x-phase-token");
    const authHeader = req.headers.get("Authorization");
    const expectedToken = Deno.env.get("PHASE4E_II_RUNNER_TOKEN");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Two acceptable authorization paths:
    //   1. Verified admin JWT (Authorization: Bearer <access_token>).
    //   2. Shared secret (x-phase-token) matching PHASE4E_II_RUNNER_TOKEN.
    // Either is sufficient; both are checked server-side.
    let authorized = false;
    if (authHeader) {
      const anon = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userRes } = await anon.auth.getUser();
      if (userRes.user) {
        const { data: roleRow } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", userRes.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) authorized = true;
      }
    }
    if (!authorized && expectedToken && phaseToken === expectedToken) {
      authorized = true;
    }
    if (!authorized) return json({ error: "unauthorized" }, 401);

    if (action === "create") return await handleCreate(admin, runId);
    if (action === "cleanup") return await handleCleanup(admin, runId);
    if (action === "cleanup_all") return await handleCleanupAll(admin);
    return json({ error: "unknown_action" }, 400);
  } catch (e: any) {
    console.error("phase4e-ii-runner error", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleCreate(admin: any, runId: string) {
  const password = "Phase4eII!Fixture-" + Math.random().toString(36).slice(2, 10);
  const created: any[] = [];
  const grantIds: string[] = [];

  try {
    for (const f of FIXTURES) {
      const email = `${runId}_${f.slug}@fixture.local`;
      const { data: userRes, error: userErr } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: `Fixture ${f.slug}`,
            [MARKER_PREFIX + "run_id"]: runId,
            [MARKER_PREFIX + "slug"]: f.slug,
          },
        });
      if (userErr) throw userErr;
      const uid = userRes.user!.id;

      // Ensure profile exists and is marked; disable force-password-change
      // so the modal never blocks Playwright.
      await admin.from("profiles").upsert({
        id: uid,
        full_name: `Fixture ${f.slug}`,
        must_change_password: false,
        subscription_status: f.activeFullMember ? "active" : "inactive",
      });

      // Manual grants (fixture-marked in notes).
      if (f.grants) {
        for (const g of f.grants) {
          const now = new Date();
          const starts = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const ends = g.expired
            ? new Date(now.getTime() - 60 * 60 * 1000) // 1h ago
            : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const { data: grantRow, error: grantErr } = await admin
            .from("manual_access_grants")
            .insert({
              user_id: uid,
              bucket_key: g.bucket,
              granted_by: uid, // self-marker; still fixture-scoped
              starts_at: starts.toISOString(),
              ends_at: ends.toISOString(),
              notes: `${NOTE_MARKER} run=${runId} slug=${f.slug} bucket=${g.bucket}${g.expired ? " expired" : ""}`,
            })
            .select("id")
            .single();
          if (grantErr) throw grantErr;
          grantIds.push(grantRow.id);
        }
      }

      created.push({
        slug: f.slug,
        email,
        password,
        user_id: uid,
      });
    }

    return json({ ok: true, run_id: runId, users: created, grantIds });
  } catch (e) {
    // Best-effort partial rollback so a failed create still cleans up.
    await handleCleanup(admin, runId);
    throw e;
  }
}

async function handleCleanup(admin: any, runId: string) {
  // Only delete rows that carry this run's marker.
  const { data: grants } = await admin
    .from("manual_access_grants")
    .select("id, user_id, notes")
    .like("notes", `${NOTE_MARKER} run=${runId}%`);
  let grantsDeleted = 0;
  if (grants && grants.length) {
    const ids = grants.map((r: any) => r.id);
    const { error } = await admin
      .from("manual_access_grants")
      .delete()
      .in("id", ids);
    if (error) throw error;
    grantsDeleted = ids.length;
  }

  // Find fixture users by marker email pattern.
  const emails: string[] = [];
  const userIds: string[] = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const list = (data as any).users ?? [];
    for (const u of list) {
      if (u.email && u.email.startsWith(`${runId}_`) && u.email.endsWith("@fixture.local")) {
        emails.push(u.email);
        userIds.push(u.id);
      }
    }
    if (list.length < perPage) break;
    page += 1;
    if (page > 25) break; // safety
  }
  let usersDeleted = 0;
  for (const id of userIds) {
    await admin.from("profiles").delete().eq("id", id);
    const { error } = await admin.auth.admin.deleteUser(id);
    if (!error) usersDeleted += 1;
  }
  return json({ ok: true, run_id: runId, grantsDeleted, usersDeleted, emails });
}

async function handleCleanupAll(admin: any) {
  // Idempotent recovery: remove ANY Phase 4e-ii fixture residue regardless
  // of run id. Only matches on the fixture markers we ourselves wrote.
  const { data: grants } = await admin
    .from("manual_access_grants")
    .select("id")
    .like("notes", `${NOTE_MARKER}%`);
  let grantsDeleted = 0;
  if (grants && grants.length) {
    const ids = grants.map((r: any) => r.id);
    await admin.from("manual_access_grants").delete().in("id", ids);
    grantsDeleted = ids.length;
  }
  let usersDeleted = 0;
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const list = (data as any).users ?? [];
    for (const u of list) {
      if (
        u.email &&
        u.email.startsWith(`${MARKER_PREFIX}`) &&
        u.email.endsWith("@fixture.local")
      ) {
        await admin.from("profiles").delete().eq("id", u.id);
        const { error: dErr } = await admin.auth.admin.deleteUser(u.id);
        if (!dErr) usersDeleted += 1;
      }
    }
    if (list.length < perPage) break;
    page += 1;
    if (page > 25) break;
  }
  return json({ ok: true, grantsDeleted, usersDeleted });
}