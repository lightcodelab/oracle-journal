// Removes accounts that never reached payment after a grace period.
// Scheduled daily. Protected by the shared internal secret header.
// Skips admins, affiliates, anyone with a subscription, entitlement,
// manual grant, deck purchase or Stripe customer record.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-notify-secret",
  "Content-Type": "application/json",
};

const DEFAULT_GRACE_DAYS = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const expected = Deno.env.get("ADMIN_NOTIFY_SECRET");
    const provided = req.headers.get("x-admin-notify-secret");
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ ok: false, error: "not authorised" }), {
        status: 401,
        headers: cors,
      });
    }

    const body = await req.json().catch(() => ({}));
    const graceDays = Number.isFinite(Number(body?.grace_days))
      ? Math.max(1, Math.floor(Number(body.grace_days)))
      : DEFAULT_GRACE_DAYS;
    const dryRun = body?.dry_run === true;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: candidates, error } = await admin.rpc("find_unpaid_accounts", {
      _older_than_days: graceDays,
    });
    if (error) throw error;

    const rows = (candidates ?? []) as Array<{
      user_id: string;
      email: string | null;
      created_at: string;
    }>;

    if (dryRun) {
      return new Response(
        JSON.stringify({ ok: true, dry_run: true, grace_days: graceDays, candidates: rows.length }),
        { headers: cors },
      );
    }

    let removed = 0;
    const failures: Array<{ user_id: string; error: string }> = [];

    for (const row of rows) {
      const { error: delError } = await admin.auth.admin.deleteUser(row.user_id);
      if (delError) {
        failures.push({ user_id: row.user_id, error: delError.message });
        continue;
      }
      removed += 1;
      await admin.from("unpaid_account_purges").insert({
        user_id: row.user_id,
        email: row.email,
        account_created_at: row.created_at,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, grace_days: graceDays, candidates: rows.length, removed, failures }),
      { headers: cors },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), {
      status: 400,
      headers: cors,
    });
  }
});
