# The Mirror Exchange — Read-Only Architecture & Feasibility Audit

Scope: assessment only. No code, migrations, schema, config, or UI changes are proposed for this pass. Findings below are grounded in the current codebase and live database (`information_schema` + `public` inspection performed this turn).

---

## 1. Current relevant architecture

### 1.1 Door of Communion (entry point candidate)

- Route: `/communion` → `src/pages/DoorOfCommunion.tsx`.
- Categories currently rendered as cards (hard-coded array `categories` in that file): Live Readings, Live Classes, Live Workshops, Live Meditation Classes, All Sessions, Live Replays. There is no CMS backing this list — it is a static array.
- Sub-routes registered in `src/App.tsx`:
  - `/communion/live-readings`, `/communion/live-classes`, `/communion/live-workshops`, `/communion/live-meditations`, `/communion/live-replays`, `/all-live-sessions`, `/all-live-sessions/:sessionId/join`.
- Access enforcement inside `DoorOfCommunion.tsx`:
  - Auth check via `supabase.auth.getSession()` + `onAuthStateChange` redirect to `/auth`.
  - Content gate via `useTierAccess().hasAccess('communion')`, which in the current one-membership model is equivalent to “admin OR active member OR active manual full-access grant.”
- Safest entry point: a new card in the existing `categories` array pointing at `/communion/mirror-exchange`. It naturally inherits the Door’s access gate and NavActions header. No changes to `DoorOfCommunion.tsx`’s access logic are required.

### 1.2 Membership & authentication (reuse unchanged)

- Canonical entitlement decision lives in `public.get_member_state(uuid)` and `public.has_full_temple_access(uuid)` (confirmed in DB routines list).
- Frontend hooks: `src/hooks/useAuth.tsx` (user/session/admin), `src/hooks/useMemberState.ts` (canonical `hasFullTempleAccess`, `entitlementSource`, `error`, manual-grant state machine), `src/hooks/useTierAccess.ts` (compat shim already routed through `get_member_state`).
- Route guard pattern in use across Temple pages: session check → `useMemberState` / `useTierAccess`. `ExpiredAccess.tsx` and `ScheduledAccess.tsx` already cover the grace/expiry/scheduled transitions.
- No age or adult-participation attestation exists anywhere in the codebase or DB. This is a gap for a member-to-member feature.

### 1.3 Existing profiles (partial reuse only)

`public.profiles` columns confirmed via information_schema:
`id, email, full_name, full_name_encrypted, is_encrypted, must_change_password, member_tier_code, plan_cadence, subscription_status, current_period_end, stripe_customer_id, newsletter_opt_in, is_active_member, active_member_since, created_at, updated_at`.

- Reusable: `id`, `full_name` (as display fallback), auth linkage.
- Absent and required later: avatar/photo, chosen community name, pronouns, country/region/city, IANA time zone, languages, bio/intro, community-profile visibility flag, adult-attestation flag, community-agreement acceptance record.
- `profiles` is currently a private/self-service table (based on `Profile.tsx` reads only `.eq("id", session.user.id)`). There is no public/community-visible profile surface anywhere.

### 1.4 Database & security conventions (reuse patterns)

- RLS + explicit GRANTs are the house pattern; `service_role` and `authenticated` grants on every public table.
- SECURITY DEFINER + `set search_path = public` functions are used for cross-table authorization (`has_role`, `has_full_temple_access`, `is_active_member`, `has_any_manual_access`). Appropriate reuse pattern for Mirror Exchange gating helpers.
- Soft-delete / audit patterns present: `manual_access_grant_audit`, `manual_access_legacy_bucket_history`, `founder_price_audit`, `stripe_webhook_events` — all use immutable-append triggers (`*_immutable`). Good template for Mirror Exchange moderation and message-deletion audit trails.
- Existing admin-review UI: `src/pages/BugReports.tsx`, `src/pages/FeatureSuggestions.tsx`, `src/pages/UserManagement.tsx` — provide the layout/idiom for a future admin moderation queue.

### 1.5 Messaging, realtime & notifications

- No member-to-member messaging table exists. `healing_conversations` is user↔bot only.
- Supabase Realtime is used exactly once (`src/hooks/useResourceEditLock.ts`) for CMS edit-lock presence. No `postgres_changes` subscriptions anywhere. No realtime infrastructure to reuse for chat.
- No in-app notifications table, no unread-count pattern, no email-notification edge function (`ls supabase/functions/` shows none matching `notif|email|invite|reminder`). MailerLite sync (`mailerlite-sync`) is for newsletter opt-in only, not transactional.
- No rate limiting or abuse protection at the data layer.

### 1.6 Scheduling

- `LiveSessions.tsx`, `SessionCalendar.tsx`, `useLiveSessions.ts` handle admin-scheduled Zoom sessions with fixed date/time columns.
- No availability windows, recurring appointments, per-user time-zone conversion, or reminder jobs exist. `pg_cron` runs only for `publish-scheduled-content` (content release).
- Date formatting uses `date-fns` (implied by other files); no timezone library confirmed. `src/lib/manualAccessDates.ts` demonstrates the project’s Melbourne-timezone convention with `Intl.DateTimeFormat`.

### 1.7 Safety & moderation

- No block, report, mute, or community-agreement tables exist.
- No adult / age attestation. No consent record.
- Admin review UI exists in idiom but not scoped to member-to-member content.
- Data-retention conventions: audit tables are append-only; content-lifecycle is soft-delete via status columns (e.g. resource `status`).

### 1.8 Interface & design system

Reusable primitives found: shadcn `Card`, `Dialog`, `Input`, `Textarea`, `Select`, `Badge`, `Button`, `Switch`; framer-motion for entry animation; `PageBreadcrumb`, `NavActions`, `ProfileDropdown` for header consistency; `useToast` for feedback. Mobile-responsive `md:` / `lg:` grid patterns and DoorOpen-icon idiom are established in `ExploreDoors.tsx` and `DoorOfCommunion.tsx`. Empty-state and access-denied patterns are demonstrated on `DoorOfCommunion.tsx` and `ExpiredAccess.tsx`.

### 1.9 External call links

- No URL sanitization / allow-list utility exists. `src/lib/utils.ts` is a `cn()` helper only.
- Vimeo embed handling (`VimeoEmbed.tsx`) is the closest analogue but assumes a trusted single provider.
- No pattern exists for revealing sensitive fields (like a call URL) only to two specific participants — this must be created.

---

## 2. What can be reused unchanged

- Auth + session listener idiom (`useAuth`, `onAuthStateChange`).
- Canonical entitlement gate (`useMemberState.hasFullTempleAccess`, `has_full_temple_access(uuid)` SQL).
- Door layout, header, breadcrumb, motion, and card idiom (`DoorOfCommunion.tsx`).
- shadcn UI primitives and toast.
- SECURITY DEFINER + audit-trigger pattern for moderation records.
- `manualAccessDates.ts` timezone conventions.

## 3. What should be extended

- `profiles` — either extended with community fields (avatar_url, chosen_name, pronouns, country/region/city, iana_timezone, languages[], bio, community_visible, adult_attested_at, agreement_accepted_at) or a parallel `community_profiles` table keyed 1:1 to `profiles.id`. A parallel table is safer because it keeps identity/billing separate from community disclosure and simplifies RLS visibility rules.
- `DoorOfCommunion.tsx` `categories` array — add one entry pointing at the new route. No logic changes.
- `useMemberState` remains the single gate; no fork.

## 4. What must be created

- Mirror Exchange schema (Stage 1 skeleton only for this feature): community profile, community agreement acceptance ledger, orientation-completion record.
- Later stages: capacity/availability, invitations, conversations, messages, scheduled calls (with external call-link column), post-call safety checks, reports, blocks, admin moderation queue.
- URL validation utility with a strict provider allow-list (zoom.us, facetime, meet.google.com, wa.me/whatsapp, plus a generic https allow rule with warning).
- In-app notifications table + unread badge hook, and a reminder edge function driven by `pg_cron`.
- Realtime subscription pattern for 1:1 message threads (new territory — only one existing user of Realtime).
- Admin moderation UI (new page, follows BugReports.tsx idiom).
- Adult / age attestation and community-agreement UI + audit records.

## 5. Security, privacy, moderation & access-control gaps (before any implementation)

1. No adult attestation exists — member-to-member connection cannot be safely offered without one.
2. No community agreement / consent record — the scope statement and Mirror “may / may not” rules are policy that must be logged per user acceptance.
3. No block/report/mute primitives — RLS on future messaging must join to a blocks table from day one to prevent contact after a block.
4. No moderation queue or admin-review workflow for member-authored content.
5. No rate limiting — invitations and messages must be rate-limited at DB/edge to prevent spam.
6. No PII visibility policy — phone numbers, emails and external call links must be RLS-restricted to the two accepted participants; profile visibility must be opt-in and revocable.
7. No notification/preferences infrastructure — must be built before email or in-app pings can fire.
8. No URL sanitization — malicious call-link risk.
9. Access on grace/cancellation/expiry: existing `useMemberState` already returns `hasFullTempleAccess=false` in those states, but Mirror-specific side effects (existing invitations, upcoming calls, active companion connection) will need explicit lifecycle rules (auto-pause vs. auto-cancel).
10. Deletion / retention — no policy yet for message history retention, right-to-erasure vs. audit-preservation for reports.

## 6. Recommended data model (high level, not to be created yet)

- `community_profiles` (1:1 with `profiles.id`): display_name, pronouns, avatar_url, country, region, city_approx, iana_timezone, languages[], bio, is_visible, adult_attested_at, agreement_version_accepted, agreement_accepted_at.
- `community_agreements`: versioned agreement text; append-only.
- `mirror_orientation_completions`: per-user completion of the orientation module.
- Stage 2+: `mirror_capacity` (current state enum), `mirror_preferences` (audio/video/either, in-person openness, call length, cadence, topics_can_hold[], topics_cannot_hold[], perspective_preference), `mirror_availability_windows`.
- Stage 3: `mirror_invitations` (from_user, to_user, kind: call|companion, status, expires_at).
- Stage 4: `mirror_connections` (accepted pair, kind, started_at, ended_at); `mirror_threads` + `mirror_messages` (RLS: participant-only, with join to `mirror_blocks`); `mirror_scheduled_calls` (start_at UTC, duration_minutes, call_link, provider, revealed_at).
- Stage 5: `mirror_call_safety_checks` (private per-participant).
- Stage 6: `mirror_blocks`, `mirror_reports` (with `mirror_report_audit` append-only).
- Every table paired with GRANTs, RLS enabled, participant-scoped policies, and a SECURITY DEFINER helper (e.g. `is_mirror_participant(user_id, thread_id)`) to avoid RLS recursion.

## 7. Dependency-aware staged plan

```text
Stage 1  Foundations
  community_profiles + agreement + orientation + adult attestation
  RLS: owner-only write, community-visible read only when is_visible
  Door of Communion entry card (locked behind orientation+agreement+adult)
  No matching, no messaging yet
Stage 2  Mirror profile detail
  Capacity, availability, preferences, topics can/cannot hold
  Read-only "preview my Mirror card" view
Stage 3  Matching & invitations
  Server-side suggestion RPC (SECURITY DEFINER), rate-limited
  Mutual invitation lifecycle (pending/accepted/declined/expired)
Stage 4  Messaging + scheduling + external call links
  Threads/messages with Realtime, blocks-aware RLS
  Scheduling with IANA tz conversion
  External call-link storage with provider allow-list, revealed only to 2 participants
Stage 5  Guided Mirror Call page + private post-call check
Stage 6  Blocks, reports, admin moderation, rate limits hardened, controlled release
```

## 8. Testing requirements per stage

- Stage 1: RLS tests — non-owner cannot read hidden profile; visible profile readable only to active members; agreement acceptance is immutable; orientation gate blocks Stage-2 UI. Access-lifecycle: grace/expired/scheduled/revoked all deny.
- Stage 2: preference and capacity updates round-trip; visibility toggle removes profile from any listing RPC in same transaction.
- Stage 3: suggestion RPC never returns blocked users, non-visible users, expired members, or self; invitation state machine transitions cannot be forged from either side; rate limit enforced at DB.
- Stage 4: message insert RLS denies non-participants and blocked participants; call-link column masked to non-participants; timezone conversion tests around DST boundaries in Australia/Melbourne + one Northern-Hemisphere zone.
- Stage 5: safety check writes are private to author only, even from paired participant.
- Stage 6: report creation append-only; admin queue visible only to `has_role(auth.uid(),'admin')`; block prevents any subsequent invitation, message, or scheduled call.
- Regression: existing 67+ access tests (`_phase1_run_access_tests`, `_oracle_access_run_tests`, etc.) continue to pass after each stage.

## 9. Decisions / unknowns to clarify before Stage 1 implementation

1. Parallel `community_profiles` table vs. extending `profiles` — recommendation: parallel table.
2. Age threshold policy: 18+ globally, or configurable per region?
3. Agreement versioning behaviour: on version bump, do existing members lose access to Mirror Exchange until re-accepting?
4. Community-profile visibility default: opt-in (recommended) or opt-out?
5. Chosen community name — display-only, or replaces `full_name` throughout Temple? Recommendation: display-only, scoped to Mirror Exchange surfaces.
6. Retention: message history retention window and behaviour on member exit / block / report.
7. Notification channel priorities: in-app only for Stage 4, or email from Stage 4? Email requires new transactional infra (none exists).
8. Whether the Door of Communion access gate is sufficient, or Mirror Exchange requires a stricter gate (e.g. minimum tenure in the Temple before participation).

## 10. Risks of regression to existing systems

- Membership: extending `profiles` risks breaking `Profile.tsx` and `useAuth`/`useMemberState` reads. Mitigation: parallel table.
- Door of Communion: adding a card is low risk; changing the access predicate is not needed.
- Notifications: no existing pattern to preserve — greenfield.
- Newsletter/MailerLite: unaffected as long as new tables do not overload `newsletter_opt_in`.
- Live Sessions calendar: unaffected — Mirror Exchange must not reuse `live_sessions` (different lifecycle, different participants, different privacy).
- Auth flow: unaffected as long as new gates are additive (orientation + agreement + adult attestation) and share `useMemberState` as the outer gate.

---

## Recommended safest scope for Stage 1

Given zero existing infra for member-to-member interaction, Stage 1 should deliberately ship **no interpersonal surface**. It should install only the non-interactive foundations:

1. `community_profiles` (parallel to `profiles`), owner-only write, is_visible defaulted false, RLS in place from the first migration with GRANTs.
2. `community_agreements` (versioned, read-all-authenticated) and `community_agreement_acceptances` (append-only per user).
3. `mirror_orientation_completions` (append-only per user).
4. An `adult_attested_at` field on `community_profiles`.
5. A new page at `/communion/mirror-exchange` that: gates on `useMemberState.hasFullTempleAccess`, then walks the user through **read-only orientation → agreement acceptance → adult attestation → private community-profile creation** and stops there. No matching, no invitations, no messaging.
6. One new card in the existing `DoorOfCommunion.tsx` `categories` array.
7. A SECURITY DEFINER helper `public.mirror_exchange_ready(uuid)` returning true only when (a) `has_full_temple_access`, (b) adult attested, (c) current agreement accepted, (d) orientation completed. All later stages gate on this single function so the policy stays in one place.
8. Regression: existing access test suites re-run and expected to remain green.

This lands the entire safety/consent/identity substrate before any code exists that could allow two members to reach each other, which is the correct order for a peer-processing feature.
