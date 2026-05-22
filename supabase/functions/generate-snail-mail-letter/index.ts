import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MONTH_THEMES: Record<number, { title: string; emotion: string; deckWeights: Record<string, number> }> = {
  1:  { title: "The Echo — Who have you been performing?", emotion: "Recognition of the false self", deckWeights: { "The Sacred Rewrite": 3, "AreekeerA": 2 } },
  2:  { title: "The Inheritance — What did you carry that was never yours?", emotion: "Ancestral patterns", deckWeights: { "AreekeerA": 3, "Magic not Logic": 2 } },
  3:  { title: "The Body Remembers — Where does the story live in you?", emotion: "Somatic awareness", deckWeights: { "The Art of Self-Healing": 3, "AreekeerA": 2 } },
  4:  { title: "The Threshold — What are you ready to release?", emotion: "Letting go", deckWeights: { "The Sacred Rewrite": 3, "Magic not Logic": 2 } },
  5:  { title: "The Soft Animal — How do you come home to yourself?", emotion: "Self-tenderness", deckWeights: { "The Art of Self-Healing": 3, "The Sacred Rewrite": 2 } },
  6:  { title: "The Midpoint Mirror — Halfway. What's shifting?", emotion: "Reflection + recalibration", deckWeights: { "The Sacred Rewrite": 2, "AreekeerA": 2, "Magic not Logic": 2, "The Art of Self-Healing": 2 } },
  7:  { title: "The Voice — What have you been afraid to say?", emotion: "Truth-telling", deckWeights: { "Magic not Logic": 3, "The Sacred Rewrite": 2 } },
  8:  { title: "The Boundary — Where does your yes live? Your no?", emotion: "Sovereignty", deckWeights: { "AreekeerA": 3, "The Art of Self-Healing": 2 } },
  9:  { title: "The Longing — What is your heart actually asking for?", emotion: "Desire as compass", deckWeights: { "Magic not Logic": 3, "The Sacred Rewrite": 2 } },
  10: { title: "The Offering — What are you here to give?", emotion: "Purpose", deckWeights: { "AreekeerA": 3, "Magic not Logic": 2 } },
  11: { title: "The Gratitude — What has held you?", emotion: "Receiving + reverence", deckWeights: { "The Sacred Rewrite": 2, "AreekeerA": 2, "Magic not Logic": 2, "The Art of Self-Healing": 2 } },
  12: { title: "The Becoming — Who are you now?", emotion: "Integration + benediction", deckWeights: { "The Sacred Rewrite": 3, "AreekeerA": 2, "Magic not Logic": 1, "The Art of Self-Healing": 1 } },
};

function flattenCardContent(card: any): string {
  const parts: string[] = [];
  const append = (label: string, val: any) => {
    if (!val) return;
    if (typeof val === "string") parts.push(`${label}: ${val}`);
    else if (typeof val === "object") parts.push(`${label}: ${JSON.stringify(val)}`);
  };
  append("Title", card.card_title);
  append("Details", card.card_details);
  if (card.content_sections && typeof card.content_sections === "object") {
    for (const [k, v] of Object.entries(card.content_sections)) append(k, v);
  }
  const legacy = [
    "opening_invocation_content","spiral_of_inquiry_content","acknowledgement_content",
    "spiral_of_seeing_content","living_inquiry_content","embodiment_ritual_content","benediction_content",
  ];
  for (const k of legacy) append(k, card[k]);
  return parts.join("\n\n").slice(0, 4000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { subscriber_id, month_number } = await req.json();
    if (!subscriber_id || !month_number) {
      return new Response(JSON.stringify({ error: "subscriber_id and month_number required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const month = Number(month_number);
    const theme = MONTH_THEMES[month];
    if (!theme) throw new Error("Invalid month_number");

    const { data: subscriber } = await admin.from("snail_mail_subscribers").select("*").eq("id", subscriber_id).single();
    if (!subscriber) throw new Error("Subscriber not found");

    // Fetch decks
    const { data: decks } = await admin.from("decks").select("id,name");
    const deckMap: Record<string, string> = {};
    (decks ?? []).forEach((d: any) => deckMap[d.name] = d.id);

    // Weighted draw of 4 cards
    const drawn: any[] = [];
    const usedIds = new Set<string>();
    const weightedDecks = Object.entries(theme.deckWeights)
      .flatMap(([name, w]) => Array(w).fill(name))
      .filter(name => deckMap[name]);

    for (let i = 0; i < 4 && weightedDecks.length > 0; i++) {
      const deckName = weightedDecks[Math.floor(Math.random() * weightedDecks.length)];
      const deckId = deckMap[deckName];
      const { data: deckCards } = await admin.from("cards").select("*").eq("deck_id", deckId);
      const available = (deckCards ?? []).filter((c: any) => !usedIds.has(c.id));
      if (available.length === 0) continue;
      const pick = available[Math.floor(Math.random() * available.length)];
      pick.deck_name = deckName;
      drawn.push(pick);
      usedIds.add(pick.id);
    }
    // Top up from any deck if short
    if (drawn.length < 4) {
      const { data: anyCards } = await admin.from("cards").select("*").limit(200);
      const remaining = (anyCards ?? []).filter((c: any) => !usedIds.has(c.id));
      while (drawn.length < 4 && remaining.length > 0) {
        const pick = remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0];
        drawn.push(pick);
        usedIds.add(pick.id);
      }
    }

    // Previous letters for callback context
    const { data: priorLetters } = await admin.from("snail_mail_letters")
      .select("month_number, theme, card_snapshot, final_content")
      .eq("subscriber_id", subscriber_id)
      .order("month_number", { ascending: true });

    // Tone exemplars from Sacred Rewrite (random 3 cards)
    const sacredId = deckMap["The Sacred Rewrite"];
    let toneExemplars = "";
    if (sacredId) {
      const { data: srCards } = await admin.from("cards").select("*").eq("deck_id", sacredId).limit(50);
      if (srCards && srCards.length > 0) {
        const shuffled = [...srCards].sort(() => Math.random() - 0.5).slice(0, 3);
        toneExemplars = shuffled.map((c: any) => flattenCardContent(c)).join("\n\n---\n\n").slice(0, 6000);
      }
    }

    const cardsBlock = drawn.map((c, i) =>
      `### Card ${i + 1}: "${c.card_title}" — ${c.deck_name} (Card ${c.card_number})\n${flattenCardContent(c)}`
    ).join("\n\n");

    const priorBlock = (priorLetters ?? []).length > 0
      ? `\n\nPRIOR LETTERS TO THIS PERSON (for continuity — reference subtly if relevant, especially in Month 12):\n${(priorLetters ?? []).map((l: any) => `Month ${l.month_number} — ${l.theme}`).join("\n")}`
      : "";

    const systemPrompt = `You are writing "The Remembrance Letters" — a personal, handwritten-style letter sent by physical mail to a soul seeker. You write in the voice and tone of The Sacred Rewrite card deck: poetic but pragmatic, tender but never saccharine, lowercase used sparingly for intimacy, never the word "journey", never spiritual-bypassing platitudes. You write like a wise older sister who has done the work.

TONE EXEMPLARS — study this voice carefully and inhabit it:
${toneExemplars}

STRUCTURE (must hit every element, ~800 words total):
1. Salutation: "Dear ${subscriber.full_name.split(" ")[0]}," (use first name)
2. Opening that disarms — a universal-specific moment (bathroom mirror, unfinished conversation, the moment after applause). 2-3 sentences.
3. Card 1 reveal — names the wound/theme. Reference card by title.
4. Card 2 reveal — reframes the past.
5. Card 3 reveal — pragmatic daily practice they can actually do this month.
6. Card 4 reveal — one intention/action.
7. Synthesis paragraph — weave all 4 cards into one story specific to this month's theme.
8. Embodiment ritual — sensory, physical, doable this week.
9. Tender sign-off — "With you, / The Remembrance Letters" or similar variation.
10. P.S. — the line that makes them cry on second read. ONE sentence.

RULES:
- Use the recipient's first name 2-3 times max, always tenderly.
- Never use "journey", "manifest", "high vibe", "your truth", "trust the process".
- Forbidden: "Altar Rituals".
- Always write AreekeerA® with the registered trademark symbol when naming the deck.
- Avoid generic affirmations. Specificity = intimacy.
- Output ONLY the letter body. No preamble, no markdown headers, no meta-commentary.`;

    const userPrompt = `Write Month ${month} of 12: "${theme.title}"
Emotional movement: ${theme.emotion}
Recipient first name: ${subscriber.full_name.split(" ")[0]}

The 4 cards drawn for this letter:

${cardsBlock}${priorBlock}

Write the full ~800 word letter now.`;

    const model = "google/gemini-2.5-pro";
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Top up at Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error ${aiResp.status}: ${t}`);
    }
    const aiJson = await aiResp.json();
    const draftContent: string = aiJson.choices?.[0]?.message?.content ?? "";

    const cardSnapshot = drawn.map(c => ({
      id: c.id, title: c.card_title, deck: c.deck_name, card_number: c.card_number,
    }));

    // Upsert letter (one row per subscriber+month)
    const { data: existing } = await admin.from("snail_mail_letters")
      .select("id").eq("subscriber_id", subscriber_id).eq("month_number", month).maybeSingle();

    let letterRow;
    if (existing) {
      const { data, error } = await admin.from("snail_mail_letters")
        .update({
          theme: theme.title, card_ids: drawn.map(c => c.id),
          card_snapshot: cardSnapshot, draft_content: draftContent,
          status: "draft", model_used: model, generated_at: new Date().toISOString(),
        }).eq("id", existing.id).select().single();
      if (error) throw error;
      letterRow = data;
    } else {
      const { data, error } = await admin.from("snail_mail_letters").insert({
        subscriber_id, month_number: month, theme: theme.title,
        card_ids: drawn.map(c => c.id), card_snapshot: cardSnapshot,
        draft_content: draftContent, status: "draft", model_used: model,
      }).select().single();
      if (error) throw error;
      letterRow = data;
    }

    return new Response(JSON.stringify({ letter: letterRow, cards: cardSnapshot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-snail-mail-letter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});