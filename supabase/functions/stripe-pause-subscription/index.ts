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

    const { action } = await req.json(); // 'pause' or 'resume'

    if (!action || !['pause', 'resume'].includes(action)) {
      throw new Error("Invalid action. Must be 'pause' or 'resume'");
    }

    // Get user's subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("provider_subscription_id")
      .eq("profile_id", user.id)
      .in("status", ["active", "trialing", "paused"])
      .single();

    if (subError || !subscription?.provider_subscription_id) {
      throw new Error("No active subscription found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    console.log(`${action} subscription:`, subscription.provider_subscription_id);

    if (action === 'pause') {
      // Pause the subscription - void invoices during pause
      await stripe.subscriptions.update(subscription.provider_subscription_id, {
        pause_collection: {
          behavior: 'void',
        },
      });

      // Update local subscription status
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "paused" })
        .eq("provider_subscription_id", subscription.provider_subscription_id);

      // Update profile - remove access but keep account
      await supabaseAdmin
        .from("profiles")
        .update({ 
          subscription_status: "paused",
        })
        .eq("id", user.id);

      // Record audit event
      await supabaseAdmin.from("membership_audit").insert({
        user_id: user.id,
        old_tier_code: null,
        new_tier_code: null,
        source: "user",
        reason: "User paused subscription",
      });

      console.log("Subscription paused successfully");
    } else {
      // Resume the subscription
      await stripe.subscriptions.update(subscription.provider_subscription_id, {
        pause_collection: null,
      });

      // Get the subscription details to restore tier
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.provider_subscription_id);
      const planCode = stripeSubscription.metadata?.plan_code || 'seeker';
      const planToTier: Record<string, string> = {
        seeker: "T1",
        devotee: "T2",
        initiate: "T3",
      };
      const tierCode = planToTier[planCode] || "T1";

      // Update local subscription status
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "active" })
        .eq("provider_subscription_id", subscription.provider_subscription_id);

      // Update profile - restore access
      await supabaseAdmin
        .from("profiles")
        .update({ 
          subscription_status: "active",
          member_tier_code: tierCode,
        })
        .eq("id", user.id);

      // Record audit event
      await supabaseAdmin.from("membership_audit").insert({
        user_id: user.id,
        old_tier_code: null,
        new_tier_code: tierCode,
        source: "user",
        reason: "User resumed subscription",
      });

      console.log("Subscription resumed successfully");
    }

    return new Response(
      JSON.stringify({ success: true, action }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Pause/resume error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
