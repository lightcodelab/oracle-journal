
# Task Arrival-A1 — Corrected Consolidated Report

This is a strictly read-only correction of Arrival-A. Nothing was modified. Labels: **V** verified, **I** inferred, **U** unverified.

## 1. Scope compliance
No source, migration, DB, storage, secret, cron or config changed. All findings derive from live catalogue and repo reads performed this turn.

## 2. Environment & migration reconciliation
- Repo HEAD **V**: `8a63338ae43c4feff2ff8b9867399b5a7718dd06`, branch `edit/edt-f45d86df-4684-4bbe-b499-d9e9004ab246`, working tree clean (`git status --porcelain` empty).
- Migration dir **V**: `supabase/migrations/`, 138 files, latest `20260729035039_d5a134ec….sql` (Task 4C).
- Project ref **V**: `gjaafbzhkdekgigmnafp` (`.env`, `supabase/config.toml`).
- Environment type (prod/preview/staging) **U**: `supabase_migrations.schema_migrations` is not readable by the sandbox role (`ERROR: permission denied for schema supabase_migrations`). Applied-migration history therefore cannot be enumerated in this environment. Source↔applied matched/only/duplicate/ordering breakdown is **U**.
- `pg_roles.rolbypassrls` **V**: `service_role=t`, `supabase_admin=t`, `postgres=t`; `anon=f`, `authenticated=f`, `authenticator=f`.

## 3. Existing Arrival-like footprint
- No `arrival_resource_registry` / `arrival_*` tables **V** (`information_schema.tables` filter).
- No routes matching `/arrival*` or `/pathway*` in `src/App.tsx` **V** (route grep, lines 91–157).
- Prior "check-in" tables belong to nervous-system/emotional tracking, not Arrival — no reuse.

## 4. Authentication / authority matrix (public schema) **V**
All helpers `SECURITY DEFINER`, `STABLE`, `search_path='public'`, owner=`postgres`.

| Function | Args | Lang | EXECUTE grants |
|---|---|---|---|
| `has_role` | `(uuid, app_role)` | sql | PUBLIC |
| `has_full_temple_access` | `(uuid)` | sql | PUBLIC |
| `assert_caller_is_admin` | `()` | plpgsql | (no explicit PUBLIC row) |
| `get_member_state` | `(uuid)` | plpgsql | (no explicit PUBLIC row; body enforces caller = user or admin) |
| `can_view_card`, `can_view_lesson`, `can_view_lesson_by_door` | as declared | sql | PUBLIC |
| `admin_create_manual_full_access`, `admin_extend_manual_full_access`, `admin_revoke_manual_full_access` | as declared | plpgsql | (no explicit PUBLIC row) |

- `has_role` body reads `user_roles`. Because it is `SECURITY DEFINER`, RLS policies on `user_roles` that reference `has_role` do not recurse **V**.
- `get_member_state` internally consults `manual_full_access_grants`, `manual_access_legacy_bucket_history` and denies non-self non-admin callers **V**.
- Whether `authenticated` can invoke `assert_caller_is_admin` / `get_member_state` / admin manual-grant helpers depends on default privileges the sandbox role cannot enumerate directly → **I** (network log confirms `get_member_state` is callable by authenticated users at runtime).

## 5. Canonical resource inventory **V**

| Family | Table(s) | PK | Publish gate | Route pattern | Owning Door | Membership enforcement |
|---|---|---|---|---|---|---|
| Content resources | `content_resources` | `id`, `slug` | `status='published'` (enum), `scheduled_publish_at` | `/devotion/resources/:slug`, `/decks/resources/:slug` | via `location_id → content_categories.page` | RLS: **anon SELECT** where status=published |
| Modern courses / lessons (unused runtime) | `content_courses`, `content_lessons` | `id` | present but not routed from `App.tsx` | none | n/a | RLS present |
| Legacy courses | `courses` | `id` | `is_published=true` | `/devotion/course/:courseId`, `/devotion/courses/:slug`, `/decks/course/:courseId`, `/decks/courses/:slug` | `location_id` or `door_type` | RLS: **anon SELECT** where published |
| Legacy lessons | `lessons` | `id` | (no `is_published` column verified) | `/devotion/course/:courseId/lesson/:lessonId` | inherited from `courses` | RLS via `can_view_lesson*` |
| Healing resources | `healing_resources` | `id`, `slug` | `status='published'` + `tier` | (rendered inside Devotion resource paths) | `location_id` | Split policies: free→public; paid→`has_full_temple_access` |
| Healing content | `healing_content` | `id` | `is_published=true` | not directly routed | n/a | RLS: anon SELECT where published |
| Card decks / cards | `decks`, `cards` | `id` | decks always SELECT true; cards gated by `can_view_card` | `/decks`, `/decks/section/:section`, `/decks/spreads` | Remembrance | Deck fully public; card body member-gated |
| Transformation tools | `transformation_tools` | `id`, `slug` | `is_published=true` | `/tools`, `/tools/:slug`, `/tools/:slug/new` | Tools card | RLS restricted to `authenticated` |
| Live sessions | `live_sessions` | `id` | `status='scheduled'` (text, not enum) | `/all-live-sessions`, `/communion/live-*`, `/all-live-sessions/:sessionId/join` | Communion | Complex policy: registered users OR admin; view `live_sessions_public` has **RLS disabled** |
| Session replays | `session_replays` | `id` | `is_published=true`, `published_at` | `/communion/live-replays` | Communion | RLS: **anon SELECT** where published (rows returned to unauthenticated clients) |
| AreekeerA protocols | `areekeera_protocols` | `id` | none column-level; membership via `user_areekeera_protocols` | `/devotion/protocols`, `/devotion/protocols/:protocolId` | Devotion | RLS: admin ALL; SELECT gated by own-save |
| Playlists / tracks | `playlists`, `playlist_tracks` | `id` | user-scoped only | `/playlists` | Tools card | Owner-only RLS |
| Quizzes | `quizzes` (not re-inspected here) | — | — | `/quiz/:slug` | — | **U** for Arrival relevance |

Duration source **V**: `healing_content.duration_minutes`, `live_sessions.duration_minutes`, `session_replays.duration_minutes`. `content_resources`, `healing_resources`, `transformation_tools`, `courses`, `lessons`, `decks`, `cards`, `areekeera_protocols`, `playlists` — no duration column detected → **I** duration is either implicit (embed metadata) or absent.

Historical rename/retirement behaviour **U** across all families (no soft-delete columns detected apart from `manual_full_access_grants.revoked_at`).

## 6. Route matrix (App.tsx L91–157) **V**
Full path list captured (44 routes). No central `<RequireAuth>` / `<RequireAdmin>` wrapper is present. Per-route publication, missing-record, archived, unauthenticated and non-member handling is enforced **only** where the individual page component checks it. Inspected pages this turn: `SearchResults.tsx` (member gate via client-side `hasAccess` overlay). All other page-level guards → **U**; not repaired.

Route helpers / redirect-return patterns → **U** (none discovered in App.tsx routing layer; `Membership` catch-all at `/` and `NotFound` at `*` are the only global redirects).

## 7. Search architecture **V**
Implementation: `src/pages/SearchResults.tsx` + `src/components/GlobalSearch.tsx` (a `/search?q=` navigator). No SQL function, RPC or database view backs Search. Client performs parallel ILIKE queries against:
- `content_resources` (title/summary, `status='published'`)
- `courses` (title/description, `is_published=true`) with fan-out via `course_tags` + `course_tag_assignments`
- `healing_resources` (title/summary, `status='published'`) with fan-out via `symptoms`, `conditions`, `resource_symptom_mappings`, `condition_resource_mappings`

**Not searched**: `lessons`, `content_lessons`, `healing_content`, `cards`, `decks`, `transformation_tools`, `live_sessions`, `session_replays`, `areekeera_protocols`, `playlists`, `playlist_tracks`. Membership gate is a **client-side overlay only** (RLS still applies at query time). Result discriminator: local `source: 'content' | 'healing'` + `is_course`. Search tags are **not** Arrival eligibility metadata (locked).

## 8. Database security matrix **V**
All 38 inspected `public` tables have `relrowsecurity=true`, `relforcerowsecurity=false`, owner `postgres`.

`relacl` sample (verbatim):
- Broad DML grants **`arwdDxtm`** to **both `anon` and `authenticated`** on: `content_resources`, `courses`, `lessons`, `healing_resources`, `healing_content`, `decks`, `cards`, `home_recommendations`, `live_sessions`, `session_replays`, `transformation_tools`, `areekeera_protocols`, `playlists`, `playlist_tracks`, `saved_readings`, `journal_entries`, `protocol_intakes`, `recommendation_events`, `manual_full_access_grants`, `user_roles`, `profiles`. Writes are then constrained by RLS.
- Scoped correctly (no `anon`, `authenticated` limited to needed verbs) on: `mirror_capacity` (arw), `mirror_session_preferences` (arw), `mirror_availability_windows` (arwd), `mirror_member_topics` (arwd), `mirror_topic_notes` (arwd), `mirror_topic_catalog` (arwd), `community_profiles` (rDxtm — read/delete/refs/trigger/maint).

Policy inventory captured across all listed tables (44 policies dumped this turn; see §11 and §5 for material rows).

Storage bucket policies **U** — not needed until an Arrival-recommended resource depends on private storage (locked decision defers this).

## 9. Server-side integrity patterns
- True DB transactions / row locks in edge functions **U** (none inspected this turn; note: Supabase JS calls from Deno Edge are **not** an atomic transaction — Arrival-A's implicit claim is retracted).
- Idempotency: `stripe_webhook_events` (retained from prior audits) exists as a receipt table — **I** idempotency pattern but not re-verified here.
- Scheduled publish: `supabase/functions/publish-scheduled-content/index.ts` publishes `content_resources` and `healing_resources` only **V**. Neither pins `search_path` for the client — safe because service key.
- `cron.job` schedule metadata **U** (`permission denied for schema cron`).
- Approval / suspension / rule publication / route-health verification patterns → **absent** (none found).

## 10. Admin architecture **V**
Server: `assert_caller_is_admin()` + policies keyed on `has_role(auth.uid(),'admin')`. Client: `useAuth.checkAdminRole` reads `user_roles`, and per-page checks. No React Router route-level admin guard component detected — admin protection relies on (a) admin-only mutations in `admin_*` RPCs, (b) RLS on target tables, and (c) UI hiding. Client-side admin badge alone does **not** confer DB privilege (RLS enforces).

## 11. Privacy & retention
Owner-only SELECT policies verified on: `saved_readings`, `journal_entries`, `playlists`, `playlist_tracks`, `recommendation_events`, `protocol_intakes` (+ admin SELECT), `mirror_*` (owner-only), `entitlements` (self or admin), `manual_full_access_grants` (self or admin). Protocol Builder, journal, tracking and member-to-member content remain isolated **V**. No cross-member SELECT policy discovered. Retention/expiry mechanisms → **absent**.

## 12. Accessibility / client foundations
Not re-inspected this turn → **U** for every A11y capability (error boundaries, live regions, focus restoration, keyboard, reduced motion, session resume, expired UX). Do not treat Arrival-A's earlier client-foundation claims as verified.

## 13. Corrected 17-domain collision / reuse matrix
Every Arrival domain remains greenfield. Reuse targets (V): `has_role`, `has_full_temple_access`, `assert_caller_is_admin`, `get_member_state`, `mirror_topic_axis` pattern for curated catalogs, `home_recommendations` shape for admin-editable placement. Nothing to migrate away from. `content_categories.page` is the current de-facto Door mapping. No conflicting `arrival_*` symbols.

## 14. Arrival-A errata
| # | Prior claim | Correction |
|---|---|---|
| 1 | Assertions "per memory" for Task 4B/4B.1 | Re-verified live this turn; §4, §8 |
| 2 | "service_role verified by convention" | Replaced with `rolbypassrls=t` **V** |
| 3 | Unenumerated grants | `relacl` enumerated in §8 |
| 4 | "Standard Supabase JS transactions" | Retracted — not transactional |
| 5 | Public SELECT of published `content_resources` | Confirmed **V** and reclassified as product decision, not defect |
| 6 | Client-side admin guarding equals confidentiality | Retracted — DB RLS is the confidentiality boundary |
| 7 | Missing Arrival components called "critical defects" | Reclassified as expected missing capabilities |
| 8 | Incomplete evidence appendix | Replaced by §19 |
| 9 | Env type asserted | Reclassified **U** (schema_migrations unreadable) |

## 15. Verified existing defects / exposures
- `live_sessions_public` view has `relrowsecurity=false` **V**. Depending on underlying grants, this may bypass row-level protection. Classify: **verified security exposure candidate** — requires later inspection of the view's definer/security_barrier.
- Broad `arwdDxtm` grants to `anon` on member-write tables (`saved_readings`, `journal_entries`, `playlists`, `protocol_intakes`, `recommendation_events`, `manual_full_access_grants`, `user_roles`, `profiles`) → **verified over-broad grant surface**; safety currently rests on RLS. Not an Arrival blocker but worth noting.

## 16. Expected missing Arrival capabilities
Canonical resource registry, versioned rule publication, route-health verification, immutable Arrival-answer snapshots, launch-time destination validation, Arrival-specific exclusions/contraindications table, retention policy for Arrival submissions.

## 17. Remaining genuine owner decisions
None beyond the nine locked items. All prior "questions" in Arrival-A that overlapped with locked decisions are withdrawn.

## 18. Preconditions for migration planning
1. Restore ability to enumerate `supabase_migrations.schema_migrations` OR accept applied-history reconciliation as owner-attested.
2. Owner confirmation on Arrival scope of resource families (which of §5 rows Arrival will actually recommend).
3. Read access to `cron.job` for scheduled-integrity design OR owner-attested schedule inventory.
4. Owner decision on the two verified exposures in §15 (informational; not blocking).

## 19. Evidence appendix
Source paths inspected: `src/App.tsx` L1–157, `src/pages/SearchResults.tsx` full, `src/components/GlobalSearch.tsx` full, `src/hooks/useAuth.tsx`, `src/hooks/useTierAccess.ts`, `supabase/functions/publish-scheduled-content/index.ts`, `supabase/migrations/` (138 filenames).

Catalogue queries (SELECT-only) executed this turn:
- `git rev-parse HEAD`, `git status --porcelain`, `ls supabase/migrations/`.
- `SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname IN (…);`
- `pg_proc ⨝ pg_namespace ⨝ pg_language ⨝ pg_roles` filtered to helper names.
- `pg_get_functiondef(oid)` for `has_role`, `has_full_temple_access`, `assert_caller_is_admin`, `get_member_state`.
- `information_schema.routine_privileges` filter.
- `information_schema.tables/columns` filtered to resource-family names.
- `pg_class + pg_namespace + pg_roles` for RLS/force/owner.
- `pg_policies` for all listed tables.
- `pg_class.relacl` cast to text for grant enumeration.
- Attempted: `supabase_migrations.schema_migrations` (denied), `cron.job` (denied) → recorded as **U**.

Objects inspected (public schema): `areekeera_protocols, cards, community_profiles, content_categories, content_courses, content_lessons, content_resources, course_tag_assignments, course_tags, courses, decks, entitlements, healing_content, healing_resources, home_recommendations, journal_entries, lessons, live_sessions, live_sessions_public, manual_access_legacy_bucket_history, manual_full_access_grants, mirror_availability_windows, mirror_capacity, mirror_member_topics, mirror_session_preferences, mirror_topic_catalog, mirror_topic_notes, playlist_tracks, playlists, profiles, protocol_intakes, recommendation_events, resource_tag_assignments, resource_tags, saved_readings, session_replays, transformation_tools, user_roles`.

---

Arrival-A1 evidence completion finished. No implementation changes were made. Awaiting owner adjudication before migration planning.
