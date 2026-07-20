import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Dual-secret Stripe clients. Live is the default (used by legacy helpers
// like affiliate lookups). Test is used only when a webhook payload
// verifies against the test signing secret.
const STRIPE_LIVE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_TEST_KEY = Deno.env.get("STRIPE_SECRET_KEY_TEST") || "";
const STRIPE_LIVE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const STRIPE_TEST_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST") || "";

const stripeLive = new Stripe(STRIPE_LIVE_KEY, { apiVersion: "2023-10-16" });
const stripeTest = STRIPE_TEST_KEY
  ? new Stripe(STRIPE_TEST_KEY, { apiVersion: "2023-10-16" })
  : null;
// Default alias used by legacy affiliate helpers (live-only by policy).
const stripe = stripeLive;

type StripeEnv = "test" | "live";

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
  if (!signature) {
    console.error("Missing signature or webhook secret");
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  let stripeEnv: StripeEnv;
  let stripeClient: Stripe;
  const body = await req.text();

  // Try LIVE secret first, then TEST. The environment is *derived* from
  // which signing secret validates the payload — never from client input.
  try {
    if (STRIPE_LIVE_WEBHOOK_SECRET) {
      event = await stripeLive.webhooks.constructEventAsync(
        body, signature, STRIPE_LIVE_WEBHOOK_SECRET
      );
      stripeEnv = "live";
      stripeClient = stripeLive;
    } else {
      throw new Error("no live secret");
    }
  } catch (_liveErr) {
    try {
      if (!STRIPE_TEST_WEBHOOK_SECRET || !stripeTest) throw _liveErr;
      event = await stripeTest.webhooks.constructEventAsync(
        body, signature, STRIPE_TEST_WEBHOOK_SECRET
      );
      stripeEnv = "test";
      stripeClient = stripeTest;
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Webhook signature verification failed:", errMessage);
      return new Response(`Webhook Error: ${errMessage}`, { status: 400 });
    }
  }
  console.log(`Webhook event received (${stripeEnv}):`, event.type, event.id);

  // ---- livemode consistency check --------------------------------
  // event.livemode must agree with the environment derived from the
  // signing secret. On mismatch, audit and abort without mutating
  // subscriptions, entitlements, profiles, Founder records or legacy
  // access data.
  const expectedLivemode = stripeEnv === "live";
  if (typeof event.livemode === "boolean" && event.livemode !== expectedLivemode) {
    const reason = `livemode=${event.livemode} does not match verified_env=${stripeEnv}`;
    console.error("Stripe env/livemode mismatch:", event.id, reason);
    try {
      await supabaseAdmin.rpc("stripe_webhook_record_env_mismatch", {
        _event_id: event.id,
        _verified_env: stripeEnv,
        _event_livemode: event.livemode,
        _reason: reason,
      });
    } catch (e) {
      console.error("record_env_mismatch failed:", e);
    }
    return new Response(
      JSON.stringify({ error: "env/livemode mismatch" }),
      { status: 400 }
    );
  }

  // ---- Idempotency lifecycle: reserve event row ------------------
  const eventCreatedAt = new Date(event.created * 1000).toISOString();
  const { data: reserveStatus, error: reserveErr } = await supabaseAdmin.rpc(
    "stripe_webhook_reserve_event",
    {
      _event_id: event.id,
      _event_type: event.type,
      _stripe_environment: stripeEnv,
      _event_created_at: eventCreatedAt,
    }
  );
  if (reserveErr) {
    console.error("reserve_event failed:", reserveErr);
    return new Response("reserve failed", { status: 500 });
  }
  const reserveInfo = (reserveStatus ?? {}) as {
    status?: string;
    lease_token?: string;
    attempt_count?: number;
  };
  if (reserveInfo.status === "completed") {
    console.log("Duplicate completed event, skipping:", event.id);
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
  if (reserveInfo.status === "in_progress") {
    // Another delivery holds a fresh lease — do NOT process concurrently.
    // Return 200 so Stripe does not immediately hammer retries; the owning
    // worker will complete the event. Stale leases become reclaimable after
    // the 15-minute timeout enforced by the RPC.
    console.log("Event in progress under active lease, skipping:", event.id);
    return new Response(JSON.stringify({ received: true, in_progress: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
  if (reserveInfo.status !== "acquired" || !reserveInfo.lease_token) {
    console.error("reserve_event unexpected response:", reserveInfo);
    return new Response("reserve failed", { status: 500 });
  }
  const leaseToken = reserveInfo.lease_token;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout completed:", session.id);
        
        if (session.mode === "subscription" && session.subscription) {
          // Canonical state retrieval uses the matching env's Stripe key.
          const subscription = await stripeClient.subscriptions.retrieve(
            session.subscription as string
          );
          await handleSubscriptionChange(subscription, "created", stripeEnv, event.created);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        // Re-retrieve to guard against out-of-order deliveries.
        const raw = event.data.object as Stripe.Subscription;
        const subscription = await stripeClient.subscriptions.retrieve(raw.id);
        await handleSubscriptionChange(
          subscription,
          event.type.includes("created") ? "created" : "updated",
          stripeEnv,
          event.created,
        );
        if (event.type === "customer.subscription.created") {
          if (stripeEnv === "live") {
            await handleAffiliateOnSubscription(subscription);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        // Re-retrieve canonical state so stale/delayed deletes cannot be
        // undone by a later stale event carrying older canceled_at data.
        const raw = event.data.object as Stripe.Subscription;
        let subscription: Stripe.Subscription;
        try {
          subscription = await stripeClient.subscriptions.retrieve(raw.id);
        } catch (_e) {
          // Stripe returns the deleted object; canonical retrieval may fail
          // once fully purged. Fall back to the event payload.
          subscription = raw;
        }
        await handleSubscriptionCanceled(subscription, stripeEnv, event.created);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice, stripeEnv, stripeClient, event.created);
        if (stripeEnv === "live") {
          await handleAffiliateOnInvoice(invoice);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(invoice, stripeEnv, stripeClient, event.created);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    // Mark lifecycle row complete.
    await supabaseAdmin.rpc("stripe_webhook_complete_event", {
      _event_id: event.id,
      _stripe_environment: stripeEnv,
      _lease_token: leaseToken,
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing webhook:", errorMessage);
    await supabaseAdmin.rpc("stripe_webhook_fail_event", {
      _event_id: event.id,
      _stripe_environment: stripeEnv,
      _lease_token: leaseToken,
      _error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
});

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  action: "created" | "updated",
  stripeEnv: StripeEnv,
  eventCreatedUnix: number,
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

  // Upsert subscription record (legacy path). TEST-env events must NOT
  // touch subscription rows tied to LIVE ids — the canonical
  // ingest_stripe_subscription RPC below enforces environment-mismatch
  // rejection, so this legacy upsert is skipped for test.
  let subError: unknown = null;
  if (stripeEnv === "live") {
    const { error } = await supabaseAdmin.from("subscriptions").upsert({
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
      stripe_environment: "live",
    }, { onConflict: "id" });
    subError = error;
  }

  if (subError) {
    console.error("Error upserting subscription:", subError);
  }

  // Get old tier for audit
  const { data: oldProfile } = await supabaseAdmin
    .from("profiles")
    .select("member_tier_code")
    .eq("id", userIdToUse)
    .single();

  // Update profile with membership info — LIVE only. Under the current
  // kill-switch-OFF regime, profiles.subscription_status drives access,
  // so test events MUST NOT write here.
  if (stripeEnv === "live") {
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
  }

  // Record audit event (live only)
  if (stripeEnv === "live") {
    await supabaseAdmin.from("membership_audit").insert({
      user_id: userIdToUse,
      old_tier_code: oldProfile?.member_tier_code,
      new_tier_code: tierCode,
      source: "stripe",
      reason: `Subscription ${action}: ${subscription.id}`,
    });
  }

  // Record subscription event
  await supabaseAdmin.from("subscription_events").insert({
    subscription_id: subscription.id,
    event_type: action === "created" ? "created" : "updated",
    payload: JSON.stringify(subscription),
  });

  console.log(`Successfully processed subscription ${action} for user ${userIdToUse}`);

  // ---------------------------------------------------------------
  // Phase 3.1: environment-scoped ingestion. TEST rows are tagged
  // and are ignored by is_active_member(). LIVE rows drive future
  // entitlement flip.
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
        _event_created_at: new Date(eventCreatedUnix * 1000).toISOString(),
        _stripe_environment: stripeEnv,
      }
    );
    if (ingestError) console.error("ingest_stripe_subscription error:", ingestError);
  } catch (e) {
    console.error("ingest_stripe_subscription threw:", e);
  }
}

async function handleSubscriptionCanceled(
  subscription: Stripe.Subscription,
  stripeEnv: StripeEnv,
  eventCreatedUnix: number,
) {
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

  if (stripeEnv === "live") {
    // Update subscription status
    await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    // Remove membership from profile (drives legacy access)
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
  }

  console.log(`Subscription canceled for user ${userIdToUse}`);

  // Phase 3.1: env-scoped forfeit + entitlement close.
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
      _event_created_at: new Date(eventCreatedUnix * 1000).toISOString(),
      _stripe_environment: stripeEnv,
    });
  } catch (e) {
    console.error("ingest terminal error:", e);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice, stripeEnv: StripeEnv) {
  if (!invoice.subscription) return;
  if (stripeEnv !== "live") return; // Test invoices are not mirrored.

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

async function handleInvoiceFailed(invoice: Stripe.Invoice, stripeEnv: StripeEnv) {
  if (!invoice.subscription) return;
  if (stripeEnv !== "live") return; // Test invoices are not mirrored.

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
