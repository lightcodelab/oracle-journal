# Phase 0 — Stripe integration inspection

Purpose: gather the facts needed to pick a safe failed-payment grace period
and confirm which Stripe events already flow into the app before Phase 3
wires Founder-pricing logic through them.

**Do not implement grace-period behaviour until this document has been
filled in and reviewed.**

## 1. Current Stripe surface (from repo, already known)

| Handler | File | Events observed |
| --- | --- | --- |
| Checkout entry | `supabase/functions/stripe-checkout/index.ts` | Creates `checkout.session` in `mode: "subscription"`; passes `plan_code` + affiliate meta. No trial. |
| Webhook | `supabase/functions/stripe-webhook/index.ts` | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. |
| Cancel | `supabase/functions/stripe-cancel-subscription/index.ts` | Cancels at period end. No in-app warning gate yet. |
| Pause | `supabase/functions/stripe-pause-subscription/index.ts` | Uses Stripe `pause_collection`. |
| Portal | `supabase/functions/stripe-portal/index.ts` | Redirects to Stripe Customer Portal. |

Statuses currently mapped to app access:
- `active`, `trialing` → access on (`is_active_member = true` under the new model).
- `past_due`, `unpaid`, `incomplete`, `incomplete_expired`, `canceled` → access off.

No grace period exists. `past_due` currently drops access immediately.

## 2. To be collected from the Stripe Dashboard (human step)

Fill in and paste back:

- [ ] Smart Retries **or** custom schedule for failed invoice payments (list attempt intervals).
- [ ] Total number of retry attempts.
- [ ] "Cancel subscription after all retries fail" — enabled? yes / no.
- [ ] Customer Portal features enabled (cancel, pause, update payment method, plan switching).
- [ ] Billing → Automatic tax setting (not required, but relevant for AUD).
- [ ] Whether `pause_collection` is used (behaviour differs from cancel).
- [ ] Any billing thresholds / dunning add-ons in use.

## 3. Proposed grace policy (to confirm)

Default seed already in `public.app_settings.failed_payment_grace_days = 10`.

Recommended: choose grace = *Smart Retries window + 1 day* so that:
- Founder pricing enters `in_grace` (not lost) during retries.
- Access remains on during retries.
- If Stripe eventually cancels after retries, the webhook flips the
  entitlement to `canceled` and Founder pricing to `lost`.

If Smart Retries defaults are in use (approximately 4 attempts over ~3 weeks),
the seeded 10 days is too short — bump to 22.

## 4. Ordering & idempotency

Guard column `subscriptions.last_event_at` is added; webhook must:

1. Check `event.id` in `subscription_events` and short-circuit if already
   processed (existing behaviour, verify).
2. Compare incoming `event.created` timestamp against `last_event_at` for the
   affected subscription; ignore older events (protects against out-of-order
   delivery).
3. Wrap all state writes in a single Postgres transaction.

## 5. Cancellation UX (to build in Phase 3)

Founding Members require the explicit in-app warning + unchecked
acknowledgement before `stripe-cancel-subscription` is invoked, per brief §14.
Standard members show a lighter confirmation (still explicit, no ack).

## 6. Stripe products/prices required

Not yet created. Blocker for Phase 3.

- [ ] Product: **Temple of Sustainment — Membership** (test + live).
- [ ] Price: AUD $50/month recurring → `standard_price_id` (test + live).
- [ ] Price: AUD $35/month recurring → `founding_price_id` (test + live).
- [ ] Paste IDs into `public.app_settings` (server-side; never client).

Once the boxes above are ticked, we can commit the grace period, wire
Founder-cohort webhook logic, and add the cancellation warning.