import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";

const MODEL = "openai/gpt-6-astra";
import { SACRED_SPREAD_PROMPT } from "../_shared/readingVoice.ts";
import { callGateway, flattenCardContent, GatewayError } from "../_shared/readingGateway.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const SPREADS: Record<string, { name: string; positions: string[] }> = {
  "past-present-future": { name: "Past, Present, Future", positions: ["Past", "Present", "Future"] },
  "daily-guidance": { name: "Daily Guidance", positions: ["Your Guidance"] },
  "mind-body-spirit": { name: "Mind, Body, Spirit", positions: ["Mind", "Body", "Spirit"] },
  "situation-challenge-advice": { name: "Situation, Challenge, Guidance", positions: ["Situation", "Challenge", "Guidance"] },
  "shadow-and-light": { name: "Shadow & Light", positions: ["Shadow", "Light"] },
  "inner-compass": { name: "The Inner Compass", positions: ["Release", "Nurture", "Trust", "Walk Toward"] },
};

const FREE_SPREAD_ID = "past-present-future";

const BodySchema = z.object({
  spreadType: z.string().min(1).max(80),
  cardIds: z.array(z.string().uuid()).min(1).max(4),
  guidingQuestion: z.string().trim().max(500).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !apiKey) return json({ error: "The reading service is not configured." }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in to create your reading." }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Please sign in to create your reading." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: hasAccess, error: accessError } = await admin.rpc("has_full_temple_access", { _user_id: user.id });
    if (accessError) throw accessError;

    // Free accounts get exactly one Past, Present, Future reading.
    let freeReading = false;
    if (!hasAccess) {
      const { data: freeAvailable, error: freeError } = await admin.rpc("has_free_spread_access", { _user_id: user.id });
      if (freeError) throw freeError;
      if (!freeAvailable) return json({ error: "An active membership is needed to create another Sacred Spread reading." }, 403);
      freeReading = true;
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "The selected spread is not valid." }, 400);
    const spread = SPREADS[parsed.data.spreadType];
    if (!spread || parsed.data.cardIds.length !== spread.positions.length || new Set(parsed.data.cardIds).size !== parsed.data.cardIds.length) {
      return json({ error: "The selected cards do not match this spread." }, 400);
    }
    if (freeReading && parsed.data.spreadType !== FREE_SPREAD_ID) {
      return json({ error: "This spread opens when you join THE TEMPLE." }, 403);
    }

    // Members read through their own client so draft decks stay admin-only;
    // the free reading is served by the service role against published decks.
    const cardQuery = freeReading
      ? admin.from("cards").select("*, decks!inner(name, is_published, is_starter)").eq("decks.is_published", true).eq("decks.is_starter", false).in("id", parsed.data.cardIds)
      : userClient.from("cards").select("*, decks(name)").in("id", parsed.data.cardIds);
    const { data: cards, error: cardsError } = await cardQuery;
    if (cardsError) throw cardsError;
    if (!cards || cards.length !== parsed.data.cardIds.length) return json({ error: "One or more selected cards could not be found." }, 400);
    const byId = new Map(cards.map((card: Record<string, unknown>) => [String(card.id), card]));
    const ordered = parsed.data.cardIds.map((id) => byId.get(id)).filter(Boolean) as Record<string, unknown>[];
    const cardsBlock = ordered.map((card, index) => {
      const deck = card.decks && typeof card.decks === "object"
        ? String((card.decks as Record<string, unknown>).name ?? card.deck_name ?? "Unknown deck")
        : String(card.deck_name ?? "Unknown deck");
      return `### ${spread.positions[index]}\nCard: "${String(card.card_title)}"\nDeck: ${deck}\n${flattenCardContent(card)}`;
    }).join("\n\n");

    const systemPrompt = SACRED_SPREAD_PROMPT;
    const focus = parsed.data.guidingQuestion?.trim();
    const focusBlock = focus ? `Reader's guiding question or focus: """${focus}"""\n\n` : "No guiding question was given.\n\n";
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const firstName = typeof profile?.full_name === "string" ? profile.full_name.trim().split(/\s+/)[0] : "";
    const nameBlock = firstName ? `Reader's first name (use exactly once, at the most poignant turn): ${firstName}\n\n` : "";
    const userPrompt = `Spread: ${spread.name}\n\n${nameBlock}${focusBlock}Cards in their exact spread order:\n\n${cardsBlock}\n\nWrite the complete shared card reading now.`;

    const reading = await callGateway(apiKey, MODEL, systemPrompt, userPrompt);

    if (freeReading) {
      // Stamp the single free reading so it cannot be repeated.
      await admin.from("profiles").update({ free_reading_used_at: new Date().toISOString() }).eq("id", user.id).is("free_reading_used_at", null);
    }

    return json({ reading, model: MODEL });
  } catch (error) {
    console.error("generate-sacred-spread-reading failed", error);
    if (error instanceof GatewayError) return json({ error: error.message }, error.status);
    return json({ error: error instanceof Error ? error.message : "The reading could not be written." }, 500);
  }
});