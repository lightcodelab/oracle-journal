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
  endsAt: string;
  buckets: string[]; // e.g. ["remembrance", "devotion", "communion"]
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

    const { email, fullName, tempPassword, startsAt, endsAt, buckets, notes }: ManualUserRequest = await req.json();

    if (!email || !tempPassword || !startsAt || !endsAt || !buckets?.length) {
      throw new Error("Email, password, dates, and at least one content area are required");
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

    // Insert access grants for each bucket
    const grants = buckets.map((bucket_key) => ({
      user_id: userId,
      bucket_key,
      granted_by: callingUser.id,
      starts_at: startsAt,
      ends_at: endsAt,
      notes: notes || null,
    }));

    const { error: grantsError } = await supabaseAdmin
      .from("manual_access_grants")
      .insert(grants);

    if (grantsError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw grantsError;
    }

    console.log(`Manual user created: ${email} (${userId}) with access to [${buckets.join(", ")}] until ${endsAt}`);

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
