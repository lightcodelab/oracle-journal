import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { generateRemembranceLetter, GatewayBlockedError } from "../_shared/remembrance/letter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const {
      data: { user },
    } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: hasAccess } = await admin.rpc("has_full_temple_access", { _user_id: user.id });
    if (!hasAccess) return json({ error: "Membership required" }, 403);

    const { data: pilgrim } = await admin
      .from("remembrance_pilgrims")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!pilgrim) return json({ error: "Not part of the pilgrimage" }, 400);
    if (pilgrim.status !== "active") return json({ error: `Pilgrimage is ${pilgrim.status}` }, 400);

    const due = pilgrim.next_letter_due_at ? new Date(pilgrim.next_letter_due_at).getTime() : 0;
    if (due > Date.now()) {
      return json({ error: "Your next letter is not due yet", next_letter_due_at: pilgrim.next_letter_due_at }, 409);
    }

    const { letter, alreadyExisted } = await generateRemembranceLetter(admin, user.id);
    return json({ letter, already_existed: alreadyExisted });
  } catch (e) {
    console.error("generate-remembrance-letter error:", e);
    if (e instanceof GatewayBlockedError) {
      return json({ error: e.message, blocked: true }, e.status);
    }
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
