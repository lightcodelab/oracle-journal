import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Unauthorized");
    }

    console.log("User authenticated:", user.id, user.email);

    const { affiliateCode, affiliateLinkCode, commissionModel, mode: requestedMode } =
      await req.json().catch(() => ({}));

    // ---------------------------------------------------------------
    // Server-authoritative price selection and environment resolution.
    // - Live is the default and only mode available to end users.
    // - Admins may explicitly request { mode: "test" } to run through
    //   the sandbox pipeline; that path requires a configured
    //   STRIPE_SECRET_KEY_TEST and never affects live entitlements.
    // ---------------------------------------------------------------
    let stripeMode: "test" | "live" = "live";
    if (requestedMode === "test") {
      const supabaseAdminCheck = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data: roleRow } = await supabaseAdminCheck
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) {
        throw new Error("Test mode checkout requires admin role");
      }
      stripeMode = "test";
    }

    const stripeKey =
      stripeMode === "test"
        ? (Deno.env.get("STRIPE_SECRET_KEY_TEST") || "")
        : (Deno.env.get("STRIPE_SECRET_KEY") || "");
    if (!stripeKey) {
      throw new Error(`Stripe key not configured for mode=${stripeMode}`);
    }
    // Enforce key-shape / mode consistency.
    const keyIsTest = stripeKey.startsWith("sk_test_") || stripeKey.startsWith("rk_test_");
    if ((stripeMode === "test") !== keyIsTest) {
      throw new Error("Stripe key/mode mismatch — refusing to proceed");
    }
    console.log("Checkout mode:", stripeMode);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: offer, error: offerError } = await supabaseAdmin.rpc(
      "get_stripe_price_id_for_current_offer",
      { _mode: stripeMode }
    );
    if (offerError || !offer) {
      console.error("Offer resolution failed:", offerError);
      throw new Error("Membership pricing is not currently available.");
    }

    const stripePriceId = (offer as Record<string, unknown>).stripe_price_id as string;
    const offerTier = (offer as Record<string, unknown>).tier as string;
    console.log("Server-selected offer:", offerTier, "price:", stripePriceId, "mode:", stripeMode);

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check if customer already exists
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabaseClient
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      console.log("Created new Stripe customer:", customerId);
    } else {
      console.log("Using existing Stripe customer:", customerId);
    }

    // Build affiliate metadata (only include keys we have)
    const affMeta: Record<string, string> = {};
    if (affiliateCode) affMeta.affiliate_code = String(affiliateCode);
    if (affiliateLinkCode) affMeta.affiliate_link_code = String(affiliateLinkCode);
    if (commissionModel) affMeta.commission_model = String(commissionModel);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_code: offerTier === "founding" ? "founding" : "standard",
          offer_tier: offerTier,
          ...affMeta,
        },
      },
      success_url: `${req.headers.get("origin")}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/`,
      metadata: {
        supabase_user_id: user.id,
        plan_code: offerTier === "founding" ? "founding" : "standard",
        offer_tier: offerTier,
        ...affMeta,
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Checkout error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
