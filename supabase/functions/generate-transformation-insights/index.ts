import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check cache
    const { data: cache } = await service
      .from("transformation_insights_cache").select("*")
      .eq("user_id", user.id).maybeSingle();
    if (cache && new Date(cache.expires_at) > new Date()) {
      return json({ insight: cache.insight_text, cached: true });
    }

    // Pull last 30 days of entries with tool titles
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: entries } = await service
      .from("transformation_entries")
      .select("created_at, tool_id, scores_json, answers_json, transformation_tools(title, slug)")
      .eq("user_id", user.id).gte("created_at", since)
      .order("created_at", { ascending: false }).limit(60);

    if (!entries || entries.length < 2) {
      return json({ insight: "You are just beginning. Log a few more reflections and the patterns will start to speak." });
    }

    // Summarise (counts + trends), avoid raw text leakage
    const byTool: Record<string, { title: string; count: number; scores: number[] }> = {};
    for (const e of entries as any[]) {
      const title = e.transformation_tools?.title || "Unknown";
      const key = e.tool_id;
      if (!byTool[key]) byTool[key] = { title, count: 0, scores: [] };
      byTool[key].count++;
      if (typeof e.scores_json?.primary === "number") byTool[key].scores.push(e.scores_json.primary);
    }
    const summary = Object.values(byTool).map((t) => {
      const trend = t.scores.length >= 2
        ? `first ${t.scores[t.scores.length-1].toFixed(1)} → latest ${t.scores[0].toFixed(1)}`
        : t.scores.length === 1 ? `single score ${t.scores[0].toFixed(1)}` : "no scored entries";
      return `- ${t.title}: ${t.count} entries · ${trend}`;
    }).join("\n");

    const systemPrompt = `You write in the voice of The Sacred Rewrite: poetic but pragmatic, lowercase used sparingly, no spiritual-bypassing platitudes, never say "journey". You speak directly to the reader as if they are sitting across from you. You honour what is real, you do not flatter. Two short paragraphs maximum. Acknowledge a specific pattern they showed in the data. Name the direction of movement. End with one quiet, grounded sentence.`;

    const userPrompt = `Here is the user's last 30 days of Transformation Tool data:\n\n${summary}\n\nWrite a short, intimate reflection in The Sacred Rewrite voice. Two short paragraphs maximum. No greetings. No signoff.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      return json({ error: "ai failed", detail: t }, 500);
    }
    const aiJson = await aiResp.json();
    const insight = aiJson.choices?.[0]?.message?.content?.trim() || "";
    if (!insight) return json({ error: "empty insight" }, 500);

    await service.from("transformation_insights_cache").upsert({
      user_id: user.id,
      insight_text: insight,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    }, { onConflict: "user_id" });

    return json({ insight });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });