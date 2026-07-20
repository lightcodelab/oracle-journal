
# Temple of Sustainment — Membership Simplification & Homepage Redesign

Large, phased plan. Nothing is implemented until you approve. All changes are additive/backwards-compatible in Phase 1; the old T1/T2/T3 tier tables stay in place until the new entitlement layer is verified.

---

## 1. Current-state conflict inventory

**Tiered access is baked in across the app.** The following read `member_tier_code`, `tier_bucket_access`, `useTierAccess`, or `useMembership`:

- Hooks/services: `src/hooks/useTierAccess.ts`, `src/hooks/useMembership.ts`
- Pages: `Temple.tsx`, `Membership.tsx`, `MembershipSuccess.tsx`, `MyAccount.tsx`, `Index.tsx`, `DoorOfDevotion.tsx`, `DoorOfCommunion.tsx`, `RemembranceSectionPage.tsx`, `DevotionSectionPage.tsx`, `DevotionResourcePage.tsx`, `DevotionCourses.tsx`, `LiveReplays.tsx`, `SearchResults.tsx`, `AdminQuizEditor.tsx`, `QuizPlayer.tsx`, `Auth.tsx`
- Edge functions: `stripe-webhook`, `stripe-cancel-subscription`, `stripe-pause-subscription`, `mcp`
- SQL functions: `has_bucket_access`, `has_active_membership`, `has_manual_access`, `can_view_lesson`, `can_view_lesson_by_door`, `can_view_card`, `get_user_entitlements`, `get_deck_purchases_admin`, `user_has_deck_access`, `user_has_premium_deck_access`
- Tables: `profiles.member_tier_code/plan_cadence/subscription_status`, `tiers`, `tier_bucket_access`, `plans`, `prices`, `subscriptions`, `manual_access_grants`, `subscription_events`
- Client types: `src/integrations/supabase/types.ts`, `src/lib/mcp/tools/whoami.ts`

**Maelin/HealingBot:** page `/devotion/healing-bot`, route in `App.tsx`, component `src/pages/HealingBot.tsx`, edge function `supabase/functions/healing-bot/`, table `healing_conversations`. Referenced from `DoorOfDevotion.tsx`.

**Homepage:** `/` currently renders `Membership.tsx` (three-card pricing page). `/temple` renders a simple Door grid. Authenticated active members are not redirected away from `/`.

**Founder concept:** does not exist anywhere yet.

**Stripe:** `stripe-webhook` handles `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.{paid,payment_failed}`. Access is currently derived from `profiles.subscription_status ∈ ('active','trialing')` and `member_tier_code` → `tier_bucket_access`. No grace-period concept; `past_due` is treated as loss of access.

---

## 2. Proposed phased implementation

**Phase 0 — Stripe integration inspection (read-only, deliverable = report).**
Enumerate current retry schedule, portal config, webhook handlers, statuses observed in `subscription_events`, and propose a specific grace-period value (7–14 days, configurable). No code changes. You approve the grace period before Phase 3.

**Phase 1 — Additive schema + entitlement service.** New tables/columns, new SQL entitlement function, new `useEntitlement` hook. Old `useTierAccess` continues to work; it is rewritten to delegate to the new service and return `hasAccess: true` for all three Doors whenever `is_active_member` is true. All existing tier tables/columns preserved. No user-visible change yet.

**Phase 2 — Public homepage + auth redirect.** Rewrite `/` (`Membership.tsx`) into a single-offer landing page with Founding-window banner. Add authenticated redirect to `/temple`. Update `Auth.tsx` post-sign-in routing.

**Phase 3 — Stripe pricing + Founder logic.** Add Founding price (requires human config in Stripe — see §6). Server-side price selection in `stripe-checkout`. Webhook writes Founder cohort state. Configurable grace period. Cancellation warning UI in `MyAccount.tsx`.

**Phase 4 — Temple homepage redesign.** New `/temple` with sections A–G, recommendation config, "Continue your journey" data layer, Founder badge, Practice shortcuts.

**Phase 5 — Copy & language sweep.** Remove Seeker/Devotee/Initiate/upgrade/locked-door language across all Door pages, sections, resource pages, search, quizzes.

**Phase 6 — Maelin retirement.** Route `/devotion/healing-bot` → redirect to AreekeeraBot. Hide nav entries. Retain data + edge function until retention review complete.

**Phase 7 — Deprecation.** After ≥30 days of stable operation, drop unused tier columns/tables in a separate migration (out of scope for this plan; will be re-planned).

Shopify entitlement (§9 of brief) is deferred — boundary defined but not implemented.

---

## 3. Data model — additive migration (Phase 1)

New tables:

```text
public.app_settings              -- singleton config
  key text pk, value jsonb, updated_at
  seeded: founding_beta_starts_at, founding_beta_ends_at,
          founding_price_id, standard_price_id,
          failed_payment_grace_days (default 10)

public.founding_members
  user_id uuid pk → auth.users
  is_founding_member boolean not null default true
  founding_member_since timestamptz not null
  founder_badge_awarded_at timestamptz not null
  founding_subscription_id text          -- the Stripe sub that qualifies
  founding_price_eligibility_status text -- 'active' | 'in_grace' | 'lost'
  founding_price_lost_at timestamptz
  founding_price_lost_reason text
  notes text
  created_at, updated_at

public.founder_price_audit
  id uuid pk, user_id uuid, action text, actor uuid,
  from_status text, to_status text, reason text, at timestamptz

public.entitlements   -- canonical access ledger (source: Stripe, Shopify, manual)
  id uuid pk
  user_id uuid not null
  source text not null           -- 'stripe' | 'shopify' | 'manual' | 'admin'
  source_ref text                -- subscription id / order id
  product_kind text not null     -- 'app_membership'
  status text not null           -- 'active' | 'in_grace' | 'canceled' | 'expired'
  starts_at, ends_at timestamptz
  grace_until timestamptz
  metadata jsonb
  created_at, updated_at
```

New columns on `profiles` (nullable, additive):
- `is_active_member boolean` (denormalised, maintained by webhook + trigger)
- `active_member_since timestamptz`

Kept but deprecated (no drops in this migration): `profiles.member_tier_code`, `plan_cadence`, `tiers`, `tier_bucket_access`.

New SQL functions:

```text
public.is_active_member(_user_id uuid) → boolean
  -- true if any entitlements row is 'active' or 'in_grace' for product_kind='app_membership'
  -- OR any manual_access_grants row is currently valid for any bucket
  -- OR user is admin

public.get_member_state(_user_id uuid)
  → jsonb { is_active_member, is_founding_member, founder_badge, founding_price_status,
            subscription_status, current_period_end, cancel_at_period_end, grace_until }
```

Replace body of legacy `has_bucket_access`, `can_view_lesson`, `can_view_lesson_by_door`, `can_view_card` with a thin wrapper: `is_active_member(auth.uid()) OR has_role(auth.uid(),'admin') OR <existing manual-grant/free-content checks>`. Since only the body changes, all RLS policies referencing these functions keep working without policy edits.

GRANTs for every new public table follow the required pattern (authenticated + service_role; no anon).

---

## 4. RLS implications

- New tables: RLS on. `founding_members` — user can `SELECT` own row; admin all; service_role all. `entitlements` — user reads own; only service_role/admin writes. `app_settings` — anon+authenticated `SELECT` only (public config); service_role writes. `founder_price_audit` — admin only.
- Existing policies unchanged; they call the same SQL function names whose bodies are updated.
- Homepage queries limited to summary columns (no journal content, no encrypted fields).

---

## 5. Stripe products/prices requiring human configuration

You (or the team) must, in Stripe live+test:

1. Create/keep product **"Temple of Sustainment — Membership"**.
2. Standard recurring price: **AUD $50/month**.
3. Founding recurring price: **AUD $35/month** (separate price on the same product).
4. Confirm Billing retry schedule (Smart Retries or custom) — feeds Phase 0 report.
5. Customer Portal: enable cancel-at-period-end; disable plan switching between $35 and $50 (Founders cannot self-downgrade/upgrade the price).
6. Provide both price IDs to be stored in `app_settings` (server-side only).

Client never submits a price ID. `stripe-checkout` chooses based on `now()` vs Founding window from `app_settings`.

---

## 6. Founding eligibility & webhook logic

**Eligibility at checkout:** if `now() ∈ [founding_beta_starts_at, founding_beta_ends_at]` AND user has no prior terminated app-membership subscription → use founding price ID. Otherwise standard.

**On `checkout.session.completed` for app membership:**
- Upsert `entitlements` row (source='stripe', status='active').
- If price = founding price → upsert `founding_members` with status='active', award badge, write audit row.
- Set `profiles.is_active_member=true`, `active_member_since` if null.

**On `customer.subscription.updated`:**
- Mirror `status`, `cancel_at_period_end`, `current_period_end` into `entitlements` and `subscriptions`.
- If `status='past_due'` → `entitlements.status='in_grace'`, `grace_until = now() + grace_days`. Founder eligibility becomes `in_grace` (not lost).
- If `status='active'` again → clear grace, restore `active`.
- If `cancel_at_period_end=true` → keep active until period end; do NOT change founder status yet.
- If `cancel_at_period_end` flips back to false before termination → founder status remains `active` (reversal preserves pricing).

**On `customer.subscription.deleted` or grace expiry (via scheduled task or webhook `invoice.payment_failed` after retries exhausted):**
- `entitlements.status='canceled'/'expired'`, `is_active_member=false`.
- If this was the Founding subscription → `founding_price_eligibility_status='lost'`, `founding_price_lost_at=now()`, reason recorded. Badge kept.

**Resubscription:** `stripe-checkout` refuses founding price when the user has any `founding_members` row with status='lost'. Charge standard price.

**Idempotency:** `subscription_events.event_id` already unique; wrap all state transitions in a single transaction keyed by `event_id`. Add ordering guard: only apply an event if its `created` timestamp is ≥ last-applied for the same subscription (store `last_event_at` on `subscriptions`).

**Admin restoration:** `POST /admin/founder-restore` writes `founder_price_audit` and flips eligibility back to `active`. Never automatic.

---

## 7. `/` public homepage — single-offer copy

Layout: hero → outcomes (Insight / Healing Practice / Integration / Connection / Continuity) → three Doors as modes-of-support → founding-window banner (only while window open) → FAQ → footer.

Founding banner reads: "Join as a Founding Member for AUD $35/month and keep your founding price while your subscription remains eligible." Countdown driven by `founding_beta_ends_at` from `app_settings` — never client-fabricated.

Auth redirect: on mount of `/`, if `is_active_member` → `<Navigate to="/temple" replace/>`. Prevent loops by only redirecting when the entitlement query has resolved.

---

## 8. `/temple` homepage — component & data architecture

New route composition (`Temple.tsx` rewritten):

```text
<TempleLayout>
  <PersonalWelcome name founderBadge />
  <NeedsCompass options={NEEDS_CONFIG} />           -- Section B
  <ContinueYourJourney items={continueItems} />     -- Section C
  <ThreeDoors />                                    -- Section D (Doors always open)
  <YourPractice />                                  -- Section E
  <HappeningInTheTemple items={communionItems} />   -- Section F
  <PhysicalCompanion enabled={false} />             -- Section G (disabled until URLs)
</TempleLayout>
```

New files:

- `src/config/needsCompass.ts` — array of `{ id, label, description, route, fallbackRoute }`; maps "I need clarity" → `/decks`, "I need grounding" → NervousSystemAnchoring tool, "I need healing support" → AreekeerA, "Continue my work" → last-touched item, "Connection" → `/communion`, "Not sure" → guided quiz or Compass.
- `src/hooks/useTempleHome.ts` — one query batch fetching: latest lesson_journal_entry, latest protocol, latest saved reading, latest transformation entry, next registered session. Summary columns only.
- `src/components/temple/*` — one component per section.

Founder badge: subtle gold-outlined chip near welcome, `title="Founding Member since {date}"`. Also shown on Profile page and admin user detail.

---

## 9. Empty-state & fallback behaviour

- No recent lesson → "Begin at any Door." with Door quick-links.
- No upcoming session → "The next gathering will be announced soon."
- No saved reading → link to `/decks`.
- Never fabricate progress; if a value is unknown, omit the row.
- All queries wrapped in Suspense-safe skeletons; failures render the empty state, never a red error.

---

## 10. Existing-member migration approach

Backfill migration (idempotent, in the same Phase 1 SQL):

```text
INSERT INTO entitlements (user_id, source, source_ref, product_kind, status,
                           starts_at, ends_at, metadata)
SELECT s.profile_id, 'stripe', s.provider_subscription_id, 'app_membership',
       CASE WHEN s.status IN ('active','trialing') THEN 'active'
            WHEN s.status = 'past_due' THEN 'in_grace'
            ELSE 'canceled' END,
       s.current_period_start, s.current_period_end, jsonb_build_object('backfilled', true)
FROM public.subscriptions s
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e
                  WHERE e.source_ref = s.provider_subscription_id);

UPDATE public.profiles p SET is_active_member = TRUE
WHERE EXISTS (SELECT 1 FROM public.entitlements e
              WHERE e.user_id = p.id AND e.status IN ('active','in_grace'));
```

No existing member is a Founder at cutover (window has not opened). If any early testers should be grandfathered, admin uses the restoration tool with an audit reason.

---

## 11. Maelin retirement

- `App.tsx`: `/devotion/healing-bot` → `<Navigate to="/devotion/areekeera" replace/>`.
- Remove Maelin cards from `DoorOfDevotion.tsx`.
- Keep `HealingBot.tsx` file and `healing-bot` edge function in-tree (unused) plus `healing_conversations` table for retention review. Add a `DEPRECATED.md` note.
- No data deletion. Export path added later once retention decision is made.

---

## 12. Data preservation & rollback

- All Phase 1 SQL is additive; nothing dropped.
- Tier tables kept for ≥30 days post-launch.
- Rollback: revert client to previous entitlement resolver by feature flag `app_settings.use_new_entitlement_model`. If flipped off, `is_active_member()` falls back to the old tier logic. Feature flag read once per session.
- Journal encryption untouched; new homepage queries never `SELECT` encrypted columns.

---

## 13. Testing plan

- Unit: `stripe-checkout` price selection matrix (in-window / out-of-window / prior-lost-founder / trial).
- Webhook simulator (Stripe CLI fixtures) for the 15 scenarios listed in the brief, incl. duplicate + out-of-order delivery.
- SQL: `is_active_member()` truth-table with entitlements in each status × manual grants × admin.
- Playwright: `/` unauth → sees pricing; `/` auth+active → redirects `/temple`; `/temple` sections render for member without any activity; cancellation warning modal keyboard flow; Founder badge visible after webhook.
- Backfill dry-run against snapshot before applying to live.

---

## 14. Acceptance criteria

- One active member can reach every Door and every listed feature without any locked-overlay or upgrade CTA.
- No occurrence of Seeker/Devotee/Initiate in user-facing strings.
- Stripe checkout returns $35 price only when server time is inside window and user is eligible.
- Founder badge persists across cancel → resub; resub charges $50.
- Cancel flow shows the mandated warning + explicit unchecked acknowledgement before Stripe portal handoff.
- `/temple` renders for a brand-new member with sensible empty states, no console errors.
- All existing member data intact; RLS unchanged externally.
- `/devotion/healing-bot` redirects; no dead links in nav.

---

## 15. Blocking questions

1. **Founding window dates:** exact `founding_beta_starts_at` / `ends_at` (ISO, timezone)?
2. **Stripe grace period:** approve Phase 0 report before Phase 3, or accept a default of 10 days now (configurable)?
3. **Currency display:** show as `A$50` or `AUD $50` in UI copy?
4. **Trials:** brief says "if retained." Keep or remove Stripe trial periods entirely?
5. **Founder badge visual:** use existing gold accent + text chip, or do you want a new small icon asset (I can generate)?
6. **Cancellation entry point:** currently `stripe-cancel-subscription` cancels immediately at period end. Confirm the in-app warning + acknowledgement should gate this function call (not just the portal redirect)?
7. **Journal Box + App / Personalised Journal Box entitlement source:** OK to defer Shopify wiring entirely to a later plan, with only the DB boundary (`entitlements.source='shopify'`) prepared now?
8. **Legacy Maelin conversations:** offer users an export before eventual deletion, or hold indefinitely?
