# Mirror Exchange — Correction Addendum (read-only verification pass)

No code, schema, RLS or config was changed. All findings verified against `public.get_member_state`, `public.has_full_temple_access`, `public.is_active_member`, `useMemberState.ts`, `useTierAccess.ts`, and `_oracle_access_run_tests()`.

---

## 1. Canonical access matrix (verified)

The canonical decision for gating Mirror Exchange is `public.has_full_temple_access(uuid)` (mirrored in TypeScript by `useMemberState.hasFullTempleAccess`, which derives from `is_admin OR is_active_member OR manual_full_access.state='active'`). Manual state is computed in `get_member_state` in the order: active canonical grant → active dated legacy window → scheduled → expired → revoked_only → none.

`is_active_member(_user_id)` returns TRUE if ANY of:
- `user_roles.role = 'admin'`, OR
- `profiles.subscription_status IN ('active','trialing')`, OR
- `entitlements` row with `product_kind = 'app_membership'`, non-test environment, `(ends_at IS NULL OR ends_at > now())`, AND `(status='active' OR (status='in_grace' AND grace_until > now()))`.

| # | State | `has_full_temple_access` | Supporting branch |
|---|---|---|---|
| 1 | Active paid member | TRUE | `is_active_member` → `profiles.subscription_status='active'` and/or `entitlements.status='active'`. Test: `active_member_has_full`. |
| 2 | Failed renewal within 15-day grace | **TRUE** | `is_active_member` → `entitlements.status='in_grace' AND grace_until > now()`. Preserves access exactly as intended. |
| 3 | Failed renewal after grace | FALSE | `entitlements` no longer matches (grace expired, ends_at passed, or status flipped to `past_due`/`canceled`); no other source. |
| 4 | Cancellation scheduled at period end, paid period still active | TRUE | Stripe leaves `subscription_status='active'` until period end (webhook sets `cancel_at_period_end`, not status). `is_active_member` remains TRUE. |
| 5 | Cancellation after paid period ends | FALSE | `subscription_status` becomes `canceled`; entitlement window closed. |
| 6 | Active manual full-access grant | TRUE | Direct branch in `has_full_temple_access` (`starts_at <= now() < expires_at AND revoked_at IS NULL`). Test: `active_manual_has_full`. |
| 7 | Manual grant scheduled, not started | FALSE for gating | `get_member_state` classifies as `scheduled`; `has_full_temple_access` returns FALSE. UI shows `ScheduledAccess`. Test: `scheduled_denied`. |
| 8 | Manual grant expired | FALSE | Test: `expired_denied`. UI shows `ExpiredAccess`. |
| 9 | Manual grant revoked (revoked-only history) | FALSE | Test: `revoked_denied`. |
| 10 | Permanent/grandfathered legacy full access | TRUE while dated legacy window is live (`manual_access_legacy_bucket_history.starts_at <= now() < ends_at`). Any still-live row on pre-canonical `manual_access_grants` also counts. Test: `legacy_during_has_full`. There is **no truly permanent, undated** grandfathered path — permanence is expressed as a long-dated window. |
| 11 | No access | FALSE. Test: `nobody_denied`. |

**Contradiction with prior audit:** Section 1.2 / 5 / 8 of the previous audit said "grace/expired/scheduled/revoked all deny." That is wrong for grace. Valid failed-payment grace (row 2) **preserves** full Temple access via the `entitlements.in_grace` branch of `is_active_member`. Rows 3, 7, 8, 9 do deny. No regression found; the audit statement is corrected, not the system.

**Directive for Mirror Exchange:** reuse `has_full_temple_access(auth.uid())` / `useMemberState.hasFullTempleAccess` verbatim. Do not re-interpret grace, cancel-at-period-end, or manual states.

---

## 2. Corrected safety dependency order

Blocks must exist before any interpersonal surface. Reports must exist no later than the first surface that could be reported.

Revised staging:

```text
Stage 1  Foundations (non-interactive)
  community_profiles (owner-only, is_visible default FALSE)
  community_agreements + community_agreement_acceptances (append-only)
  mirror_adult_attestations (append-only)
  mirror_orientation_completions (append-only)
  mirror_participation_status (active | withdrawn | suspended)
  mirror_blocks  ← created here, no discovery surface yet
  mirror_exchange_ready() readiness helper (self-scoped)
  Door of Communion entry card, orientation → agreement → attestation → private profile only
Stage 2  Mirror profile detail (still private)
  Capacity, availability, preferences, topics can/cannot hold
  "Preview my Mirror card" (owner-only)
Stage 3  Matching & invitations
  Discovery RPC + invitation lifecycle — MUST join mirror_blocks bidirectionally
  mirror_reports created here (first reportable surface: invitations)
  Rate limiting at DB/edge
Stage 4  Messaging + scheduling + external call links
  Threads/messages with Realtime, block-aware RLS
  Scheduling with IANA tz; call-link storage with categorised allow-list
  Message retention policy decided immediately before this stage
Stage 5  Guided Mirror Call + private post-call safety check
Stage 6  Admin moderation queue, hardened rate limits, controlled release
```

**Recommendation:** Put the `mirror_blocks` foundation in Stage 1, not Stage 3. Trade-off: adds one table + RLS + a `SECURITY DEFINER` helper `public.mirror_is_blocked(a uuid, b uuid)` with zero user-visible surface, but guarantees that when Stage 3 opens discovery there is no window in which a block table is being added *concurrently* with the first query that must consult it. This is the safer default; the cost is one extra table in Stage 1.

---

## 3. Corrected community-profile privacy architecture

Full-row `SELECT` to all active members is rejected. Column-level minimisation is enforced via **projections**, not RLS.

Layered access model (design only, not implemented):

- **Owner** — full read/write on own `community_profiles` row.
- **Admin** — full read via `has_role(auth.uid(),'admin')`, write only through audited helpers.
- **Peer discovery (Stage 3+)** — restricted view or `SECURITY DEFINER` RPC returning only: `display_name`, `pronouns`, `avatar_url`, coarse `country`/`region`, `iana_timezone`, `languages`, short `bio_preview`. Never approximate town/city, never full topic lists in discovery.
- **Accepted pair (Stage 4+)** — expanded projection (topics can/cannot hold, in-person openness, city_approx) via a participant-gated RPC that verifies an accepted `mirror_connection` and no active block in either direction.
- **Call/contact fields (Stage 4+)** — separate table `mirror_scheduled_calls` with per-participant RLS; never joined into any profile projection.

**Safest Stage 1 posture (confirmed, not implemented):**
- `community_profiles.is_visible` default FALSE and effectively unused in Stage 1.
- RLS: `SELECT/UPDATE` only where `user_id = auth.uid()`; admin `SELECT` via `has_role`. **No** community-wide read policy.
- No view, RPC, or listing surface that returns other members' rows.
- GRANTs: `authenticated` SELECT/INSERT/UPDATE (rows self-scoped by RLS); `service_role` ALL. No `anon`.

---

## 4. Append-only consent & attestation model

Accepted. Consent evidence lives in dedicated append-only tables, not on `community_profiles`.

- `community_profiles` — editable identity/visibility only. No `adult_attested_at`, no `agreement_accepted_at`.
- `community_agreements(version, effective_at, body, is_current)` — versioned definitions; admin write only.
- `community_agreement_acceptances(user_id, agreement_version, accepted_at, policy_metadata jsonb)` — append-only, per-version. Immutability enforced by `BEFORE UPDATE/DELETE` trigger following the `*_immutable` pattern already used by `manual_access_grant_audit`.
- `mirror_adult_attestations(user_id, attested_at, policy_version)` — append-only 18+ attestation. No DOB collected.
- `mirror_orientation_completions(user_id, orientation_version, completed_at)` — append-only.
- `mirror_participation_status(user_id, status, updated_at)` — mutable state: `active | withdrawn | suspended`. Withdrawal flips this and sets `community_profiles.is_visible = false`. Historical acceptance rows are **never** deleted or updated. Re-participation appends new attestation/orientation/agreement rows against the then-current versions.

Correction/withdrawal semantics: a member corrects display data by updating `community_profiles`; she withdraws by setting `mirror_participation_status='withdrawn'` (owner-writable), which causes `mirror_exchange_ready` to return FALSE and hides visibility. She may withdraw the *forward-looking permission* freely; she cannot rewrite the *historical evidence* that at time T she attested/accepted. On material agreement version bump, `is_current` flips; readiness becomes FALSE until a new acceptance row is appended.

---

## 5. Locked product decisions — acknowledged

Applied verbatim to the revised Stage 1 scope: 18+ globally; visibility opt-in default off; chosen name display-only; agreement re-acceptance on material version change; in-app notifications only (deferred past Stage 1 since no interpersonal surface exists yet); no minimum tenure; grace preserves access per §1; retention decision deferred until immediately before Stage 4; no professional/matching-signal fields; no discovery/matching/messaging/scheduling/call links in Stage 1.

---

## 6. Readiness helper — safe design

Reject a single `public.mirror_exchange_ready(_user_id uuid)` callable with an arbitrary UUID by any authenticated user. Split into two:

- `public.mirror_exchange_ready_self()` — `SECURITY DEFINER`, `STABLE`, no argument. Uses `auth.uid()` internally, returns FALSE when `auth.uid() IS NULL`. This is the only helper the client (`useMemberState`-style hook) may call.
- `public.mirror_exchange_ready_for(_user_id uuid)` — `SECURITY DEFINER`, requires `has_role(auth.uid(),'admin')` OR `auth.uid() = _user_id`; otherwise returns FALSE (never raises, to avoid an oracle). Used by future admin surfaces and by trusted server-side callers (RPCs already running as `SECURITY DEFINER` under a verified identity).

Both return TRUE only when ALL hold:
1. `has_full_temple_access(user)` — canonical gate (row 1/2/4/6/10 of §1 matrix; grace preserved).
2. Latest `mirror_adult_attestations` row exists.
3. Latest `mirror_orientation_completions.orientation_version` matches the current required version.
4. Latest `community_agreement_acceptances.agreement_version` matches the current `is_current` agreement.
5. `mirror_participation_status.status = 'active'` (not withdrawn, not suspended).

**Visibility is NOT required for readiness.** A member may be oriented, attested, agreement-accepted, and participation-active while keeping `community_profiles.is_visible = false`. Discovery listings will additionally filter on visibility; readiness does not.

Spoofing surface eliminated: no client caller can inspect another member's readiness, no error path leaks existence, and admin checks go through `has_role`.

---

## 7. External-link correction (design note only, not authorised this pass)

- Split link categories: **video/audio call** vs **messaging/contact** vs **generic external**. Each has its own allow-list and its own UX warning.
- Do not treat `wa.me` as a call link. It typically opens a WhatsApp text conversation and can reveal phone numbers; if WhatsApp calls are supported at all, they require a distinct scheme/host set, and phone numbers remain private unless a member explicitly shares them post-acceptance.
- No arbitrary custom URI schemes.
- No blanket "HTTPS is fine" rule. HTTPS-but-unlisted links receive an explicit warning surface, never silent acceptance.
- Concrete host patterns for Zoom / FaceTime / Google Meet / WhatsApp will be enumerated at Stage 4 planning, not now.
- Phone numbers, personal emails, and other contact data remain private by default; disclosure is a pair-only, opt-in action.

---

## Corrected Stage 1 scope (non-interactive foundations)

Ship only:
1. `community_profiles` — owner/admin only, `is_visible` default FALSE, no discovery surface.
2. `community_agreements` (versioned, admin-managed) + `community_agreement_acceptances` (append-only, immutable trigger).
3. `mirror_adult_attestations` (append-only, immutable trigger).
4. `mirror_orientation_completions` (append-only, immutable trigger).
5. `mirror_participation_status` (active | withdrawn | suspended; owner may withdraw, admin may suspend).
6. `mirror_blocks` + `public.mirror_is_blocked(a,b)` helper. No surface consumes it yet, but the primitive is in place for Stage 3.
7. `public.mirror_exchange_ready_self()` and `public.mirror_exchange_ready_for(uuid)` per §6.
8. Route `/communion/mirror-exchange` gated by `useMemberState.hasFullTempleAccess`, walking orientation → agreement acceptance → adult attestation → private profile creation, and stopping. No matching, no invitations, no messaging, no scheduling, no call links, no notifications, no discovery listing.
9. One new card in `DoorOfCommunion.tsx` `categories` array. No changes to the Door's access predicate.
10. Regression: `_oracle_access_run_tests()` (13/13) plus any earlier canonical suites remain green after Stage 1 migration; add Stage-1-specific RLS tests covering owner-only reads, append-only immutability, and `mirror_exchange_ready_*` correctness across the §1 access matrix (including the grace row).

---

## Remaining blockers before writing the Stage 1 Build instruction

None. The corrections above are self-contained decisions. The following are **implementation choices** to make at Build time, not verification blockers:

- Exact column list for `community_profiles` (safe to draft in the Build instruction).
- Whether `mirror_participation_status` is a single-row-per-user table (recommended) or a history table plus a materialised current-status view.
- Wording of the initial `community_agreements` v1 body and orientation content (product copy, not architecture).

**Verdict: the codebase is ready for a precise Stage 1 Build instruction on the corrected scope.**