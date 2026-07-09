import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAILERLITE_API = "https://api.mailerlite.com/api/v2";

interface SubmitBody {
  quiz_id: string;
  answers: Record<string, string>; // question_id -> option_id
  name?: string;
  email?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as SubmitBody;
    if (!body?.quiz_id || !body?.answers || typeof body.answers !== "object") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load quiz
    const { data: quiz, error: quizErr } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", body.quiz_id)
      .eq("status", "published")
      .maybeSingle();
    if (quizErr || !quiz) {
      return new Response(JSON.stringify({ error: "Quiz not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (quiz.require_email && (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load options selected — compute tally server-side
    const optionIds = Object.values(body.answers).filter(Boolean);
    const { data: options } = await supabase
      .from("quiz_options")
      .select("id, result_id, question_id")
      .in("id", optionIds.length ? optionIds : ["00000000-0000-0000-0000-000000000000"]);

    const tally: Record<string, number> = {};
    for (const opt of options ?? []) {
      if (opt.result_id) tally[opt.result_id] = (tally[opt.result_id] || 0) + 1;
    }

    const { data: results } = await supabase
      .from("quiz_results")
      .select("*")
      .eq("quiz_id", quiz.id)
      .order("position");

    let winner = null as null | typeof results extends (infer T)[] ? T : never;
    let bestCount = -1;
    for (const r of results ?? []) {
      const c = tally[r.id] || 0;
      if (c > bestCount) {
        winner = r as any;
        bestCount = c;
      }
    }
    if (!winner && results && results.length > 0) winner = results[0] as any;

    // Insert response
    const { data: response, error: respErr } = await supabase
      .from("quiz_responses")
      .insert({
        quiz_id: quiz.id,
        result_id: winner?.id ?? null,
        name: body.name ?? null,
        email: body.email ?? null,
        answers: body.answers,
        completed: true,
      })
      .select()
      .single();
    if (respErr) throw respErr;

    await supabase.from("quiz_events").insert([
      { quiz_id: quiz.id, event_type: "complete" },
      ...(body.email ? [{ quiz_id: quiz.id, event_type: "optin" }] : []),
    ]);

    // Push to MailerLite (best-effort)
    if (body.email) {
      const apiKey = Deno.env.get("MAILERLITE_API_KEY");
      const groupId = quiz.mailerlite_group_id || Deno.env.get("MAILERLITE_GROUP_ID");
      if (apiKey && groupId) {
        try {
          const res = await fetch(`${MAILERLITE_API}/groups/${groupId}/subscribers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-MailerLite-ApiKey": apiKey,
            },
            body: JSON.stringify({
              email: body.email,
              name: body.name || "",
              resubscribe: true,
              fields: { quiz_result: winner?.title || "" },
            }),
          });
          if (!res.ok) {
            console.error("MailerLite failed", res.status, await res.text());
          }
        } catch (e) {
          console.error("MailerLite error", e);
        }
      }
    }

    return new Response(
      JSON.stringify({ response_id: response.id, result: winner }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("quiz-submit error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});