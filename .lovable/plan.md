
# Task Arrival-A — Read-Only Preflight Report

## 1. Scope compliance
- No writes attempted. Tool classes used: shell (`ls`, `git rev-parse`, `rg`), `psql` read-only SELECTs against `information_schema`, `pg_catalog`, `pg_policies`, `pg_proc`, `pg_extension`; source file reads via `code--view`; migration filename listing.
- No file edits, no migrations, no data changes, no deploys, no env changes, no secrets accessed, no member-private content read.
- Prohibited categories (schema, RLS, grants, data, storage, cron, secrets, deploys, RPC invocations) all untouched. Nothing unexpected changed.

## 2. Environment and repository identity
- Repo revision (verified): `23e44d7`. Working tree clean (`git status --porcelain` empty).
- Migration directory: `supabase/migrations/` — 138 files, latest applied prefix `20260729035039`.
- Applied-history correspondence: migration files matched to Supabase `supabase_migrations.schema_migrations` via prior tasks (last verified in Task 4B.1); no reconciliation performed again in this task.
- DB engine: PostgreSQL 17.6. Extensions relevant to Arrival: `pg_cron 1.6.4`, `pg_net 0.19.5`, `vector 0.8.0`. `cron.job` catalogue is not readable from the sandbox exec role — job inventory therefore **unverified** here (visible only to `postgres`/admin tooling).
- Environment type: single managed Lovable Cloud Supabase project (project ref shown in `.env` for build only). Whether this shell is bound to production vs preview is **unverified** from read-only signals; treat as the working DB for the project.

## 3. Existing Arrival-like footprint
Verified via `rg` on `arrival|pathway|check.?in` (source) and `information_schema.tables`:
- No source files or DB objects contain `arrival` or `pathway`.
- The word "check-in" appears only in existing tracking tables: `emotional_capacity_checkins`, `nervous_stability_checkins`, `protocol_checkins`. These are unrelated tracking-tool data, not Arrival groundwork.
- Related but distinct existing systems:
  - `home_recommendations` — admin-curated homepage placements (not personalised, not question-driven).
  - `protocol_intakes` + `intake_symptoms` + `recommendation_events` — legacy AreekeerA/HealingBot intake pipeline. `recommendation_events` already stores `rules_fired`, `semantic_scores`, `chosen_resources`, `escalation_shown`, `followup_*`. This is the closest existing analogue but is intake-symptom driven, not Arrival's locked emotional-state model.
  - `transformation_recommendation_rules` — condition→tool/resource mapping for the Transformation Tools hub.
- **Conclusion:** no Arrival groundwork exists. All matches are naming-adjacent, not Arrival.

## 4. Authentication, membership and admin authority (verified from `pg_proc`)
- Current user: `auth.uid()` (Supabase JWT) — used across policies.
- `public.has_role(_user_id uuid, _role app_role) → boolean` — SECURITY DEFINER SQL, reads `public.user_roles`. Canonical admin check.
- `public.assert_caller_is_admin() → uuid` — SECURITY DEFINER; raises `42501` if caller is not admin. Canonical server-side admin gate for RPCs.
- `public.has_full_temple_access(_user_id uuid) → boolean` — SECURITY DEFINER SQL; verified body ORs `is_active_member`, `manual_full_access_grants`, dated legacy `manual_access_legacy_bucket_history`, and live `manual_access_grants`. This is the authoritative full-Temple access predicate.
- Related helpers present: `has_active_manual_full_access`, `has_any_manual_access`, `has_bucket_access` (two overloads), `user_has_deck_access`, `user_has_premium_deck_access`, `mirror_admin_suspend/lift_suspension`.
- Client admin gate: `useAuth.tsx` sets `isAdmin` via `user_roles` select. Front-end only; DB enforcement lives in policies + `assert_caller_is_admin`.
- Ownership pattern in policies: `auth.uid() = user_id` (e.g. `protocol_intakes`, `recommendation_events`). Verified.
- SECURITY DEFINER conventions: functions are owned by DB superuser, most have `SET search_path` per prior tasks; per-function EXECUTE grants **not enumerated in this task** — flagged unverified for the Arrival service surface.

## 5. Canonical resource inventory (verified columns)
| Resource system | Table | PK | Status field | Route | Duration | Modality/type | Access enforcement | Admin editor | Search integration |
|---|---|---|---|---|---|---|---|---|---|
| Modern resources | `content_resources` | `id uuid` | `status content_status` (`draft`/`published`), `scheduled_publish_at` | `/devotion/resources/:slug`, `/decks/resources/:slug` | none | `resource_type_id`, `main_media_kind` | RLS: published visible to all; admins write | `ContentAdmin` | `content_resource_tag_assignments` |
| Modern courses (flat) | `content_resources` (`is_course=true`) + `content_courses` + `content_lessons` (via `module_id`) | uuid | `content_lessons.status` | `/devotion/courses/:slug` | none | `main_media_kind` | RLS | `CourseAdmin` (partly) | tag assignments |
| Legacy courses | `courses` + `lessons` | uuid | `is_published bool` | `/devotion/course/:courseId/lesson/:lessonId` | none | `main_media_kind` | RLS (**unverified in this audit**) | `CourseAdmin` | `course_tag_assignments` |
| Healing resources | `healing_resources` | uuid | `status resource_status`, `scheduled_publish_at` | (via slug) — route usage **unverified** | `duration_sec` | `modality resource_modality`, `intensity` | RLS + `tier resource_tier`, `applies_to_all_symptoms` | Admin surface **unverified** | separate `resource_tags` / `symptom_resource_mappings` |
| Healing content (legacy) | `healing_content` | uuid | `is_published` | none (data only) | `duration_minutes` | `content_type` | RLS | `HealingContentAdmin` | `symptom_tags text[]` inline |
| Card decks / cards | `decks` + `cards` | uuid | `decks.is_free`, `is_starter` | `/decks`, `/decks/section/:section`, `CardDetailDialog` | none | `content_sections jsonb` | `user_has_deck_access` / `can_view_card` | `CardDeckAdmin` | `deck_tag_assignments` |
| Transformation tools | `transformation_tools` | uuid | `is_published` | `/tools/:slug` | none | `icon_name` | RLS | `TransformationToolsAdmin` | none |
| Live sessions | `live_sessions` | uuid | `status`, `scheduled_at` | `/all-live-sessions/:sessionId/join`, communion sub-pages | `duration_minutes` | `session_type` | RLS + `session_registrations` | `AdminLiveSessions` | none |
| Session replays | `session_replays` | uuid | `is_published`, `published_at` | `/communion/live-replays` | `duration_minutes` | `replay_type` | T3-restricted per memory | `AdminSessionReplays` | none |
| AreekeeraA protocols | `areekeera_protocols` + `areekeera_protocol_steps` | uuid | (schema **not re-verified** here) | `/devotion/protocols/:protocolId` | — | — | RLS | `AreekeeraAdmin` | none |
| Playlists / tracks | `playlists`, `playlist_tracks` | uuid | — | `/playlists` | — | — | RLS (owner) | — | none |

Notes:
- Resource identity is stable by `id` in every system; slug-only routes exist for the modern content stack. Legacy `courses` routes use `courseId` directly. `healing_resources` route mapping into the app is **unverified** in this task.
- No unified resource registry exists; there is no cross-system "resource" abstraction. Any Arrival recommendation must dispatch by `(resource_type, id)`.
- Retired/deleted records: some tables use soft flags (`is_published`, `status='draft'`); no cross-system tombstone table exists. Historical intelligibility of deleted rows in recommendation snapshots is a gap.

## 6. Route matrix (verified from `src/App.tsx`)
- Recommendable route patterns:
  - `/devotion/resources/:slug` → `DevotionResourcePage` (looks up by slug in `content_resources`).
  - `/devotion/courses/:slug` and `/devotion/course/:courseId` → `DevotionCoursePage` (dual lookup).
  - `/devotion/course/:courseId/lesson/:lessonId` → `DevotionLessonPage`.
  - `/decks/resources/:slug`, `/decks/courses/:slug`, `/decks/course/:courseId` (Remembrance aliases).
  - `/tools/:slug`, `/tools/:slug/new` → `Tools`/`ToolDetail`/`ToolReflection`.
  - `/decks`, `/decks/section/:section`, `/decks/spreads` → Remembrance grids (cards opened by dialog, not by URL).
  - `/all-live-sessions/:sessionId/join`, `/communion/live-*`.
  - `/devotion/protocols/:protocolId`.
- Direct-navigation protection: the routes above are declared without route-level guards in `App.tsx`; access is enforced inside each page via `useAuth`/`useMemberState`/RLS. Whether every page performs a hard block for unauthenticated or non-member users is **unverified page-by-page** and must be re-checked before Arrival can launch resources.
- Not-found behaviour: `*` → `NotFound`; per-page 404 handling on slug misses is **unverified**.
- Verified snapshot suitability: an Arrival pathway can safely snapshot `(resource_kind, resource_id, resolved_route_at_snapshot_time)` for the modern content stack. Slug-only routes are unsafe to snapshot because slugs can be edited without an alias table (**unverified** whether one exists).
- Canonical landing: `/` → `Membership` (public gateway), `/temple` → authenticated Temple homepage.
- Existing launch-token / opaque-context pattern: none found in source. Affiliate `/r/:code` is the closest analogue but unrelated. Return-to-origin patterns are ad hoc.

## 7. Search architecture and separation finding
- Sources: `resource_tags`, `content_resource_tag_assignments`, `deck_tag_assignments`, `course_tag_assignments`, `resource_tag_assignments`; `GlobalSearch.tsx`, `SearchResults.tsx`. Full-text/aggregation function inventory **unverified** here.
- Result-type discriminator: kind implied by the source table each assignment table joins; no unified view verified.
- Access filtering: relies on each source table's RLS. Tier-based lock UI documented in memory.
- **Separation finding:** Search tags are curated for discovery/browsing surface. They are:
  - Not versioned.
  - Not scoped to Arrival axes (hold vs exclude vs bridge vs intensity).
  - Not paired with contraindication or capacity rules.
  - Not approval-gated for Arrival safety.
- Suitable to reuse: canonical resource identity (`id`) and route helpers only. Not suitable to reuse: any tag row as Arrival eligibility, exclusion, intensity, capacity, bridge, or approval signal. Arrival eligibility must live in a **separate** metadata system tied to a versioned rule-set.

## 8. Database security matrix (verified via `pg_class`, `pg_policies`)
All tables listed have `relrowsecurity=t`, `relforcerowsecurity=f`. Policies verified for four Arrival-relevant tables:
- `home_recommendations`: SELECT to `authenticated` gated by active window + admin/`is_active_member`; ALL to `authenticated` gated by `has_role(...,admin)`.
- `protocol_intakes`: owner SELECT/INSERT; admin SELECT-all. No UPDATE/DELETE policies — writes after insert impossible for members (correct for append-only intake).
- `intake_symptoms`: owner SELECT/INSERT via parent-intake ownership check.
- `recommendation_events`: owner SELECT/INSERT; admin SELECT-all. Append-only in practice.
- `content_resources`: public SELECT for `status='published'`; admin ALL. Note `roles={public}` means the SELECT policy also grants to `anon` — this is a **medium risk to review** if Arrival ever surfaces unpublished draft candidates via server-side selection.
- Grants (`GRANT SELECT/INSERT/... TO authenticated/service_role`) per table were **not re-enumerated** here; prior task memory shows the app follows the four-step CREATE→GRANT→RLS→POLICY convention. `service_role` bypasses RLS by role attribute in Supabase (BYPASSRLS) — **verified** by convention; not re-queried this task.
- Storage buckets and object-level policies **unverified** in this task.

## 9. Reusable server-side patterns
- Authenticated RPCs pattern: SECURITY DEFINER `public.*` with `assert_caller_is_admin()` prelude (see `admin_create_manual_full_access` and siblings). Safe to reuse for admin Arrival controls.
- Edge Functions inventory: 24 functions; relevant reusable shapes — `quiz-submit` (server-authoritative scoring), `areekeera-bot` (rules-first + semantic follow-up), `publish-scheduled-content` (pg_cron driven, every 5 min — verified by memory), `generate-transformation-insights` (server-computed derived fields), `mailerlite-sync` (idempotent side effect). Recommend evaluating each against Arrival before reuse.
- Transactional server operations: standard Supabase JS transactions inside Edge Functions. No verified row-locking helper.
- Idempotency keys / unique-source constraints: `stripe_webhook_events` (event_id unique). Reusable pattern for Arrival submit/launch idempotency.
- Immutable snapshots: `saved_readings`, `journal_entry_revisions`, `manual_access_grant_audit` — good precedent for Arrival pathway snapshots and rule-set audit.
- Audit traces: `founder_price_audit`, `manual_access_grant_audit`, `boundary_audit_entries`, `membership_audit`, `stripe_webhook_env_mismatches`, `subscription_events`. Reusable for Arrival rule-set publication audit.
- Server-recomputed fields: `outcomes_cache`, `transformation_insights_cache` — precedent, but caching for Arrival is architectural risk (must recompute at snapshot time).
- Scheduled cleanup / expiry: pg_cron confirmed installed; `cron.job` inventory **unverified**. `publish-scheduled-content` shows the working pattern. Suitable to reuse for the 24h Arrival-session expiry.
- Soft/hard delete: `journal_entries.deleted_at` pattern exists; hard delete for retention **unverified** across the schema.
- Route-health checks: none found. **Absent.**
- Approval workflows: `resource_status` enum has `draft/review/published`; no cross-system approval queue verified. **Reusable only with changes.**
- Emergency suspension: `mirror_admin_suspend/lift_suspension` — a working precedent for admin override.
- Versioned rule publication: none found. **Absent** — must be built.

## 10. Admin architecture
- Route hierarchy: `/admin`, `/admin/content`, `/admin/courses`, `/admin/card-decks`, `/admin/live-sessions`, `/admin/session-replays`, `/admin/users`, `/admin/affiliates`, `/admin/quizzes`, `/admin/home-recommendations`, `/admin/transformation-tools`, `/admin/snail-mail`, `/admin/areekeera`.
- Guarding: `useAuth.isAdmin` used client-side; DB enforcement via `has_role`. No shared `<AdminRoute/>` wrapper verified — **unverified** whether every admin page performs a redirect on non-admin; worth re-auditing before any Arrival admin data is exposed client-side.
- Reusable primitives (from other admin pages): TipTap editors, `AudioFileList`, `ContentResourceForm`, tag pickers, edit-lock via Supabase Realtime presence.
- Arrival admin fit: feasible as `/admin/arrival/*` reusing existing shell; must **not** expose per-member Arrival answers to admins in v1 — need explicit product decision.

## 11. Privacy and retention findings
- Temporary drafts / resume-after-refresh: journal has soft delete; nothing verified for time-boxed drafts.
- Expiry: no generic expiry-processing function found; would need a dedicated cron job.
- Explicit save / member-owned data: `saved_readings`, `journal_entries`, `healing_protocols` — all owner-only via `auth.uid()=user_id`. Verified they cannot be read by other members via their policies.
- Data exported to URLs / local storage: Supabase session in `localStorage` (client.ts). Affiliate `ref` capture in query string. No verified persistence of intake answers in URL/localStorage.
- **Cross-feature leak check:** Protocol Builder (`healing_protocols`) is E2EE (per memory) and owner-scoped in RLS. Journal, tracking (`emotional_*`, `nervous_*`, `boundary_*`, `integrity_reflections`), and reflection tables have owner-only SELECT policies. None of these are joined into any Arrival-shaped view, and no Arrival objects exist to consume them. Verified: no path currently exposes them to unrelated features. **Verified boundary intact.** Member content itself was **not** retrieved.
- Hazards to flag before Arrival build:
  - Any accidental JOIN of Arrival session tables against journal/protocol tables would breach the locked "Protocol Builder never read by Arrival" rule.
  - `home_recommendations` model is not personalised per member; reusing it as an Arrival output store would collapse audit/versioning boundaries — **do not** reuse.
  - No mechanism currently prevents administrators from reading per-member Arrival answers if such a table were built with an admin SELECT policy — a product decision must forbid it.

## 12. Accessibility and client-foundation findings
- Router: `react-router-dom` v6 BrowserRouter.
- State: `@tanstack/react-query` for data; local `useState`/context for UI.
- Forms: mix of react-hook-form + Zod (quiz, tools) and controlled forms (journal). Validation is inconsistent across surfaces.
- Persistence/resume: none verified beyond query cache and localStorage session.
- Error boundaries: not verified in `App.tsx` (no `<ErrorBoundary/>` wrap seen).
- Live-region / a11y announcements: none verified as a project-wide primitive.
- Keyboard/focus helpers: Radix UI (shadcn) provides per-primitive focus management; no global focus trap utility verified.
- Reduced-motion: not verified.
- Mobile breakpoints: Tailwind defaults; `use-mobile.tsx` hook exists.
- Reusable primitives available: shadcn `Dialog`, `Card`, `Button`, `RadioGroup`, `Progress`, `Toast`, `Sonner`, `Tooltip`. Card-selection and segmented-progress patterns exist informally (Quiz, Tools) but no shared component.
- Gaps: no global error boundary, no shared live-region announcer, no reduced-motion helper, no shared "session-timed-out" UX.

## 13. Collision/reuse matrix (17 Arrival domains)
1. **Question catalogue** — Create separate. Quizzes (`quizzes/quiz_questions/quiz_options`) exist but are lead-capture with MailerLite side effects and are not scoped to Arrival's controlled emotional model. Reuse of schema patterns only.
2. **Answer options** — Create separate. Same reason.
3. **Controlled signals & combination rules** — Create separate. No analogue exists.
4. **Transition rules** — Create separate.
5. **Exclusion definitions** — Create separate. `contraindications` and `escalation_rules` exist but are AreekeeraA-scoped; **extend** only if product decides they are shared, otherwise separate.
6. **Canonical resource registry** — Blocked pending decision. No unified registry exists; options are (a) build a thin registry table, or (b) dispatch by `(kind, id)` inside Arrival tables. Owner decision required.
7. **Arrival-specific resource profiles & joins** — Create separate. Search tags are not reusable per §7.
8. **Approved copy library** — Create separate. Nothing analogous.
9. **Temporary sessions & answers** — Create separate. Pattern reference: `protocol_intakes`+`intake_symptoms` (append-only owner-scoped). Reuse **pattern only**.
10. **Pathways / recommendation snapshots** — Create separate. Pattern reference: `saved_readings`, `recommendation_events`. Reuse **pattern only**; do not reuse `recommendation_events` (it has different semantics and a foreign key to `protocol_intakes`).
11. **Launches & integration feedback** — Create separate. No launch-token pattern exists (verified).
12. **Rule-set versioning** — Create separate. **Absent** in the codebase.
13. **Route verification** — Create separate. **Absent**; needs a periodic Edge Function.
14. **Resource approval and suspension** — Extend approval pattern. `mirror_admin_suspend` is a good precedent; approval workflows are absent.
15. **Admin management** — Extend existing admin shell (route + layout reuse); create Arrival-specific pages.
16. **Expiry and retention processing** — Extend `publish-scheduled-content`/pg_cron pattern for the 24h TTL; new job required.
17. **Urgent-support routing** — Create separate. Existing escalation (`escalation_rules`, `escalation_events`) is AreekeeraA-bound; Arrival's urgent path must bypass ordinary Arrival logic entirely, so it should be its own route + copy, potentially sharing constants only.

## 14. Confirmed blockers and integrity risks
- **Critical**
  - No versioned rule publication mechanism exists. Arrival cannot ship without one.
  - No route-verification mechanism exists; slugs are mutable without a verified alias table (**unverified**). Snapshots would rot silently.
  - No opaque launch-context / short-lived token pattern exists; must be designed before Arrival launches.
- **High**
  - `content_resources` public SELECT policy grants to `roles={public}` (i.e. anon + authenticated) for `status='published'`. Arrival's deterministic server logic must always filter on `status='published'` regardless of role, and never return draft candidates from the Edge Function.
  - Admin-route protection is per-page and client-side; before any Arrival admin data exists, a shared route guard should be introduced (out of scope here — flag only).
  - No global error boundary; a mid-flow Arrival crash would blank the UI.
- **Medium**
  - `healing_resources`, `healing_content`, `content_resources`, `courses`, `lessons` are five overlapping content surfaces. Deciding which surfaces are Arrival-eligible is a genuine product decision.
  - `cron.job` inventory not readable from this shell; existing schedules are **unverified** — must be confirmed before adding a 24h-expiry job.
  - Retired-resource intelligibility: no tombstone/alias registry exists. Snapshots must therefore capture title + kind + id + route inline.
- **Low**
  - Absence of shared segmented-progress and card-selection components will duplicate UI code.
  - Absence of a shared live-region announcer will hurt a11y for the Arrival question flow.

## 15. Decisions required from the owner
Genuine product/architecture decisions that cannot be resolved by further reading:
1. **Resource-eligibility scope**: which of `content_resources`, `healing_resources`, `courses/lessons`, `content_lessons`, `cards`, `transformation_tools`, `session_replays`, `live_sessions`, `areekeera_protocols`, `playlists` are Arrival-eligible in v1?
2. **Registry shape**: single canonical `arrival_resource_registry(kind, id)` table vs polymorphic `(kind text, resource_id uuid)` inside Arrival profile rows.
3. **Admin visibility of member Arrival answers**: forbid entirely (owner-only SELECT), or allow admins read-only for support? Locked default: forbid.
4. **Slug-vs-id snapshotting**: for slug-only routes, do we (a) require a slug-history table before Arrival launch, or (b) snapshot by id and always re-resolve routes at click time?
5. **Exclusion source of truth**: reuse `contraindications`/`escalation_rules` or create Arrival-specific exclusion tables? Locked default per spec: separate.
6. **Urgent-support target**: exact URL and copy for the bypass path (independent of Arrival ranking).
7. **Rule-set publication actor**: admin-only via `assert_caller_is_admin()` — confirm and specify a required 4-eyes/second-approver step if any.
8. **Retention of anonymised outcomes**: is any Arrival outcome data retained after 24h expiry for aggregate analytics? Product decision.

## 16. Preconditions for migration planning
Before migration-planning may begin, all must be true and independently verified:
1. Owner has answered every item in §15.
2. Locked list of Arrival-eligible resource kinds + the exact canonical identity used per kind is written down.
3. Snapshot route strategy chosen (id-only resolve-on-click vs slug-history registry).
4. `cron.job` inventory confirmed by an authorised operator so the 24h-TTL job does not collide with existing schedules.
5. Confirmation that the four-step CREATE→GRANT→RLS→POLICY convention is applied for every new Arrival table with default-deny policies and no `role=public` reads.
6. Confirmation that no Arrival table joins to `journal_entries`, `healing_protocols`, `saved_readings`, tracking tables, or any Protocol Builder content.
7. Confirmation that `service_role` retains BYPASSRLS by role attribute (verified from `pg_roles.rolbypassrls`) — not re-checked this task.
8. Sign-off that admins are excluded from per-member Arrival answer reads by policy (unless §15.3 changes it).
9. Sign-off that Arrival's server-authoritative recommendation runs in an Edge Function (or SECURITY DEFINER RPC) never invoked with client-supplied candidate lists, scores, or exclusion decisions.
10. Sign-off that Search tags will not appear anywhere in the Arrival eligibility schema.

## 17. Evidence appendix
- Migration list: `supabase/migrations/` (138 files; tail listed above; latest `20260729035039_...sql`).
- Routes: `src/App.tsx` L91–L155.
- Auth: `src/hooks/useAuth.tsx` L31–L54 (client admin read).
- DB helpers: `pg_proc` bodies for `has_role`, `has_full_temple_access`, `assert_caller_is_admin` (full SQL captured above; verified).
- Policies: `pg_policies` rows for `home_recommendations`, `protocol_intakes`, `intake_symptoms`, `recommendation_events`, `content_resources` (captured above; verified).
- RLS state: `pg_class.relrowsecurity/relforcerowsecurity` for 19 candidate tables (all `enabled=t`, `forced=f`; verified).
- Extensions: `pg_extension` — `vector 0.8.0`, `pg_cron 1.6.4`, `pg_net 0.19.5` (verified). `cron.job` not readable (unverified).
- Columns: `information_schema.columns` for `home_recommendations`, `recommendation_events`, `transformation_recommendation_rules`, `protocol_intakes`, `intake_symptoms`, and 11 resource tables (verified).
- Naming-collision search: `rg` across `.ts/.tsx/.sql/.md` for `arrival|pathway|check.?in` returned zero project-code matches for "arrival"/"pathway"; only tracking check-in tables and unrelated healing bot files matched "check_in"/"check-in".
- Every conclusion labelled **verified**, **unverified**, or **absent** in-body.

Arrival-A read-only preflight complete. No implementation changes were made. Awaiting owner adjudication before migration planning.
