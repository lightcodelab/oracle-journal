import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAILERLITE_API = "https://api.mailerlite.com/api/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
    if (!MAILERLITE_API_KEY) throw new Error("MAILERLITE_API_KEY is not configured");

    const MAILERLITE_GROUP_ID = Deno.env.get("MAILERLITE_GROUP_ID");
    if (!MAILERLITE_GROUP_ID) throw new Error("MAILERLITE_GROUP_ID is not configured");

    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { opt_in } = await req.json();
    const email = user.email;
    if (!email) throw new Error("User has no email");

    // Get user's name from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const headers = {
      "Content-Type": "application/json",
      "X-MailerLite-ApiKey": MAILERLITE_API_KEY,
    };

    if (opt_in) {
      // Add subscriber to group
      const res = await fetch(
        `${MAILERLITE_API}/groups/${MAILERLITE_GROUP_ID}/subscribers`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            email,
            name: profile?.full_name || "",
            resubscribe: true,
          }),
        }
      );

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`MailerLite add failed [${res.status}]: ${errBody}`);
      }
    } else {
      // Unsubscribe: update subscriber type to "unsubscribed"
      const res = await fetch(`${MAILERLITE_API}/subscribers/${email}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ type: "unsubscribed" }),
      });

      // 404 means they were never subscribed — that's fine
      if (!res.ok && res.status !== 404) {
        const errBody = await res.text();
        throw new Error(`MailerLite unsubscribe failed [${res.status}]: ${errBody}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("MailerLite sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
