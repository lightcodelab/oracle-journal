import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";
import { callGateway, flattenCardContent, GatewayError } from "../_shared/readingGateway.ts";
import { isRevelationCard, REVELATIONS_PROMPT } from "./rules.ts";

const MODEL = "openai/gpt-6-astra";
const schema = z.object({ readingId: z.string().uuid() });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let release: (() => Promise<void>) | undefined;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!url || !anon || !service || !key) return json({ error: "The reading service is unavailable." }, 500);
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Please sign in." }, 401);
    const client = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return json({ error: "Please sign in." }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "The reading is not valid." }, 400);
    const admin = createClient(url, service);
    const { data: record, error } = await admin.from("revelations_readings").select("*").eq("id", parsed.data.readingId).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!record) return json({ error: "Draw your card before revealing your reading." }, 404);
    if (record.generated_reading) return json({ reading: record.generated_reading, model: record.generated_reading_model });
    const [{ data: full }, { data: free }] = await Promise.all([
      admin.rpc("has_full_temple_access", { _user_id: user.id }),
      admin.rpc("has_free_spread_access", { _user_id: user.id }),
    ]);
    if (!full && !free) return json({ error: "Your introductory reading has already been used." }, 403);
    const { data: card, error: cardError } = await admin.from("cards").select("*, decks!inner(is_published)").eq("id", record.card_id).eq("decks.is_published", true).maybeSingle();
    if (cardError) throw cardError;
    if (!card || !isRevelationCard(card, record.card_id)) return json({ error: "Your Sacred Rewrite card is unavailable." }, 400);
    // Compare-and-set prevents parallel reveals from charging for duplicate generation.
    const started = new Date().toISOString();
    const { data: claimed, error: claimError } = await admin.from("revelations_readings")
      .update({ generation_started_at: started }).eq("id", record.id).is("generated_reading", null)
      .or(`generation_started_at.is.null,generation_started_at.lt.${new Date(Date.now() - 300000).toISOString()}`).select("id");
    if (claimError) throw claimError;
    if (!claimed?.length) return json({ error: "Your reading is being written. Please wait a moment, then try again." }, 409);
    release = async () => { await admin.from("revelations_readings").update({ generation_started_at: null }).eq("id", record.id).eq("generation_started_at", started); };
    const focus = record.guiding_question ? `Reader's question: ${JSON.stringify(record.guiding_question)}` : "No guiding question was supplied.";
    const reading = await callGateway(key, MODEL, REVELATIONS_PROMPT, `${focus}\n\nSacred Rewrite card:\n${flattenCardContent(card)}\n\nWrite their single-card Revelation.`);
    const { error: saveError } = await admin.rpc("complete_revelation", { _id: record.id, _reading: reading, _model: MODEL });
    if (saveError) throw saveError;
    release = undefined;
    return json({ reading, model: MODEL });
  } catch (error) {
    await release?.();
    console.error("Revelations generation failed", error instanceof Error ? error.name : "unknown");
    return json({ error: error instanceof GatewayError ? error.message : "Your reading could not be written. Please try again." }, error instanceof GatewayError ? error.status : 500);
  }
});