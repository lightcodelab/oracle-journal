// Temporary Pass 3.2c test runner. Executes the three self-test suites
// with service-role privileges and returns JSON results. Admin-guarded.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const runs: Record<string, unknown> = {};
    for (const [label, fn] of [
      ["phase1_run1", "_phase1_run_access_tests"],
      ["phase1_run2", "_phase1_run_access_tests"],
      ["phase3_1_run1", "_phase3_run_isolation_tests"],
      ["phase3_1_run2", "_phase3_run_isolation_tests"],
      ["phase3_2_run1", "_phase3_2_run_tests"],
      ["phase3_2_run2", "_phase3_2_run_tests"],
    ] as const) {
      const { data, error } = await admin.rpc(fn);
      runs[label] = error ? { error: error.message } : data;
    }
    return new Response(JSON.stringify(runs, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});