import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { generateRemembranceLetter, GatewayBlockedError } from "../_shared/remembrance/letter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-notify-secret",
};

const JOB_NAME = "remembrance-letters";
const BATCH_SIZE = 15;
const LEASE_MINUTES = 10;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("ADMIN_NOTIFY_SECRET");
  if (!secret || req.headers.get("x-admin-notify-secret") !== secret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const resume = body?.resume === true;
    const now = new Date();

    const { data: state } = await admin
      .from("remembrance_job_state")
      .select("*")
      .eq("job_name", JOB_NAME)
      .maybeSingle();

    if (resume && state?.paused_reason) {
      await admin
        .from("remembrance_job_state")
        .update({ paused_reason: null, paused_at: null, updated_at: now.toISOString() })
        .eq("job_name", JOB_NAME);
      return json({ resumed: true });
    }

    // Circuit breaker: while paused, process at most one probe member per run.
    const paused = Boolean(state?.paused_reason);

    // Single-flight lease.
    const leaseHeld = state?.locked_until && new Date(state.locked_until).getTime() > now.getTime();
    if (leaseHeld) return json({ skipped: "another run holds the lease" });

    const lockedUntil = new Date(now.getTime() + LEASE_MINUTES * 60 * 1000).toISOString();
    await admin.from("remembrance_job_state").upsert(
      {
        job_name: JOB_NAME,
        locked_until: lockedUntil,
        last_run_at: now.toISOString(),
        paused_reason: state?.paused_reason ?? null,
        paused_at: state?.paused_at ?? null,
        updated_at: now.toISOString(),
      },
      { onConflict: "job_name" },
    );

    const limit = paused ? 1 : BATCH_SIZE;
    const { data: due } = await admin
      .from("remembrance_pilgrims")
      .select("user_id, current_month, next_letter_due_at")
      .eq("status", "active")
      .not("next_letter_due_at", "is", null)
      .lte("next_letter_due_at", now.toISOString())
      .order("next_letter_due_at", { ascending: true })
      .limit(limit);

    let generated = 0;
    let skipped = 0;
    const failures: string[] = [];
    let newPause: string | null = null;

    for (const pilgrim of due ?? []) {
      // Membership may have lapsed since they joined.
      const { data: hasAccess } = await admin.rpc("has_full_temple_access", {
        _user_id: pilgrim.user_id,
      });
      if (!hasAccess) {
        await admin
          .from("remembrance_pilgrims")
          .update({ status: "paused", paused_reason: "membership_inactive" })
          .eq("user_id", pilgrim.user_id);
        skipped++;
        continue;
      }

      try {
        const result = await generateRemembranceLetter(admin, pilgrim.user_id);
        if (result.alreadyExisted) skipped++;
        else generated++;
      } catch (e) {
        if (e instanceof GatewayBlockedError) {
          newPause = `gateway_${e.status}`;
          failures.push(e.message);
          break;
        }
        console.error("letter generation failed for", pilgrim.user_id, e);
        failures.push(e instanceof Error ? e.message : String(e));
      }
    }

    const result = { generated, skipped, failures, paused_before: paused, pause: newPause };

    await admin
      .from("remembrance_job_state")
      .update({
        locked_until: null,
        last_result: result,
        paused_reason: newPause ?? (generated > 0 ? null : state?.paused_reason ?? null),
        paused_at: newPause ? now.toISOString() : generated > 0 ? null : state?.paused_at ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("job_name", JOB_NAME);

    return json(result);
  } catch (e) {
    console.error("run-remembrance-letters error:", e);
    await admin
      .from("remembrance_job_state")
      .update({ locked_until: null, updated_at: new Date().toISOString() })
      .eq("job_name", JOB_NAME);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
