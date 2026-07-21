import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManualUserRequest {
  email: string;
  fullName: string;
  tempPassword: string;
  startsAt: string;
  endsAt: string;   // canonical: single full-access window
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is admin
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: callingUser } } = await supabaseClient.auth.getUser();
    if (!callingUser) throw new Error("Not authenticated");

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("role", "admin")
      .single();

    if (!callerRole) throw new Error("Only admins can create manual users");

    const { email, fullName, tempPassword, startsAt, endsAt, notes }: ManualUserRequest = await req.json();

    if (!email || !tempPassword || !startsAt || !endsAt) {
      throw new Error("Email, password and access window are required");
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      throw new Error("End date must be after start date");
    }

    // Create the user — reject if email already exists
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      if (createError.message?.includes("already been registered")) {
        throw new Error("A user with this email already exists. Please use a different email address.");
      }
      throw createError;
    }
    if (!newUser.user) throw new Error("Failed to create user");
    const userId = newUser.user.id;

    // Mark as must change password and update name
    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true, full_name: fullName })
      .eq("id", userId);

    // Create the canonical full-access grant via the transactional RPC.
    // The RPC uses `assert_caller_is_admin()` which reads `auth.uid()` — so we
    // MUST invoke it via the caller-authenticated client (JWT of the calling
    // admin), not the service-role client (which has NULL auth.uid()).
    const { data: grantId, error: grantError } = await supabaseClient.rpc(
      "admin_create_manual_full_access",
      {
        _user_id: userId,
        _starts_at: startsAt,
        _expires_at: endsAt,
        _notes: notes ?? null,
      },
    );

    if (grantError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw grantError;
    }

    console.log(`Manual user created: ${email} (${userId}) full access until ${endsAt}, grant ${grantId}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: `User created for ${email} with temporary access.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating manual user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
