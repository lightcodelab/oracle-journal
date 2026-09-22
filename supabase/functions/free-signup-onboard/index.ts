import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const MAILERLITE_API = "https://api.mailerlite.com/api/v2";
const READING_URL = "https://inside.thetempleofsustainment.com/remembrance/spreads";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return json({ error: "Not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in." }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.email) return json({ error: "Please sign in." }, 401);

    const { data: profile } = await userClient
      .from("profiles")
      .select("full_name, newsletter_opt_in")
      .eq("id", user.id)
      .maybeSingle();

    const firstName = (profile?.full_name || "").trim().split(/\s+/)[0] || undefined;

    // Welcome email with a link straight back to their reading.
    try {
      await sendTemplateEmail("free-reading-welcome", user.email, {
        templateData: { name: firstName, readingUrl: READING_URL },
        idempotencyKey: `free-reading-welcome-${user.id}`,
      });
    } catch (error) {
      console.error("free welcome email failed", error);
    }

    // Marketing list, only with explicit consent.
    if (profile?.newsletter_opt_in) {
      const apiKey = Deno.env.get("MAILERLITE_API_KEY");
      const groupId = Deno.env.get("MAILERLITE_FREE_GROUP_ID") || Deno.env.get("MAILERLITE_GROUP_ID");
      if (apiKey && groupId) {
        try {
          const res = await fetch(`${MAILERLITE_API}/groups/${groupId}/subscribers`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-MailerLite-ApiKey": apiKey },
            body: JSON.stringify({
              email: user.email,
              name: profile?.full_name || "",
              resubscribe: true,
            }),
          });
          if (!res.ok) console.error("MailerLite add failed", res.status, await res.text());
        } catch (error) {
          console.error("MailerLite add error", error);
        }
      }
    }

    return json({ ok: true });
  } catch (error) {
    console.error("free-signup-onboard failed", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
