// Admin-only Sandbox event replay. Retrieves each event ID from the
// Stripe Test API, generates a valid Test signature using the Test
// signing secret, and POSTs the authentic payload to the deployed
// stripe-webhook endpoint. This exercises the full webhook lifecycle
// (reserve → process → complete/fail) with real signatures. Refuses
// to touch anything Live: only Test signing/env is used, and the
// helper `admin_reset_test_webhook_event` refuses Live ledger rows.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const STRIPE_TEST_KEY = Deno.env.get("STRIPE_SECRET_KEY_TEST") ?? "";
const STRIPE_TEST_WEBHOOK_SECRET =
  Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    if (!STRIPE_TEST_KEY || !STRIPE_TEST_WEBHOOK_SECRET) {
      throw new Error("Test Stripe keys/secret not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const userClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!user) throw new Error("Unauthorized");

    const admin = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: role } = await admin.from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Admin required");

    const { event_ids, reset } = await req.json().catch(() => ({}));
    if (!Array.isArray(event_ids) || event_ids.length === 0) {
      throw new Error("event_ids[] required");
    }

    const stripe = new Stripe(STRIPE_TEST_KEY, { apiVersion: "2023-10-16" });
    const webhookUrl = `${SUPABASE_URL}/functions/v1/stripe-webhook`;

    // Retrieve authentic Test events from Stripe (no payload edits).
    type EvRow = { id: string; created: number; event: Stripe.Event };
    const events: EvRow[] = [];
    for (const id of event_ids as string[]) {
      const ev = await stripe.events.retrieve(id);
      if (ev.livemode) throw new Error(`refusing: ${id} is livemode=true`);
      events.push({ id: ev.id, created: ev.created, event: ev });
    }
    events.sort((a, b) => a.created - b.created);

    // Optionally reset (delete) each Test ledger row so the fixed
    // webhook can reprocess them. Only touches Test rows.
    const resetResults: unknown[] = [];
    if (reset) {
      for (const { id } of events) {
        const { data, error } = await admin.rpc(
          "admin_reset_test_webhook_event",
          { _event_id: id },
        );
        resetResults.push({ id, data, error: error?.message ?? null });
      }
    }

    // Replay in chronological order.
    const replayResults: unknown[] = [];
    for (const { id, event } of events) {
      const payload = JSON.stringify(event);
      const header = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: STRIPE_TEST_WEBHOOK_SECRET,
        timestamp: Math.floor(Date.now() / 1000),
      });
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": header,
        },
        body: payload,
      });
      const text = await res.text();
      replayResults.push({ id, status: res.status, body: text.slice(0, 300) });
    }

    return new Response(
      JSON.stringify({ reset: resetResults, replay: replayResults }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});