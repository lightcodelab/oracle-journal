# Arrival-B3 — Outstanding Preflight Correction (Read-Only Report)

## 1. Verdict

**PASS WITH BLOCKERS.** Both outstanding defects are now closed with direct repository evidence: the content-resource ID route is verified (Blocker 1 from the prior report is resolved by code that now exists), and every sequential concurrency simulation is replaced with genuinely independent-session designs. Two owner decisions remain (section 6).

## 2. Repository state

- HEAD: `8d5b76032fa311e3dea71837e0df148d32df1487`
- `git status --porcelain`: empty before this report; only `.lovable/plan.md` written by it.

## 3. Corrected four-family route/access matrix (direct evidence)

Route strings are **rendering artefacts only**. Canonical identity stays `(resource_type, resource_id)` on `public.arrival_resource_registry`.

### content_resources
- Canonical source / ID: `public.content_resources.id` (uuid).
- ID route (now repository-evidenced): `/devotion/resources/content-<id>`. Route pattern `/devotion/resources/:slug` — `src/App.tsx:128` (and `/remembrance/resources/:slug`, `src/App.tsx:105`). Resolver strips the `content-` prefix and detects a UUID: `src/pages/DevotionResourcePage.tsx:218-224`, then queries `.eq('id', contentIdentifier)` at `:254`, with slug fallback at `:266-272`.
- Publication check: `status = 'published'` for non-admins — `DevotionResourcePage.tsx:257-259`.
- Access check: session required (redirect to `/auth`); row visibility via RLS `has_full_temple_access(auth.uid())`.
- Suspension check: registry `active = true AND suspended_at IS NULL` (`suspended_at`/`suspension_reason`/`suspended_by` confirmed live on `arrival_resource_registry`).
- Parent identity: none.
- B3 verifies transactionally: registry approval, non-suspension, `status='published'`, row existence/visibility for `auth.uid()`, caller full access, safety-metadata gates; then emits `'/devotion/resources/content-' || id`.
- B5 only: that the emitted URL renders the intended resource for a real authenticated member session.
- Historical unavailable behaviour: return frozen `title_snapshot` + frozen `reasons`, `route = NULL`; never re-resolve.

### healing_resources
- Canonical source / ID: `public.healing_resources.id` (uuid).
- ID route: `/devotion/resources/healing-<id>` — prefix detection `DevotionResourcePage.tsx:102-106`, slug attempt `:131`, ID fallback `:144`.
- Publication check: `status = 'published'` for non-admins — `:134-136` and `:147-149`.
- Access check: session + RLS `has_full_temple_access(auth.uid())` on the row and its media/audio/transcript children.
- Suspension check: registry `active = true AND suspended_at IS NULL`.
- Parent identity: none.
- B3 verifies: approval, suspension, publication, visibility, caller access, safety gates; emits the `healing-<id>` route.
- B5 only: end-to-end render and media playback under a real session.
- Historical unavailable behaviour: frozen snapshot, `route = NULL`.

### courses
- Canonical source / ID: `public.courses.id` (uuid).
- Locked route: `/devotion/course/:courseId` — `src/App.tsx:130`; resolver reads `courseId` and queries `.eq('id', courseId)` — `src/pages/DevotionCoursePage.tsx:34, 75`.
- Publication/availability: `courses.is_published = true` (checked server-side by B3; the page itself does not filter it — `DevotionCoursePage.tsx:72-78`).
- Access check: `has_full_temple_access(auth.uid())`, with `can_view_lesson_by_door(auth.uid(), course_id)` as the door-scoped check used by course content.
- Suspension check: registry as above.
- Parent identity: none.
- B3 verifies: approval, suspension, `is_published`, visibility, caller access, safety gates.
- B5 only: rendered reachability of the emitted route.
- Historical unavailable behaviour: frozen snapshot, `route = NULL`.

### lessons
- Canonical source / ID: `public.lessons.id` (uuid); parent `lessons.course_id` (NOT NULL FK).
- Locked route: `/devotion/course/:courseId/lesson/:lessonId` — `src/App.tsx:131`; resolver reads both params (`src/pages/DevotionLessonPage.tsx:59`), loads the course by `id` (`:145`) and the lesson by `id` (`:160`).
- Publication/availability: `lessons` has **no** publication column; availability derives entirely from the parent `courses.is_published`.
- Parent identity (required): B3 must read `course_id` from the authoritative `lessons` row **inside the same transaction** — never from client input, the registry, or a snapshot — and confirm the parent course row exists and is published. Missing/unpublished parent ⇒ emit no route.
- Access check: `has_full_temple_access(auth.uid())` OR `can_view_lesson_by_door(auth.uid(), lessons.course_id)`.
- Suspension check: registry as above.
- B3 verifies: approval, suspension, lesson row visibility, parent existence + publication, parent-ID consistency, caller access, safety gates; emits the two-segment route from the authoritative parent ID.
- B5 only: that the two-segment URL resolves to the intended lesson in the member UI.
- Historical unavailable behaviour: frozen snapshot, `route = NULL`.

**Not recommended / drift reported, not repaired:** `/devotion/courses/:slug` (`App.tsx:129`) and `/remembrance/courses/:slug` (`:106`) mount `DevotionCoursePage`, which reads `:courseId` only, so they cannot resolve. They must never be emitted.

**Privilege observation (read-only):** `public.courses` and `public.lessons` still grant `SELECT` to `anon` (`pg_class.relacl`), while `content_resources` and `healing_resources` do not. `arrival_resource_registry` has **no** `anon`/`authenticated` grants — the required zero-client-grant posture is intact.

## 4. Genuine competing-session concurrency fixture designs

**Harness (design only, not executed).** Genuinely independent backend sessions are obtained by issuing concurrent PostgREST RPC calls over HTTPS from one async driver — each HTTP call takes its own pooled database session. Interleaving is forced by a test-only `SECURITY DEFINER` barrier helper that takes a `pg_advisory_xact_lock` on a fixture-scoped key, so Session A holds its transaction open at the contended statement until Session B has entered its own. Direct `psql` sessions are unavailable on this platform, so the concurrent HTTP-RPC design is the correct mechanism. Every case ends with a teardown RPC that deletes only the fixture user's `arrival_interactions` rows (cascade removes answers/runs/recommendations) and then asserts residue counts of zero across `arrival_interactions`, `arrival_answers`, `arrival_recommendation_runs`, `arrival_recommendations`, and `arrival_interactions` restart chains. Zero-residue proof = teardown-time `count(*) = 0` for each of those tables scoped to the fixture user, plus no rows in any table referencing the fixture user id.

1. **Concurrent `arrival_start_or_resume`**
   - A and B: same fixture user, no in-progress interaction.
   - Barrier: both enter the insert path; A is released only after B is inside its statement.
   - Contention: partial unique `arrival_i_one_in_progress_per_user`.
   - Expected per caller: identical interaction ID. Loser catches `unique_violation`, re-selects the winner's row, returns it.
   - Final committed state: exactly one `in_progress` interaction for the user.
   - Rollback cleanup / residue: loser's failed insert rolls back inside the RPC; teardown deletes the single interaction; residue 0.
2. **Concurrent `arrival_abandon_and_restart`**
   - A and B: same in-progress interaction id.
   - Barrier releases both into `SELECT ... FOR UPDATE` on the predecessor.
   - Contention: row lock plus partial unique `arrival_i_restart_successor_uk`.
   - Expected: one caller creates the successor; the other blocks, then sees the predecessor already `abandoned` and returns the existing successor id. Both callers receive the same successor id.
   - Final state: one `abandoned` predecessor, exactly one successor, exactly one `in_progress` row.
   - Cleanup/residue: delete both chain rows; assert 0.
3. **Replayed restart after successor commit**
   - A commits the restart and its session ends; B then replays the identical call in a fresh session.
   - Contention: successor uniqueness + predecessor state guard.
   - Expected: B returns the existing successor, inserts nothing, raises nothing.
   - Final state: byte-identical to post-A state (successor id, timestamps unchanged).
   - Cleanup/residue: as case 2; assert 0.
4. **Concurrent / stale `arrival_save_answers`**
   - A and B both submit `answers_revision = N` for the same interaction.
   - Barrier releases both into `SELECT ... FOR UPDATE` on the interaction.
   - Contention: interaction row lock + optimistic revision guard.
   - Expected: winner commits and bumps to `N+1`; loser raises a stale-revision error and writes nothing. A later replay at revision `N` (third session) also fails.
   - Final state: answers reflect only the winning payload; `answers_revision = N+1`.
   - Cleanup/residue: loser's transaction fully rolled back (no partial answer rows); teardown deletes fixture interaction; assert 0 answers.
5. **Concurrent `arrival_generate_recommendations`**
   - A and B target the same interaction simultaneously.
   - Barrier releases both into `SELECT ... FOR UPDATE` on the interaction.
   - Contention: interaction row lock + unique `arrival_recommendation_runs.interaction_id` + unique `(run_id, rank)` and `(run_id, registry_id)`.
   - Expected: one caller generates and commits (`partial`/`complete`); the other blocks, then returns the existing successful run without inserting. A zero-eligible-candidate generation rolls back entirely and leaves the interaction `in_progress` with no run row.
   - Final state: exactly one run per interaction, no duplicate recommendation rows, no orphan run, no duplicate ranks.
   - Cleanup/residue: delete fixture interactions (cascade removes run + recommendations); assert 0 runs and 0 recommendations.

**Properties proven by the set:** one in-progress interaction (1), one restart successor (2), replay safety (3), stale-revision rejection (4), one successful run per interaction and no duplicate recommendations (5). Because both sessions stay open across the barrier and all cases acquire locks in the fixed order interaction → children → registry, any lock-order inversion surfaces as a real deadlock rather than being masked by sequential execution; a `deadlock_detected` error in any case is a hard failure, which is the hidden-deadlock proof.

## 5. Changes required to the seven planned RPC contracts

- Route resolver: emit `'/devotion/resources/content-' || id` for content resources (previously `NULL`), `healing-<id>` for healing resources, and the two locked course/lesson templates. Never emit any `:slug` course route. Routes are outputs, never identity or input.
- Every eligibility path adds `active = true AND suspended_at IS NULL` plus the six accepted Slice 1.1 safety gates (duration, modality, intensity, sequence stage 1..7, bridge codes, suspension), all evaluated before scoring; unknown metadata ⇒ ineligible, and BOOST can never create eligibility.
- Lesson path adds the in-transaction authoritative parent lookup and parent publication validation.
- `arrival_start_or_resume` and `arrival_abandon_and_restart`: explicit `FOR UPDATE` plus catch-`unique_violation`-and-return-existing semantics.
- `arrival_save_answers`: optimistic `answers_revision` guard; stale revision raises, never silently succeeds.
- `arrival_generate_recommendations`: `FOR UPDATE` on the interaction, single run per interaction, full rollback on zero eligible candidates.
- Read RPCs: return frozen snapshots plus recomputed routes; `route = NULL` whenever the resource is no longer available.
- Unchanged invariants: `auth.uid()`-scoped, full-access enforcement, `SECURITY DEFINER` with fixed `search_path = public`, server-authoritative selection, deterministic ranking, hard safety gates, no direct client table writes, zero client grants on the registry.

## 6. Remaining blockers / owner decisions

1. Content-resource ID route: resolved by repository evidence; only owner confirmation that `/devotion/resources/content-<id>` is the approved emitted form is outstanding.
2. Legacy `:slug` course routes remain broken (`App.tsx:129`, `:106`) — reported, not repaired; owner decides whether B3 scope includes removing them.
3. `anon` still holds `SELECT` on `public.courses` and `public.lessons` — outside Arrival scope but relevant to the full-access invariant; owner decision on whether to revoke.

## 7. Mutation confirmation

No migrations, database objects, functions, RPCs, data, routes, UI, hooks, types, seeds, tests, fixtures, builds, or deployments were created, modified, or deleted. All database access was read-only inspection. The only file written is this report.
