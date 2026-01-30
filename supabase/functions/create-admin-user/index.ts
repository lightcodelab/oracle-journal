import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAdminRequest {
  email: string;
  fullName: string;
  tempPassword: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This function requires service role key - only callable by existing admins
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the caller is an admin
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: callingUser } } = await supabaseClient.auth.getUser();
    if (!callingUser) {
      throw new Error("Not authenticated");
    }

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("role", "admin")
      .single();

    if (!callerRole) {
      throw new Error("Only admins can create new admin users");
    }

    const { email, fullName, tempPassword }: CreateAdminRequest = await req.json();

    if (!email || !tempPassword) {
      throw new Error("Email and temporary password are required");
    }

    // Create the user with the admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Skip email confirmation
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      throw createError;
    }

    if (!newUser.user) {
      throw new Error("Failed to create user");
    }

    // Grant admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "admin" });

    if (roleError) {
      // Clean up: delete the user if we couldn't assign the role
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw roleError;
    }

    // Mark user as needing to change password on first login
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", newUser.user.id);

    if (profileError) {
      console.error("Failed to set must_change_password flag:", profileError);
      // Don't fail the whole operation, just log it
    }

    console.log(`Admin user created: ${email} (${newUser.user.id}) - must change password on first login`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Admin user created for ${email}. They will be prompted to change their password on first login.`,
        userId: newUser.user.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating admin user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
