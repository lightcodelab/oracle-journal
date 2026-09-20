/**
 * Shared generation for the member-facing Remembrance Letters pilgrimage.
 *
 * Draws four cards for the month's theme, writes the letter in The Sacred
 * Rewrite voice, produces this month's small practices, stores the letter and
 * advances the member's pilgrimage. Server-side only.
 */

import { MONTH_THEMES } from "../remembranceThemes.ts";
import { sendTemplateEmail } from "../transactional-email-templates/send-email.ts";

const MODEL = "google/gemini-3.1-pro-preview";
const FALLBACK_MODEL = "google/gemini-3.8-flash";
const APP_ORIGIN = "https://inside.thetempleofsustainment.com";

export class GatewayBlockedError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "GatewayBlockedError";
  }
}

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
    "opening_invocation_content",
    "spiral_of_inquiry_content",
    "acknowledgement_content",
    "spiral_of_seeing_content",
    "living_inquiry_content",
    "embodiment_ritual_content",
    "benediction_content",
  ];
  for (const k of legacy) append(k, card[k]);
  return parts.join("\n\n").slice(0, 4000);
}

/**
 * Draws four cards. Every deck that holds cards is eligible, and each deck can
 * contribute at most one card, so a reading always spans the decks rather than
 * leaning on a single one. The month's deck weights only set the order in which
 * decks are visited, so the theme's primary decks tend to land as cards 1 and 2.
 */
async function drawCards(admin: any, deckWeights: Record<string, number>) {
  const { data: decks } = await admin.from("decks").select("id,name").eq("is_published", true);
  const deckMap: Record<string, string> = {};
  (decks ?? []).forEach((d: any) => (deckMap[d.name] = d.id));

  // Weighted shuffle over every deck: themed decks get their weight, all others 1.
  const deckOrder = Object.keys(deckMap)
    .map((name) => ({
      name,
      key: Math.random() / Math.max(0.0001, deckWeights[name] ?? 1),
    }))
    .sort((a, b) => a.key - b.key)
    .map((d) => d.name);

  const drawn: any[] = [];
  const usedIds = new Set<string>();

  for (const deckName of deckOrder) {
    if (drawn.length >= 4) break;
    const { data: deckCards } = await admin.from("cards").select("*").eq("deck_id", deckMap[deckName]);
    const available = (deckCards ?? []).filter((c: any) => !usedIds.has(c.id));
    if (available.length === 0) continue;
    const pick = available[Math.floor(Math.random() * available.length)];
    pick.deck_name = deckName;
    drawn.push(pick);
    usedIds.add(pick.id);
  }

  // Fewer decks than cards needed: top up from anywhere, still no repeats.
  if (drawn.length < 4) {
    const publishedDeckIds = Object.values(deckMap);
    const { data: anyCards } = publishedDeckIds.length > 0
      ? await admin.from("cards").select("*").in("deck_id", publishedDeckIds).limit(300)
      : { data: [] };
    const remaining = (anyCards ?? []).filter((c: any) => !usedIds.has(c.id));
    while (drawn.length < 4 && remaining.length > 0) {
      const pick = remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0];
      drawn.push(pick);
      usedIds.add(pick.id);
    }
  }
  return { drawn, deckMap };
}

async function callGateway(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 402 || res.status === 403) {
      throw new GatewayBlockedError(res.status, `AI gateway blocked [${res.status}]: ${body}`);
    }
    throw new Error(`AI gateway error [${res.status}]: ${body}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

function parsePractices(raw: string): { letter: string; practices: string[] } {
  const marker = /^\s*PRACTICES\s*:?\s*$/im;
  const idx = raw.search(marker);
  if (idx === -1) return { letter: raw.trim(), practices: [] };
  const letter = raw.slice(0, idx).trim();
  const rest = raw.slice(idx).replace(marker, "").trim();
  const practices = rest
    .split("\n")
    .map((l) => l.replace(/^\s*[-*\d.)\u2022]+\s*/, "").trim())
    .filter((l) => l.length > 2)
    .slice(0, 5);
  return { letter, practices };
}

/**
 * Generates and stores the member's next letter. Returns the stored row, or
 * null when the member already has that month's letter.
 */
export async function generateRemembranceLetter(
  admin: any,
  userId: string,
): Promise<{ letter: any; alreadyExisted: boolean }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const { data: pilgrim } = await admin
    .from("remembrance_pilgrims")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!pilgrim) throw new Error("Not part of the pilgrimage");
  if (pilgrim.status !== "active") throw new Error(`Pilgrimage is ${pilgrim.status}`);

  const month = Number(pilgrim.current_month) + 1;
  if (month > 12) {
    await admin
      .from("remembrance_pilgrims")
      .update({ status: "completed", next_letter_due_at: null })
      .eq("id", pilgrim.id);
    throw new Error("Pilgrimage complete");
  }

  const { data: existing } = await admin
    .from("remembrance_letters")
    .select("*")
    .eq("user_id", userId)
    .eq("month_number", month)
    .maybeSingle();
  if (existing) return { letter: existing, alreadyExisted: true };

  const theme = MONTH_THEMES[month];
  if (!theme) throw new Error("Invalid month");

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) console.error("profile lookup failed:", profileError);
  const rawName: string = profile?.full_name || "";
  const firstName = rawName.trim().split(/\s+/)[0] || "friend";

  const { drawn, deckMap } = await drawCards(admin, theme.deckWeights);

  const { data: priorLetters } = await admin
    .from("remembrance_letters")
    .select("month_number, theme")
    .eq("user_id", userId)
    .order("month_number", { ascending: true });

  // Tone exemplars from The Sacred Rewrite
  let toneExemplars = "";
  const sacredId = deckMap["The Sacred Rewrite"];
  if (sacredId) {
    const { data: srCards } = await admin.from("cards").select("*").eq("deck_id", sacredId).limit(50);
    if (srCards && srCards.length > 0) {
      const shuffled = [...srCards].sort(() => Math.random() - 0.5).slice(0, 3);
      toneExemplars = shuffled.map((c: any) => flattenCardContent(c)).join("\n\n---\n\n").slice(0, 6000);
    }
  }

  const cardsBlock = drawn
    .map(
      (c, i) =>
        `### Card ${i + 1}: "${c.card_title}" — ${c.deck_name} (Card ${c.card_number})\n${flattenCardContent(c)}`,
    )
    .join("\n\n");

  const priorBlock = (priorLetters ?? []).length > 0
    ? `\n\nPRIOR LETTERS TO THIS PERSON (for continuity — reference subtly if relevant, especially in Month 12):\n${(priorLetters ?? [])
        .map((l: any) => `Month ${l.month_number} — ${l.theme}`)
        .join("\n")}`
    : "";

  const systemPrompt = `You are writing "The Remembrance Letters" — a personal letter read privately inside THE TEMPLE of Sustainment by a soul seeker walking a twelve-month Sacred Undoing pilgrimage. You write in the voice and tone of The Sacred Rewrite card deck: poetic but pragmatic, tender but never saccharine, lowercase used sparingly for intimacy, never the word "journey", never spiritual-bypassing platitudes. You write like a wise older sister who has done the work.

TONE EXEMPLARS — study this voice carefully and inhabit it:
${toneExemplars}

STRUCTURE OF THE LETTER (must hit every element, ~800 words total):
1. Salutation: "Dear ${firstName},"
2. Opening that disarms — a universal-specific moment (bathroom mirror, unfinished conversation, the moment after applause). 2-3 sentences.
3. Card 1 reveal — names the wound/theme. Reference the card by its exact title, in the order given.
4. Card 2 reveal — reframes the past. Exact title, in order.
5. Card 3 reveal — pragmatic daily practice they can actually do this month. Exact title, in order.
6. Card 4 reveal — one intention/action. Exact title, in order.
7. Synthesis paragraph — weave all 4 cards into one story specific to this month's theme.
8. Embodiment ritual — sensory, physical, doable this week.
9. Tender sign-off — "With you, / The Remembrance Letters" or a similar variation.
10. P.S. — the line that makes them cry on second read. ONE sentence. End it by pointing them gently to the three journalling questions waiting beneath this letter.

AFTER the letter, output a line containing only the word PRACTICES: followed by 3 to 5 short practices for this month, one per line, no numbering. Draw them from this person's four cards. Include at least one written prompt, at least one physical or sensory practice, and one single sentence to carry as a reminder. Each practice is one sentence, plain and doable.

RULES:
- Use the recipient's first name 2-3 times max, always tenderly.
- Never use "journey", "manifest", "high vibe", "your truth", "trust the process".
- Forbidden: "Altar Rituals".
- CARD ACCURACY IS CRITICAL: use only the four cards given below, with their exact titles, in the exact order given, and never invent a card. When you name the deck a card comes from, use exactly the deck named with that card — never attribute a card to a deck it does not belong to.
- Write AreekeerA® with the registered trademark symbol whenever you name that deck (its full name is the AreekeerA Energy Medicine deck), and only when a card genuinely comes from it.
- Do not use markdown emphasis such as *asterisks*; name card titles in plain text.
- Refer to the space as THE TEMPLE.
- Avoid generic affirmations. Specificity = intimacy.
- Output ONLY the letter body then the PRACTICES block. No preamble, no markdown headers, no meta-commentary.`;

  const userPrompt = `Write Month ${month} of 12: "${theme.title}"
Emotional movement: ${theme.emotion}
Recipient first name: ${firstName}

The 4 cards drawn for this letter:

${cardsBlock}${priorBlock}

Write the full ~800 word letter now, then the PRACTICES block.`;

  let modelUsed = MODEL;
  let raw: string;
  try {
    raw = await callGateway(apiKey, MODEL, systemPrompt, userPrompt);
  } catch (e) {
    if (e instanceof GatewayBlockedError) throw e;
    modelUsed = FALLBACK_MODEL;
    raw = await callGateway(apiKey, FALLBACK_MODEL, systemPrompt, userPrompt);
  }
  if (!raw || raw.trim().length < 200) throw new Error("Letter generation returned no usable text");

  const { letter: letterText, practices } = parsePractices(raw);

  const cardSnapshot = drawn.map((c) => ({
    id: c.id,
    card_title: c.card_title,
    card_number: c.card_number,
    deck_name: c.deck_name,
    image_file_name: c.image_file_name,
  }));

  const { data: inserted, error: insertError } = await admin
    .from("remembrance_letters")
    .insert({
      user_id: userId,
      month_number: month,
      theme: theme.title,
      card_ids: drawn.map((c) => c.id),
      card_snapshot: cardSnapshot,
      content: letterText,
      practices,
      model_used: modelUsed,
    })
    .select()
    .single();

  if (insertError) {
    // Unique violation means a concurrent run already wrote this month.
    if ((insertError as any).code === "23505") {
      const { data: raced } = await admin
        .from("remembrance_letters")
        .select("*")
        .eq("user_id", userId)
        .eq("month_number", month)
        .maybeSingle();
      if (raced) return { letter: raced, alreadyExisted: true };
    }
    throw insertError;
  }

  const nextDue = month >= 12
    ? null
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await admin
    .from("remembrance_pilgrims")
    .update({
      current_month: month,
      next_letter_due_at: nextDue,
      status: month >= 12 ? "completed" : "active",
    })
    .eq("id", pilgrim.id);

  // Announce the letter. A failure here must not lose the letter itself.
  const recipient = profile?.email;
  if (!recipient) {
    console.error("no email address on file for", userId, "- letter saved without notification");
  }
  if (recipient) {
    try {
      const result = await sendTemplateEmail("remembrance-letter-ready", recipient, {
        templateData: {
          name: firstName,
          monthNumber: month,
          themeTitle: theme.shortTitle,
          themeQuestion: theme.title,
          letterUrl: `${APP_ORIGIN}/remembrance-letters`,
        },
        idempotencyKey: `remembrance-letter-${userId}-${month}`,
      });
      if (result.sent) {
        await admin
          .from("remembrance_letters")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", inserted.id);
      } else {
        console.log("letter email skipped:", result.reason);
      }
    } catch (e) {
      console.error("remembrance letter email failed:", e);
    }
  }

  return { letter: inserted, alreadyExisted: false };
}
