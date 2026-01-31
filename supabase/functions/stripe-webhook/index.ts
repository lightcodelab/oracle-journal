import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Map plan codes to tier codes
const planToTier: Record<string, string> = {
  seeker: "T1",
  devotee: "T2",
  initiate: "T3",
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("Missing signature or webhook secret");
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("Webhook event received:", event.type);
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", errMessage);
    return new Response(`Webhook Error: ${errMessage}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout completed:", session.id);
        
        if (session.mode === "subscription" && session.subscription) {
          // Retrieve full subscription details
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await handleSubscriptionChange(subscription, "created");
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription, event.type.includes("created") ? "created" : "updated");
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(invoice);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing webhook:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
});

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  action: "created" | "updated"
) {
  const userId = subscription.metadata?.supabase_user_id;
  const planCode = subscription.metadata?.plan_code;

  if (!userId) {
    // Try to find user by customer ID
    const customerId = subscription.customer as string;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!profile) {
      console.error("Cannot find user for subscription:", subscription.id);
      return;
    }
  }

  const userIdToUse = userId || (await getUserIdFromCustomer(subscription.customer as string));
  
  if (!userIdToUse) {
    console.error("No user ID found for subscription");
    return;
  }

  const tierCode = planCode ? planToTier[planCode] : null;
  const priceId = subscription.items.data[0]?.price.id;
  const cadence = subscription.items.data[0]?.price.recurring?.interval === "year" ? "yearly" : "monthly";

  // Map Stripe status to our status
  let status = subscription.status;
  if (subscription.status === "trialing") {
    status = "trialing";
  } else if (subscription.status === "active") {
    status = "active";
  } else if (subscription.status === "past_due") {
    status = "past_due";
  } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
    status = "canceled";
  }

  console.log(`Updating subscription for user ${userIdToUse}: tier=${tierCode}, status=${status}, cadence=${cadence}`);

  // Upsert subscription record
  const { error: subError } = await supabaseAdmin.from("subscriptions").upsert({
    id: subscription.id,
    profile_id: userIdToUse,
    plan_code: planCode || "seeker",
    price_id: priceId,
    provider: "stripe",
    provider_subscription_id: subscription.id,
    status: status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_end: subscription.trial_end 
      ? new Date(subscription.trial_end * 1000).toISOString() 
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
  }, { onConflict: "id" });

  if (subError) {
    console.error("Error upserting subscription:", subError);
  }

  // Get old tier for audit
  const { data: oldProfile } = await supabaseAdmin
    .from("profiles")
    .select("member_tier_code")
    .eq("id", userIdToUse)
    .single();

  // Update profile with membership info
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      member_tier_code: tierCode,
      plan_cadence: cadence,
      subscription_status: status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("id", userIdToUse);

  if (profileError) {
    console.error("Error updating profile:", profileError);
  }

  // Record audit event
  await supabaseAdmin.from("membership_audit").insert({
    user_id: userIdToUse,
    old_tier_code: oldProfile?.member_tier_code,
    new_tier_code: tierCode,
    source: "stripe",
    reason: `Subscription ${action}: ${subscription.id}`,
  });

  // Record subscription event
  await supabaseAdmin.from("subscription_events").insert({
    subscription_id: subscription.id,
    event_type: action === "created" ? "created" : "updated",
    payload: JSON.stringify(subscription),
  });

  console.log(`Successfully processed subscription ${action} for user ${userIdToUse}`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userIdToUse = await getUserIdFromSubscription(subscription);
  
  if (!userIdToUse) {
    console.error("No user ID found for canceled subscription");
    return;
  }

  // Get old tier for audit
  const { data: oldProfile } = await supabaseAdmin
    .from("profiles")
    .select("member_tier_code")
    .eq("id", userIdToUse)
    .single();

  // Update subscription status
  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("id", subscription.id);

  // Remove membership from profile
  await supabaseAdmin
    .from("profiles")
    .update({
      member_tier_code: null,
      subscription_status: "canceled",
    })
    .eq("id", userIdToUse);

  // Record audit event
  await supabaseAdmin.from("membership_audit").insert({
    user_id: userIdToUse,
    old_tier_code: oldProfile?.member_tier_code,
    new_tier_code: null,
    source: "stripe",
    reason: `Subscription canceled: ${subscription.id}`,
  });

  console.log(`Subscription canceled for user ${userIdToUse}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const userIdToUse = await getUserIdFromCustomer(invoice.customer as string);
  if (!userIdToUse) return;

  // Record invoice
  await supabaseAdmin.from("invoices").upsert({
    id: invoice.id,
    profile_id: userIdToUse,
    subscription_id: invoice.subscription as string,
    provider_invoice_id: invoice.id,
    status: "paid",
    amount_due_cents: invoice.amount_due,
    amount_paid_cents: invoice.amount_paid,
    currency: invoice.currency,
    period_start: invoice.period_start 
      ? new Date(invoice.period_start * 1000).toISOString() 
      : null,
    period_end: invoice.period_end 
      ? new Date(invoice.period_end * 1000).toISOString() 
      : null,
    paid_at: new Date().toISOString(),
  }, { onConflict: "id" });

  // Record payment
  if (invoice.charge) {
    await supabaseAdmin.from("payments").insert({
      invoice_id: invoice.id,
      provider: "stripe",
      provider_payment_id: invoice.charge as string,
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      status: "succeeded",
      received_at: new Date().toISOString(),
    });
  }

  console.log(`Invoice paid for user ${userIdToUse}: ${invoice.id}`);
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const userIdToUse = await getUserIdFromCustomer(invoice.customer as string);
  if (!userIdToUse) return;

  // Record failed invoice
  await supabaseAdmin.from("invoices").upsert({
    id: invoice.id,
    profile_id: userIdToUse,
    subscription_id: invoice.subscription as string,
    provider_invoice_id: invoice.id,
    status: "failed",
    amount_due_cents: invoice.amount_due,
    currency: invoice.currency,
  }, { onConflict: "id" });

  console.log(`Invoice failed for user ${userIdToUse}: ${invoice.id}`);
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  return profile?.id || null;
}

async function getUserIdFromSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  // First try metadata
  if (subscription.metadata?.supabase_user_id) {
    return subscription.metadata.supabase_user_id;
  }
  
  // Then try customer lookup
  return getUserIdFromCustomer(subscription.customer as string);
}
