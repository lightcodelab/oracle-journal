import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";

const MODEL = "openai/gpt-6-astra";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";

const SPREADS: Record<string, { name: string; positions: string[] }> = {
  "past-present-future": { name: "Past, Present, Future", positions: ["Past", "Present", "Future"] },
  "daily-guidance": { name: "Daily Guidance", positions: ["Your Guidance"] },
  "mind-body-spirit": { name: "Mind, Body, Spirit", positions: ["Mind", "Body", "Spirit"] },
  "situation-challenge-advice": { name: "Situation, Challenge, Guidance", positions: ["Situation", "Challenge", "Guidance"] },
  "shadow-and-light": { name: "Shadow & Light", positions: ["Shadow", "Light"] },
  "inner-compass": { name: "The Inner Compass", positions: ["Release", "Nurture", "Trust", "Walk Toward"] },
};

const BodySchema = z.object({
  spreadType: z.string().min(1).max(80),
  cardIds: z.array(z.string().uuid()).min(1).max(4),
});

class GatewayError extends Error {
  status: number;
  retryable: boolean;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function flattenCardContent(card: Record<string, unknown>): string {
  const parts: string[] = [];
  const append = (label: string, value: unknown) => {
    if (!value) return;
    parts.push(`${label}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
  };
  append("Title", card.card_title);
  append("Details", card.card_details);
  if (card.content_sections && typeof card.content_sections === "object") {
    for (const [key, value] of Object.entries(card.content_sections)) append(key, value);
  }
  for (const key of [
    "opening_invocation_content", "spiral_of_inquiry_content", "acknowledgement_content",
    "spiral_of_seeing_content", "living_inquiry_content", "embodiment_ritual_content",
    "benediction_content",
  ]) append(key, card[key]);
  return parts.join("\n\n").slice(0, 4000);
}

function gatewayMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (record.error && typeof record.error === "object") {
    const message = (record.error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

async function delayForRetry(response: Response, attempt: number) {
  const retryAfter = Number(response.headers.get("Retry-After"));
  const milliseconds = Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter * 1000
    : Math.min(1000 * 2 ** attempt + Math.random() * 500, 5000);
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function callGateway(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model,
        stream: true,
        instructions: systemPrompt,
        input: userPrompt,
        reasoning: { effort: "medium", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      let payload: unknown;
      try { payload = JSON.parse(raw); } catch { payload = null; }
      const error = new GatewayError(response.status, gatewayMessage(payload, raw || "The reading could not be written."));
      if (error.retryable && attempt < 2) {
        await delayForRetry(response, attempt);
        continue;
      }
      throw error;
    }

    if (!response.body) throw new GatewayError(500, "The reading returned no content.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const event = JSON.parse(data);
          if (event.type === "response.output_text.delta") text += event.delta ?? "";
        } catch {
          // Provider metadata and incomplete events do not contain answer text.
        }
      }
    }
    if (text.trim().length < 160) throw new GatewayError(500, "The reading returned no usable content.");
    return text.trim();
  }
  throw new GatewayError(500, "The reading could not be written.");
}

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
    if (!hasAccess) return json({ error: "An active membership is needed to create a Sacred Spread reading." }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "The selected spread is not valid." }, 400);
    const spread = SPREADS[parsed.data.spreadType];
    if (!spread || parsed.data.cardIds.length !== spread.positions.length || new Set(parsed.data.cardIds).size !== parsed.data.cardIds.length) {
      return json({ error: "The selected cards do not match this spread." }, 400);
    }

    // Read through the member-scoped client so draft decks remain admin-only.
    const { data: cards, error: cardsError } = await userClient.from("cards").select("*, decks(name)").in("id", parsed.data.cardIds);
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

    const systemPrompt = `You write private Sacred Spread readings for members of THE TEMPLE. Your voice is grounded, intimate and discerning: poetic but pragmatic, tender without being saccharine, like a wise older sister who has done the work. Never diagnose, predict fixed outcomes, frighten, flatter, or use spiritual-bypassing platitudes.

Write one cohesive reading of approximately 450–650 words. Find the strongest common thread across the full selection. Begin by naming that shared thread in a way that helps the reader feel accurately seen. Then weave every card into that one thread according to its spread position, using each exact card title once. Do not produce isolated mini-readings or a list. Notice tensions, repetitions and movement between the positions. End with one grounded invitation the reader can carry into daily life.

Rules:
- Use only the supplied cards, exact titles and positions. Never invent or misattribute a card.
- Do not introduce a monthly theme, pilgrimage, zodiac, future certainty, or outside interpretation.
- Never use “journey”, “manifest”, “high vibe”, “your truth”, or “trust the process”.
- Never use the forbidden phrase “Altar Rituals”.
- Write AreekeerA® whenever naming that deck.
- Do not use markdown headers, bullet lists, asterisks, greetings, or sign-offs.
- Refer to this space as THE TEMPLE.
- Output only the reading.`;
    const userPrompt = `Spread: ${spread.name}\n\nCards in their exact spread order:\n\n${cardsBlock}\n\nWrite the complete shared card reading now.`;

    const reading = await callGateway(apiKey, MODEL, systemPrompt, userPrompt);
    return json({ reading, model: MODEL });
  } catch (error) {
    console.error("generate-sacred-spread-reading failed", error);
    if (error instanceof GatewayError) return json({ error: error.message }, error.status);
    return json({ error: error instanceof Error ? error.message : "The reading could not be written." }, 500);
  }
});