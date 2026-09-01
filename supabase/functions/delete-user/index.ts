// Admin-only user deletion. Deletes an auth user by email, cascading to
// profiles, roles, grants and related rows. Refuses to delete admins or the
// caller's own account.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

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
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("email required");

    // Find the target user.
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const target = (list?.users ?? []).find(
      (u) => String(u.email ?? "").toLowerCase() === email,
    );
    if (!target) throw new Error("user not found");
    if (target.id === caller.id) throw new Error("cannot delete yourself");

    // Never delete an admin account through this path.
    const { data: targetRole } = await admin
      .from("user_roles").select("role")
      .eq("user_id", target.id).eq("role", "admin").maybeSingle();
    if (targetRole) throw new Error("cannot delete an admin account");

    const { error } = await admin.auth.admin.deleteUser(target.id);
    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, deleted: { id: target.id, email: target.email } }),
      { headers: cors },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), {
      status: 400,
      headers: cors,
    });
  }
});
