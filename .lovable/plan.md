
# Phase 1 verification and remediation — findings

No files, migrations, or Stripe settings were changed while producing this report. Nothing below has been applied. Each corrective is a proposal, gated on your approval.

---

## 1. Founding window discrepancy — confirmed

**Migration source (as committed):**

```sql
INSERT INTO public.app_settings (key, value, is_public) VALUES
  ('founding_beta_starts_at', 'null'::jsonb, true),
  ('founding_beta_ends_at',   'null'::jsonb, true),
  ...
ON CONFLICT (key) DO NOTHING;
```

Both seeded as `null`. Your reading of the migration file is correct.

**Live DB values right now:**

| key | value |
| --- | --- |
| `founding_beta_starts_at` | `"2026-07-20T03:32:07.983595+00:00"` |
| `founding_beta_ends_at` | `null` |
| `founding_price_id` | `null` |
| `standard_price_id` | `null` |
| `failed_payment_grace_days` | `10` |
| `use_new_entitlement_model` | `true` |

`starts_at` was written to `now()` in the same turn after the migration ran (post-migration data write in my previous turn — my earlier summary was accurate about the live value but inaccurate about the migration file). Nothing else reads `founding_beta_starts_at` yet, so there is no live customer impact, but the state is misleading.

**Proposed correction (not applied):**

- Reset both `founding_beta_starts_at` and `founding_beta_ends_at` to `null` until you supply exact timestamps.
- Additionally, since neither `founding_price_id` nor `standard_price_id` is populated, no checkout path can currently offer either price — this is already a hard gate; I will not remove it in any future phase without both IDs and your approval.

---

## 2. `in_grace` access defect — confirmed

**The defect.** Current `is_active_member()`:

```sql
SELECT 1 FROM public.entitlements
WHERE user_id = _user_id
  AND product_kind = 'app_membership'
  AND status IN ('active','in_grace')
  AND (ends_at IS NULL OR ends_at > now())
```

- `grace_until` is never consulted.
- Backfill sets `past_due → in_grace` with `ends_at = subscriptions.current_period_end` and leaves `grace_until` null.
- If Stripe stops sending events, the entitlement can retain `in_grace` indefinitely as long as `ends_at` remains in the future or is null.

**Live impact today.** Zero. Query result:

| metric | count |
| --- | --- |
| entitlements (any status) | 0 |
| in_grace entitlements | 0 |
| subscriptions (any status) | 0 |

No live customers are affected because the backfill produced zero rows (there are no `subscriptions` records yet). The defect is latent — it becomes exploitable the moment the first `past_due` subscription arrives.

**Proposed corrective migration (not applied), summary:**

1. Tighten `is_active_member()`:
   ```sql
   AND (
     status = 'active'
     OR (status = 'in_grace' AND grace_until IS NOT NULL AND grace_until > now())
   )
   AND (ends_at IS NULL OR ends_at > now())
   ```
   `in_grace` without a valid `grace_until` no longer grants access.
2. Add a `CHECK` constraint (deferred, or via trigger) enforcing `status <> 'in_grace' OR grace_until IS NOT NULL`.
3. Reconcile any historical `in_grace` rows: conservatively downgrade to `canceled` unless `grace_until` is set — this is safe because there are currently 0 such rows, so it is a schema-hardening step only.
4. Do not invent a default `grace_until` window inside SQL. `grace_until` is set exclusively by the Stripe webhook on `invoice.payment_failed` using `app_settings.failed_payment_grace_days` (or, when Stripe supplies `next_payment_attempt`, that timestamp + 1 day), and re-cleared on `invoice.paid`.
5. Recovery path: `invoice.paid` for an in-grace subscription flips the entitlement back to `active` and clears `grace_until`. Existing rows stay in place — same `(source, source_ref)` unique key — so the ledger keeps a single record per subscription.
6. Expiry path: a scheduled reliability job runs every 15 minutes and flips `status='in_grace' AND grace_until < now()` to `expired`. This closes the gap where Stripe fails to send `customer.subscription.deleted` after retries exhaust. Implementable as a `pg_cron` job calling a security-definer function, or as an edge function invoked by cron — I recommend the SQL path (simpler, transactional, no HTTP dependency).
7. Add matching handling in the Stripe webhook: on `invoice.payment_failed`, upsert `entitlements` row with `status='in_grace'`, `grace_until = now() + failed_payment_grace_days` (or Stripe's `next_payment_attempt + 1 day` when present). On `customer.subscription.deleted`, mark `status='canceled'`, `ends_at = now()`, `grace_until = null`.

I will not apply any of this until you approve the exact grace-day value and the reconciliation approach for future historical rows.

---

## 3. Profile state consistency — canonical vs. denormalised

**Which code updates `profiles.is_active_member` after the migration?**

None. A repo-wide search for writes to `is_active_member`:

- `useTierAccess.ts` — reads it.
- `useMemberState.ts` — does not touch profiles directly.
- `supabase/functions/stripe-webhook/index.ts` — writes `member_tier_code`, `plan_cadence`, `subscription_status`, `current_period_end`. **Never writes `is_active_member`.**
- No trigger sets it.
- No maintenance job sets it.

**Which code writes to `entitlements`?**

Only the migration backfill. **No runtime code writes to `entitlements`.** The Stripe webhook has not been updated for Phase 1.

Consequences:

- The entitlement ledger is *not currently* the operational source of truth — it is a static snapshot at backfill time. It happens to be canonical only because it agrees with the profile column *now* (both empty), but it will not stay canonical without webhook work.
- `useMemberState` (via `get_member_state()` RPC → `is_active_member()`) reads entitlements + manual grants + admin role. Under the current defect (§2), an `in_grace` entitlement without `grace_until` would grant access forever if one existed.
- `useTierAccess` reads `profiles.is_active_member` directly. Because nothing writes it, it will be `false` for every subscriber — the compatibility wrapper is currently broken for real subscribers even though it type-checks.

**Recommendation.**

- **Canonical:** `public.entitlements` + `public.founding_members` + `public.manual_access_grants` + `public.user_roles`, joined by `is_active_member()`. Everything else is derived.
- **Denormalised mirror:** `profiles.is_active_member` maintained by a `SECURITY DEFINER` trigger on `entitlements` (AFTER INSERT/UPDATE/DELETE) and on `manual_access_grants` (AFTER INSERT/UPDATE/DELETE). The trigger recomputes `is_active_member(user_id)` and writes the result. Same for `active_member_since`.
- **Read path:** `useMemberState` should call the RPC only (it already does). `useTierAccess` should also call the RPC (or the SQL function) — not read the profile column. Rationale: a stale denorm must never grant access; it can only be used for cheap UI hints where a wrong value has no security consequence, and those hints should be labelled as such.
- **Write path:** Every entitlement change goes through a single transactional function (proposed name `public.upsert_entitlement(...)`). The Stripe webhook, Shopify sync, admin manual-grant UI, and pause/cancel edge functions all call this one function. That guarantees:
  - Ledger + trigger + denorm mirror update in the same transaction.
  - Idempotency via `(source, source_ref)` unique key.
  - Ordering guard via `subscriptions.last_event_at` (already added by the migration) — reject events older than the last processed event for that subscription.
- **Sources covered:**
  - Stripe (`source='stripe'`): webhook is the sole writer.
  - Shopify (`source='shopify'`): future Shopify sync writes here; not currently implemented.
  - Manual (`source='manual'`): admin UI writes an entitlement row *and* leaves the existing `manual_access_grants` row in place for audit. See §4 for the historical-grant question.
  - Admin (`source='admin'`): user_role='admin' bypasses via `is_active_member()`; no entitlement row created.
  - Paused / cancelled / expired: `status` field on the same row; single ledger record per subscription.

I recommend triggers over RPC-only for the mirror because they cannot be bypassed by ad-hoc admin SQL. The RPC path is what edge functions and the app use for writes; the trigger is what protects the invariant.

---

## 4. Manual access grant semantics

**Aggregate report (no user IDs):**

| metric | count |
| --- | --- |
| Distinct users with **any active grant** | 5 |
| Users active-only in `remembrance` | 0 |
| Users active-only in `devotion` | 0 |
| Users active-only in `communion` | 0 |
| Users active in **multiple buckets** | 5 |
| Distinct bucket keys ever used | 2 (`remembrance`, `devotion`) |
| Active `remembrance` grants | 5 |
| Active `devotion` grants | 5 |
| Very long grants (>365 days out) | 0 |
| Earliest active start | 2026-03-26 |
| Latest active end | 2026-12-30 |

All 5 active-grant users hold *both* `remembrance` and `devotion` grants and *no* `communion` grant. Under the new `is_active_member()`, these users now silently gain full-app access including `communion` — content they were not previously granted (live sessions, replays, workshops, etc.). This is a real semantic expansion, small in blast radius (5 users) but non-trivial.

**Proposed migration semantics for historical grants (not applied):**

I recommend two migrations, in order:

1. **Preserve historical scope.** Change `is_active_member()` so that a `manual_access_grants` row grants full app access only when its `bucket_key` is a new sentinel value (proposal: `bucket_key = 'membership'`). Historical bucket-scoped rows (`remembrance`, `devotion`, `communion`) remain honored by the pre-existing bucket-checking functions (`has_bucket_access(...)`, `can_view_lesson_by_door`), which we would revert to per-bucket logic — but only for the manual-grant path.
2. **Admin review pass.** Surface those 5 users in an admin table with "convert to full-app manual entitlement" and "let existing grant expire" options. No automatic conversion. Each conversion writes an `entitlements` row (`source='manual'`) and a `founder_price_audit`-style audit entry, and terminates the historical bucket grants at `now()`.

Alternative (simpler but requires your explicit sign-off): treat all 5 users as intentional full-app comps, insert manual entitlements for them, and mark the historical grants as fulfilled. I do not recommend this without your review since you may know these users were scoped intentionally.

New full-app manual comps going forward would use a new admin UI that writes `manual_access_grants(bucket_key='membership')` and (optionally) a matching `entitlements` row. That new path is Phase 4-adjacent and not part of this remediation.

---

## 5. Backfill verification — aggregate counts

**Before → after** (both snapshots aggregate; no user data):

| metric | before | after (now) | notes |
| --- | --- | --- | --- |
| Active subscriptions | 0 | 0 | table has 0 rows |
| Trialing subscriptions | 0 | 0 | trials retired |
| Past-due subscriptions | 0 | 0 | |
| Paused subscriptions | 0 | 0 | |
| Cancelled subscriptions | 0 | 0 | |
| Expired subscriptions | 0 | 0 | |
| Active entitlements | — | 0 | table did not exist before |
| In-grace entitlements | — | 0 | |
| Cancelled entitlements | — | 0 | |
| Profiles `is_active_member=true` | — | 0 | column did not exist before |
| Founding member rows | — | 0 | |
| Active manual grants | 10 | 10 | 5 users × 2 buckets each |
| Admin users | 2 | 2 | |
| Total profiles | 15 | 15 | |

**Discrepancy check.** Qualifying subscriptions (0) vs. profiles receiving access via profile column (0): match. Qualifying subscriptions (0) vs. entitlements (0): match. Users effectively receiving access via `is_active_member()` right now: 2 admins + 5 manual-grant users = **7 accounts** (matches expectation, see §4 for the semantic expansion note).

---

## 6. RLS and access tests — reasoning report

I did not fabricate `auth.uid()` sessions in the DB; instead I traced every gate through the current functions. Results table (predicted behaviour of the *current* code, prior to any §2/§3/§4 fixes):

| Persona | Cards (paid deck) | Cards (free/starter) | Courses/Lessons | Resources | Protocol Builder | Tools | Live sessions | Replays | Journals/Readings/etc. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Anonymous | no | free/starter only | no | no | no | no | no | no | no |
| Authed, no membership | no | free/starter only | no | no | no | no | no | no | own only |
| Active member (entitlement `active`, ends in future) | via deck purchase or free/starter or membership | yes | yes | yes | yes | yes | yes | yes | own only |
| Trialing | n/a (removed) | | | | | | | | |
| Past-due, no `grace_until` | **grants access — DEFECT** | ditto | ditto | ditto | ditto | ditto | ditto | ditto | own only |
| Inside valid `grace_until` window | grants access (correct under §2 fix) | | | | | | | | |
| After grace expiry | should be no; today: still yes if `ends_at` still future — **DEFECT** | | | | | | | | |
| Cancelled before period end (`ends_at > now()`) | grants access via `active`/`in_grace` until `ends_at` | | | | | | | | |
| Fully terminated (`status='canceled'`) | no | free/starter only | no | no | no | no | no | no | own only |
| Paused (`status='paused'`) | no (paused not in the allowlist) | free/starter only | no | no | no | no | no | no | own only |
| Manual-grant holder (any bucket) | full app access — **SEMANTIC EXPANSION vs. prior model** (see §4) | | | | | | | | |
| Administrator | full app access | | | | | | | | full app access |
| Individual deck purchase | that deck only unless also an active member | | | | | | | | |

Notes on private data (journals, readings, playlists, protocols, tracking, tool entries): all still gated by their pre-existing `auth.uid() = user_id` policies. The Phase 1 migration did not change any of those policies. Encryption keys unchanged.

Everything under "DEFECT" or "SEMANTIC EXPANSION" is addressed by the §2, §3, and §4 proposals.

**Not yet done.** I did not execute an end-to-end runtime test with real `auth.uid()` sessions per persona. Recommended before Phase 2 lands: a small `pgTAP`-style script (or one edge function per persona using service-role impersonation) that asserts each row of the table above. I will build this only when you approve.

---

## 7. Data and rollback

**Changes already applied to the database (single migration `20260720032358`):**

- Created tables: `app_settings`, `entitlements`, `founding_members`, `founder_price_audit`.
- Altered `profiles`: added `is_active_member`, `active_member_since` (nullable except `is_active_member` NOT NULL DEFAULT false).
- Altered `subscriptions`: added `last_event_at` (nullable).
- Replaced function bodies (signatures preserved): `is_active_member`, `get_member_state`, `has_bucket_access`, `can_view_lesson`, `can_view_lesson_by_door`, `can_view_card`, `has_active_membership`.
- Backfilled `entitlements` from `subscriptions` (produced 0 rows).
- Backfilled `profiles.is_active_member = true` where a matching entitlement exists (updated 0 rows).

Plus, in a subsequent data write in the same session: `app_settings.founding_beta_starts_at` was set to a timestamp value. See §1.

**Which database.** The Lovable Cloud managed Supabase instance for this project. There is a single environment; there is no separate preview/production database on this project.

**Application code deployed publicly?** The migration is applied to the DB. The application-code changes from Phase 1/6 (new hook, refactored `useTierAccess`, `FounderBadge`, `/devotion/healing-bot` redirect, docs files) are in the working tree and preview build. The published (production) app has **not** been redeployed by me — you control publish. If the published app is currently older than these changes, published users are unaffected by the code refactor and only affected by the DB migration.

**`use_new_entitlement_model` flag — has effect?**

**No.** A repo-wide search shows the key exists only in the migration seed. Nothing in the app or edge functions reads it. Toggling it today changes nothing. If you want a functioning kill-switch, I need to wire it into `is_active_member()` (short-circuit to the legacy tier-based path when false). I will not implement that unless you ask.

**Non-destructive rollback / disable procedure (proposal, not executed):**

1. Restore the *previous* bodies of the seven access functions listed above. They are `CREATE OR REPLACE` — the migration overwrote them, so rollback is another `CREATE OR REPLACE` migration with the pre-Phase-1 bodies. I will need to reconstruct these bodies from the earlier migration files; they are recoverable.
2. Leave the new tables and columns in place. They are additive and unused by pre-Phase-1 code. Zero data loss.
3. Revert application code by reverting the two turns' file changes — no destructive DB action required.
4. If you would rather flip a switch than roll back, approving the "wire `use_new_entitlement_model`" task above makes the flag actually work.

**Untouched data — confirmed by inspection of the migration file:** journals, readings, protocols (areekeera + healing), tracking (all `*_logs`, `*_entries` tables in the tools schemas), playlists, `user_encryption_keys`. None of these tables or their policies are referenced by the migration.

---

## 8. Maelin — confirmation

- **Route redirect present.** `src/App.tsx` line 100: `<Route path="/devotion/healing-bot" element={<Navigate to="/devotion/areekeera" replace />} />`. Verified.
- **`healing_conversations` table intact.** 0 rows (there is no pre-existing usage to preserve, but the table and RLS policies remain).
- **`healing_bot` edge function preserved.** Directory `supabase/functions/healing-bot/` untouched by Phase 1/6.
- **`HealingBot.tsx` component preserved.** File still on disk, unmounted from routing.
- **Nav references.** Repo-wide search for "Maelin", "HealingBot", "healing-bot" outside of `HealingBot.tsx`, the App route, and the deprecation doc: **no remaining hits in `DoorOfDevotion`, `Temple`, or `src/components/`**. Nothing user-facing still recommends Maelin.

---

## 9. Test and build evidence

- **Typecheck:** `bunx tsgo --noEmit` → **exit 0**, no output. Clean.
- **Build:** not run in this turn. The build harness runs automatically on file writes; the last write in this session produced no reported build errors.
- **Lint (ESLint):** not run in this turn.
- **Automated tests:** the project has no test suite (no `vitest`/`playwright` config detected). No tests were added for Phase 1.
- **Supabase DB linter:** 43 warnings — all pre-existing and unrelated to Phase 1 (public extensions, public bucket listing on content buckets, permissive SECURITY DEFINER exposure that predates this work). Not introduced by the migration.
- **Runtime errors in preview:** none reported to me. I did not drive Playwright against the preview this turn.

**Coverage still missing (all recommended before Phase 2):**

- `pgTAP`-style persona tests for §6.
- A webhook unit/integration test for the entitlement upsert path.
- An E2E smoke test of `/devotion/healing-bot` → `/devotion/areekeera` redirect.
- ESLint run (fast; can produce alongside next migration if you approve one).

---

## 10. Process control

Nothing was modified in response to this message. The plan above enumerates the corrective work; each item is gated on your explicit approval before it becomes a build-mode action. If you approve, I recommend this ordering:

1. Reset `founding_beta_starts_at` to `null` (§1).
2. Apply the corrective `in_grace` migration (§2).
3. Add the entitlements trigger + `upsert_entitlement` RPC and rewrite the Stripe webhook to use them (§3).
4. Decide the historical-manual-grant policy and, if converting, run the one-shot audit migration (§4).
5. Wire `use_new_entitlement_model` into `is_active_member()` so the kill-switch is real (§7).
6. Add persona/RLS tests (§9).
7. Only then proceed to Phase 2 (public homepage), Phase 4 (Temple redesign), or Phase 5 (copy sweep).

I will wait for your direction on which of steps 1–6 to bundle, and in which order.
