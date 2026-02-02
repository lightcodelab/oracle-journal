import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { immediate } = await req.json(); // true = cancel now, false = cancel at period end

    // Get user's subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("provider_subscription_id, plan_code")
      .eq("profile_id", user.id)
      .in("status", ["active", "trialing", "paused"])
      .single();

    if (subError || !subscription?.provider_subscription_id) {
      throw new Error("No active subscription found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    console.log(`Canceling subscription (immediate: ${immediate}):`, subscription.provider_subscription_id);

    // Get old tier for audit
    const { data: oldProfile } = await supabaseAdmin
      .from("profiles")
      .select("member_tier_code")
      .eq("id", user.id)
      .single();

    if (immediate) {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscription.provider_subscription_id);

      // Update local subscription status
      await supabaseAdmin
        .from("subscriptions")
        .update({ 
          status: "canceled",
          canceled_at: new Date().toISOString(),
        })
        .eq("provider_subscription_id", subscription.provider_subscription_id);

      // Update profile - remove access
      await supabaseAdmin
        .from("profiles")
        .update({ 
          subscription_status: "canceled",
          member_tier_code: null,
        })
        .eq("id", user.id);

      console.log("Subscription canceled immediately");
    } else {
      // Cancel at end of billing period
      await stripe.subscriptions.update(subscription.provider_subscription_id, {
        cancel_at_period_end: true,
      });

      // Update local subscription
      await supabaseAdmin
        .from("subscriptions")
        .update({ cancel_at_period_end: true })
        .eq("provider_subscription_id", subscription.provider_subscription_id);

      console.log("Subscription set to cancel at period end");
    }

    // Record audit event
    await supabaseAdmin.from("membership_audit").insert({
      user_id: user.id,
      old_tier_code: oldProfile?.member_tier_code,
      new_tier_code: immediate ? null : oldProfile?.member_tier_code,
      source: "user",
      reason: immediate 
        ? "User canceled subscription immediately" 
        : "User scheduled subscription cancellation at period end",
    });

    return new Response(
      JSON.stringify({ success: true, immediate }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Cancel error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
