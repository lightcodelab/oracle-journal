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
    // In the Edge runtime, Stripe's webhook verification must use the async variant
    // because WebCrypto providers (SubtleCrypto) cannot be used synchronously.
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log("Webhook event received:", event.type);
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", errMessage);
    return new Response(`Webhook Error: ${errMessage}`, { status: 400 });
  }

  try {
    // ---- Idempotency ledger --------------------------------------
    // If we have already recorded this event id, short-circuit.
    const { data: existing } = await supabaseAdmin
      .from("stripe_webhook_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();
    if (existing) {
      console.log("Duplicate event, skipping:", event.id);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

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
        if (event.type === "customer.subscription.created") {
          await handleAffiliateOnSubscription(subscription);
        }
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
        await handleAffiliateOnInvoice(invoice);
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

    // Record processing so retries are idempotent.
    await supabaseAdmin.from("stripe_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
      event_created_at: new Date(event.created * 1000).toISOString(),
    });

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

  // ---------------------------------------------------------------
  // Phase 3: additive new-entitlement-model ingestion.
  // Writes entitlements + founding_members records atomically.
  // Kill switch stays OFF, so this data does not yet drive access;
  // it is being maintained so it is correct on flip day.
  // ---------------------------------------------------------------
  try {
    const priceIdForIngest = subscription.items.data[0]?.price?.id ?? null;
    const { error: ingestError } = await supabaseAdmin.rpc(
      "ingest_stripe_subscription",
      {
        _user_id: userIdToUse,
        _stripe_subscription_id: subscription.id,
        _stripe_price_id: priceIdForIngest,
        _stripe_status: subscription.status,
        _current_period_start: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null,
        _current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        _cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        _canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        _event_created_at: new Date().toISOString(),
      }
    );
    if (ingestError) console.error("ingest_stripe_subscription error:", ingestError);
  } catch (e) {
    console.error("ingest_stripe_subscription threw:", e);
  }
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

  // Phase 3 additive: forfeit Founder price + close entitlement.
  try {
    const priceIdForIngest = subscription.items.data[0]?.price?.id ?? null;
    await supabaseAdmin.rpc("ingest_stripe_subscription", {
      _user_id: userIdToUse,
      _stripe_subscription_id: subscription.id,
      _stripe_price_id: priceIdForIngest,
      _stripe_status: "canceled",
      _current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      _current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      _cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      _canceled_at: new Date().toISOString(),
      _event_created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("ingest terminal error:", e);
  }
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

// =====================================================
// AFFILIATE ATTRIBUTION
// =====================================================
async function getAffiliateSettings() {
  const { data } = await supabaseAdmin
    .from("affiliate_settings")
    .select("default_signup_pct, default_recurring_pct")
    .eq("id", 1)
    .maybeSingle();
  return {
    signupPct: Number(data?.default_signup_pct ?? 20),
    recurringPct: Number(data?.default_recurring_pct ?? 10),
  };
}

async function handleAffiliateOnSubscription(subscription: Stripe.Subscription) {
  try {
    const affCode = subscription.metadata?.affiliate_code;
    if (!affCode) return;

    const userId = await getUserIdFromSubscription(subscription);
    if (!userId) return;

    const linkCode = subscription.metadata?.affiliate_link_code || null;
    const model = (subscription.metadata?.commission_model as "one_time" | "recurring") || "recurring";

    const { data: aff } = await supabaseAdmin
      .from("affiliates")
      .select("id, user_id, status, commission_signup_pct, commission_recurring_pct")
      .eq("referral_code", affCode)
      .maybeSingle();

    if (!aff || aff.status !== "active") {
      console.log("Affiliate not found or not active:", affCode);
      return;
    }
    if (aff.user_id === userId) {
      console.log("Skipping self-referral");
      return;
    }

    let linkId: string | null = null;
    if (linkCode) {
      const { data: link } = await supabaseAdmin
        .from("affiliate_links")
        .select("id")
        .eq("code", linkCode)
        .eq("affiliate_id", aff.id)
        .maybeSingle();
      linkId = link?.id ?? null;
    }

    // Upsert referral (unique by referred_user_id)
    const { data: existing } = await supabaseAdmin
      .from("affiliate_referrals")
      .select("id, commission_model")
      .eq("referred_user_id", userId)
      .maybeSingle();

    let referralId: string;
    if (existing) {
      referralId = existing.id;
      await supabaseAdmin
        .from("affiliate_referrals")
        .update({ status: "converted", converted_at: new Date().toISOString() })
        .eq("id", referralId);
    } else {
      const { data: newRef, error } = await supabaseAdmin
        .from("affiliate_referrals")
        .insert({
          affiliate_id: aff.id,
          link_id: linkId,
          referred_user_id: userId,
          commission_model: model,
          status: "converted",
          converted_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error || !newRef) {
        console.error("Failed to insert referral:", error);
        return;
      }
      referralId = newRef.id;
    }

    // Only create signup commission for one_time model.
    // Recurring model earns on every paid invoice (handled in handleAffiliateOnInvoice).
    if (model !== "one_time") return;

    const settings = await getAffiliateSettings();
    const rate = Number(aff.commission_signup_pct ?? settings.signupPct);

    // Use the subscription's first item price as base
    const item = subscription.items.data[0];
    const baseCents = item?.price?.unit_amount ?? 0;
    const amountCents = Math.round((baseCents * rate) / 100);
    if (amountCents <= 0) return;

    const currency = (item?.price?.currency || "usd").toLowerCase();

    const { error: cErr } = await supabaseAdmin.from("affiliate_commissions").insert({
      affiliate_id: aff.id,
      referral_id: referralId,
      type: "signup",
      source_subscription_id: subscription.id,
      base_amount_cents: baseCents,
      rate_pct: rate,
      amount_cents: amountCents,
      currency,
      status: "pending",
    });
    if (cErr) console.error("Failed to insert signup commission:", cErr);
  } catch (e) {
    console.error("handleAffiliateOnSubscription error", e);
  }
}

async function handleAffiliateOnInvoice(invoice: Stripe.Invoice) {
  try {
    if (!invoice.subscription) return;
    const subId = invoice.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subId);
    const affCode = subscription.metadata?.affiliate_code;
    if (!affCode) return;
    const model = (subscription.metadata?.commission_model as string) || "recurring";
    if (model !== "recurring") return;

    const { data: aff } = await supabaseAdmin
      .from("affiliates")
      .select("id, status, commission_recurring_pct")
      .eq("referral_code", affCode)
      .maybeSingle();
    if (!aff || aff.status !== "active") return;

    const { data: ref } = await supabaseAdmin
      .from("affiliate_referrals")
      .select("id")
      .eq("affiliate_id", aff.id)
      .eq("referred_user_id", subscription.metadata?.supabase_user_id || "")
      .maybeSingle();

    const settings = await getAffiliateSettings();
    const rate = Number(aff.commission_recurring_pct ?? settings.recurringPct);
    const baseCents = invoice.amount_paid ?? 0;
    if (baseCents <= 0) return;
    const amountCents = Math.round((baseCents * rate) / 100);
    if (amountCents <= 0) return;

    const { error } = await supabaseAdmin.from("affiliate_commissions").insert({
      affiliate_id: aff.id,
      referral_id: ref?.id ?? null,
      type: "recurring",
      source_invoice_id: invoice.id,
      source_subscription_id: subId,
      base_amount_cents: baseCents,
      rate_pct: rate,
      amount_cents: amountCents,
      currency: (invoice.currency || "usd").toLowerCase(),
      status: "pending",
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    });
    if (error && error.code !== "23505") {
      console.error("Failed to insert recurring commission:", error);
    }
  } catch (e) {
    console.error("handleAffiliateOnInvoice error", e);
  }
}
