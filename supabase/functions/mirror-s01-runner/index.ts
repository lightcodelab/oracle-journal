// Temporary Mirror Exchange S01 harness runner.
// Provisions an authenticated admin + ordinary member fixture (marker: mirrorS01:*),
// returns access tokens for direct RPC calls, and supports teardown.
// SECURITY: caller must present a bearer token from an admin user OR the shared
// MIRROR_S01_TOKEN secret (bootstrap). Uses service role internally only.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bootstrap-token",
  "Content-Type": "application/json",
};
const MARKER_PREFIX = "mirrorS01:";

function pw() {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return "MS01!" + btoa(String.fromCharCode(...b)).replace(/[^A-Za-z0-9]/g, "").slice(0, 22);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const bootstrap = req.headers.get("x-bootstrap-token") ?? "";
    const shared = Deno.env.get("MIRROR_S01_TOKEN") ?? "";
    let authorized = false;
    if (shared && bootstrap && bootstrap === shared) authorized = true;
    if (!authorized && authHeader.startsWith("Bearer ")) {
      const asCaller = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await asCaller.auth.getUser();
      if (user) {
        const { data: role } = await admin.from("user_roles").select("role")
          .eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (role) authorized = true;
      }
    }
    if (!authorized) return new Response(JSON.stringify({ ok:false, error:"unauthorized" }), { status: 401, headers: cors });

    const body = await req.json().catch(() => ({}));
    const action = body.action as "provision" | "teardown" | "list";
    const runId = (body.run_id as string) || crypto.randomUUID();
    const marker = MARKER_PREFIX + runId;

    if (action === "list") {
      const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
      const rows = (data?.users ?? [])
        .filter(u => String(u.user_metadata?.fixture_marker ?? "").startsWith(MARKER_PREFIX))
        .map(u => ({ id: u.id, email: u.email, marker: u.user_metadata?.fixture_marker }));
      return new Response(JSON.stringify({ ok:true, fixtures: rows }), { headers: cors });
    }

    if (action === "teardown") {
      const targetMarker = (body.marker as string) || null;
      const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
      const victims = (data?.users ?? []).filter(u => {
        const m = String(u.user_metadata?.fixture_marker ?? "");
        if (!m.startsWith(MARKER_PREFIX)) return false;
        return targetMarker ? m === targetMarker : true;
      });
      const removed: string[] = [];
      for (const u of victims) {
        await admin.auth.admin.deleteUser(u.id);
        removed.push(u.id);
      }
      return new Response(JSON.stringify({ ok:true, removed_count: removed.length, removed }), { headers: cors });
    }

    if (action !== "provision") throw new Error("unknown action");

    async function make(kind: "admin" | "member") {
      const email = `mirror-s01-${kind}-${runId.slice(0,8)}@fixture.test`;
      const password = pw();
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { fixture_marker: marker, mirror_s01_kind: kind, full_name: `MirrorS01 ${kind}` },
      });
      if (error || !created.user) throw new Error(`create ${kind}: ${error?.message}`);
      const uid = created.user.id;
      await admin.from("profiles").upsert({ id: uid, email, full_name: `MirrorS01 ${kind}` });
      if (kind === "admin") {
        await admin.from("user_roles").insert({ user_id: uid, role: "admin" });
      }
      // sign in to obtain access token
      const anon = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
      const { data: sess, error: se } = await anon.auth.signInWithPassword({ email, password });
      if (se || !sess.session) throw new Error(`signin ${kind}: ${se?.message}`);
      return { kind, user_id: uid, email, password, access_token: sess.session.access_token };
    }

    const adminFx = await make("admin");
    const memberFx = await make("member");
    return new Response(JSON.stringify({ ok:true, marker, run_id: runId, admin: adminFx, member: memberFx }), { headers: cors });
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, error: String(e?.message ?? e) }), { status: 400, headers: cors });
  }
});
