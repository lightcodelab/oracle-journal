# Arrival-B3 Preflight Correction — Owner-Decided Contract Closure

## 1. Correction verdict

**PASS WITH BLOCKERS.** The route matrix is corrected against live repository evidence, the minimal metadata contract is specified, and the simulated concurrency fixtures are replaced with genuine competing-session designs. Blockers remain that require owner decisions before B3 implementation begins.

## 2. Repository state

- HEAD: `9593cad25ef52e47861aef228a7a4697c59037cb`
- Initial `git status --porcelain`: empty (clean tree)

## 3. B1/B1.1 drift check

No relevant drift. Verified live:

- `arrival_resource_registry` retains the exclusive-arc CHECK (`num_nonnulls(content_resource_id, healing_resource_id, course_id, lesson_id) = 1`), all four FKs `ON DELETE RESTRICT`, and one partial unique index per arc.
- `arrival_interactions` retains `arrival_i_one_in_progress_per_user` (partial unique on `user_id WHERE state = 'in_progress'`) and `arrival_i_restart_successor_uk` (partial unique on `restarted_from_interaction_id`).
- `arrival_recommendation_runs` retains unique `interaction_id`; `arrival_recommendations` retains unique `(run_id, rank)` and `(run_id, registry_id)`.
- Immutability/lock triggers still present: `arrival_run_immutable`, `arrival_recommendation_immutable`, `arrival_registry_lock_source`, `arrival_questionnaire_lock`, `arrival_rule_version_lock`, `arrival_question_lock`, `arrival_answer_option_lock`, `arrival_match_rule_lock`, plus both delete guards.
- `has_full_temple_access(uuid)` and `can_view_lesson_by_door(uuid, uuid)` exist and are `SECURITY DEFINER`.
- No `arrival_start_or_resume` / `arrival_save_answers` / `arrival_generate_recommendations` functions exist: **no B3 implementation has started.**
- `arrival_resource_registry` has **zero** table grants to `anon`/`authenticated` — clients cannot read or write approval state today. This satisfies owner decision 1's least-privilege requirement and must be preserved.

## 4. Correction matrix

| Original defective claim | Corrected claim | Direct evidence | Effect on B3 contract |
| --- | --- | --- | --- |
| Course route is `/devotion/courses/:slug` | Course route is `/devotion/course/:courseId`; the `:slug` form exists only as a legacy alias and must never be emitted | `src/App.tsx:125` (canonical), `src/App.tsx:124`, `:102`, `:103` (legacy aliases) | Route builder emits the ID form only |
| Lesson route unspecified/slug-derived | Lesson route is `/devotion/course/:courseId/lesson/:lessonId` | `src/App.tsx:126` | Requires authoritative parent course ID |
| Content resources are ID-addressable | `content_resources` pages resolve **by `slug` only** — no ID fallback | `src/pages/DevotionResourcePage.tsx:218-242` (`.eq('slug', slug)`) | **Blocker 1**: canonical ID route impossible today |
| Healing resources are slug-only | Healing resources resolve by `slug` **or by ID** under the `healing-` prefix | `src/pages/DevotionResourcePage.tsx:101-152` (slug attempt, then `.eq('id', healingIdentifier)`) | ID-based route `"/devotion/resources/healing-" + id` is repository-evidenced |
| Lessons have their own publication flag | `lessons` has **no** publication column; availability derives from parent `courses.is_published` | live column inspection of `public.lessons` | Lesson availability recheck must join the parent course |
| Curated safety metadata already exists on the families | **No** duration/capacity/intensity/sequence/bridge column exists on any of the four families; `healing_resources.modality` is the only modality-like field and covers one family only | live column inspection of all four tables | **Blocker 2**: registry metadata extension is the first B3 slice |
| Concurrency proven | Prior fixtures were sequential calls in one session — not proof | prior preflight report | Section 9 replaces them |

## 5. Corrected four-family route/access matrix

**content_resources**
- Canonical source: `public.content_resources`; canonical ID: `id` (uuid).
- Route template: none emittable by canonical ID today. The rendered route is `/devotion/resources/:slug` (`src/App.tsx:123`), resolved by `slug` only (`DevotionResourcePage.tsx:242`).
- Publication field: `status = 'published'` (non-admins filtered at `DevotionResourcePage.tsx:246-248`).
- Member access: page requires a session; row RLS requires `has_full_temple_access(auth.uid())`.
- Suspension check: proposed `active = true AND suspended_at IS NULL` on the registry row.
- Parent identity: none.
- B3 verifies: registry approval, non-suspension, `status='published'`, row visibility, caller access.
- B5 verifies: that the emitted link actually lands on the intended resource in the member UI.
- Historical unavailable behaviour: return frozen `title_snapshot`/`reasons`, `route = NULL`.

**healing_resources**
- Canonical source: `public.healing_resources`; canonical ID: `id` (uuid).
- Route template: `/devotion/resources/healing-<id>` — evidenced by the ID fallback at `DevotionResourcePage.tsx:141-152`.
- Publication field: `status = 'published'`.
- Member access: session + `has_full_temple_access(auth.uid())` RLS on `healing_resources` and its media/audio/transcript children.
- Suspension check: registry `active = true AND suspended_at IS NULL`.
- Parent identity: none.
- B3 verifies: approval, suspension, publication, access, ID-addressability. B5 verifies end-to-end reachability.
- Historical unavailable behaviour: frozen snapshot, `route = NULL`.

**courses**
- Canonical source: `public.courses`; canonical ID: `id` (uuid).
- Route template (locked): `/devotion/course/:courseId` — `src/App.tsx:125`.
- Publication field: `courses.is_published = true`.
- Member access: `has_full_temple_access(auth.uid())`, with `can_view_lesson_by_door(auth.uid(), course_id)` as the door-scoped check used by course content.
- Suspension check: registry fields as above.
- Parent identity: none.
- B3 verifies: approval, suspension, `is_published`, access. B5 verifies rendering and reachability.
- Historical unavailable behaviour: frozen snapshot, `route = NULL`.

**lessons**
- Canonical source: `public.lessons`; canonical ID: `id` (uuid); parent: `lessons.course_id` (NOT NULL FK).
- Route template (locked): `/devotion/course/:courseId/lesson/:lessonId` — `src/App.tsx:126`.
- Parent resolution: read `course_id` from the `lessons` row itself inside the same transaction — never from client input, never from the registry, never from a snapshot. Validate that the parent course row exists and `is_published = true`; if the parent is missing or unpublished, emit no route.
- Publication field: none on `lessons`; availability equals parent `courses.is_published`.
- Member access: `has_full_temple_access(auth.uid())` OR `can_view_lesson_by_door(auth.uid(), lessons.course_id)`.
- Suspension check: registry fields as above.
- B3 verifies: approval, suspension, parent existence and publication, access, parent-ID consistency. B5 verifies the two-segment route resolves to the intended lesson.
- Historical unavailable behaviour: frozen snapshot, `route = NULL`.

**Drift reported, not repaired:** legacy slug routes `/devotion/courses/:slug` (`App.tsx:124`), `/decks/courses/:slug` (`:102`) and `/decks/course/:courseId` (`:103`) still exist and point at `DevotionCoursePage`, which reads `:courseId` only — so `/devotion/courses/:slug` cannot resolve a course. Left untouched; recorded as an existing route defect.

## 6. Exact minimal metadata contract (design material only — not applied)

All fields land on `public.arrival_resource_registry`, keeping canonical identity `(resource_type, resource_id)` and requiring no per-family schema change. Common properties for every field below: authoritative write pathway is a `SECURITY DEFINER` admin RPC (`assert_caller_is_admin()` first, fixed `search_path = public`); no grants to `anon` or `authenticated` (the current zero-grant posture is preserved); `service_role` only; mutable after emission (curation must stay correctable) because emitted recommendations are already frozen snapshots; and none can be derived from Search tags, which are uncontrolled free-form editorial labels with no vocabulary constraint, no validation, and no admin-only write path — a mis-tagged row would silently alter safety eligibility.

1. **Temporary suspension** — `suspended_at timestamptz NULL`, `suspension_reason text NULL`, `suspended_by uuid NULL REFERENCES auth.users(id)`. Invariant CHECK: `(suspended_at IS NULL AND suspension_reason IS NULL) OR (suspended_at IS NOT NULL AND btrim(suspension_reason) <> '')`. Partial index on `(suspended_at) WHERE suspended_at IS NULL`. `active` keeps its sole meaning: Arrival approval. Eligibility requires `active = true AND suspended_at IS NULL`. NULL suspension = not suspended.
2. **Duration** — `duration_minutes integer NULL`, CHECK `duration_minutes IS NULL OR duration_minutes > 0`. Unit: whole minutes. NULL (unknown) never satisfies a duration-bounded MATCH and cannot be rescued by BOOST.
3. **Modality** — `modality_codes text[] NOT NULL DEFAULT '{}'`, CHECK that every element is in a locked vocabulary (`meditation, visualisation, ritual, somatic, process, recipe`) and the array holds no duplicates. Multiple modalities per resource permitted. Empty array = unknown = ineligible for modality-conditioned MATCH.
4. **Capacity/intensity** — `intensity_level smallint NULL`, CHECK `intensity_level IS NULL OR intensity_level BETWEEN 1 AND 3` (1 = lowest demand). Comparison: eligible only when `intensity_level <= member_capacity_level` derived from the member's answered capacity question. NULL = unknown = ineligible, never treated as low demand.
5. **Sequence position** — `sequence_stage smallint NULL`, CHECK `sequence_stage IS NULL OR sequence_stage BETWEEN 1 AND 3`, encoding the locked regulate (1) → stabilise (2) → deepen (3) ordering. A candidate whose stage exceeds the member's current stage is a premature candidate and is excluded outright, not down-weighted. NULL = unknown = ineligible.
6. **Bridge movement** — `bridge_codes text[] NOT NULL DEFAULT '{}'` with a CHECK against the approved bridge vocabulary defined by the active rule version, no duplicates. Multiple approved bridges per resource permitted. A bridge-conditioned MATCH requires array overlap; a bridge-conditioned EXCLUDE fires on overlap and dominates any MATCH. Empty array = unknown = ineligible for bridge-conditioned MATCH.

Safety metadata that is missing, invalid, unknown, or incompatible produces ineligibility before scoring runs, so BOOST and preference scoring can never create eligibility.

**Dependency ordering:** yes — this schema extension must be the **first** narrow B3 slice, before any member-facing RPC implementation, because eligibility evaluation cannot be written without it. Not implemented here. No resource metadata, bridge values, questionnaire content, or rule content is seeded by this task.

## 7. Suspension invariants and controlled write pathway

- `active` = approval only; `suspended_at` = temporary suspension only; neither implies the other.
- Setting suspension requires a non-empty reason in the same statement; clearing suspension clears reason and actor together.
- Only `arrival_admin_suspend_resource(registry_id, reason)` and `arrival_admin_unsuspend_resource(registry_id)` may write these columns; both assert admin, run `SECURITY DEFINER` with fixed `search_path`, and record `suspended_by = auth.uid()`.
- Zero client grants on the registry are preserved; suspension state is observable to members only through route omission.

## 8. Missing/unknown metadata behaviour (every safety field)

| Field | Unknown value | Effect |
| --- | --- | --- |
| suspension | NULL | not suspended (eligible if approved) |
| duration_minutes | NULL | ineligible for duration-conditioned MATCH |
| modality_codes | `{}` | ineligible for modality-conditioned MATCH |
| intensity_level | NULL | ineligible; never inferred as low demand |
| sequence_stage | NULL | ineligible; never inferred as regulate |
| bridge_codes | `{}` | ineligible for bridge-conditioned MATCH |

In every unknown case the candidate is dropped before ranking and cannot re-enter via BOOST or preference weighting.

## 9. Genuine competing-session fixture designs

**Harness (identified, not executed):** genuinely independent sessions are created by issuing concurrent PostgREST RPC calls over HTTP from one async script — each call takes its own pooled backend session — coordinated by an in-database barrier helper that takes `pg_advisory_lock` inside a test-only `SECURITY DEFINER` function. Direct `psql` with the database password is not available on this platform, so the concurrent HTTP-RPC harness is the correct mechanism. Cleanup runs as a final teardown RPC that deletes only the fixture user's interactions, letting cascade remove children, then asserts zero residue.

For each case: Session A and Session B start simultaneously; the barrier releases A only after B has entered its statement, so both genuinely contend on the same lock or unique index.

1. **Concurrent `arrival_start_or_resume`** — A and B both call for the same fixture user with no in-progress row. Contention: `arrival_i_one_in_progress_per_user`. Interleaving: both attempt insert; one commits, the loser hits the unique violation, catches it, re-selects and returns the winner's row. Expected result to both callers: the same interaction ID. Final committed state: exactly one `in_progress` row. Cleanup: delete fixture interactions; assert count 0.
2. **Concurrent `arrival_abandon_and_restart`** — both callers target the same in-progress interaction. Contention: `SELECT ... FOR UPDATE` on the predecessor plus `arrival_i_restart_successor_uk`. Expected: one creates the successor; the other blocks, then observes the predecessor already abandoned and returns the existing successor. Final state: one abandoned predecessor, exactly one successor.
3. **Replayed restart after the successor commits** — A commits a restart, then B replays the same call. Expected: B returns the existing successor with no new insert. Final state unchanged.
4. **Concurrent / stale `arrival_save_answers`** — A and B both send `answers_revision = N`. Contention: `FOR UPDATE` on the interaction row plus the revision guard. Expected: one commits and bumps to `N+1`; the other fails with a stale-revision error and writes nothing. A later replay of revision `N` also fails. Final state: answers reflect only the winning revision.
5. **Concurrent `arrival_generate_recommendations`** — both callers target the same interaction. Contention: `FOR UPDATE` on the interaction plus unique `arrival_recommendation_runs.interaction_id`. Expected: one performs generation and commits `partial`/`complete`; the other blocks, then returns the existing successful run. A zero-result generation rolls back fully and leaves the interaction `in_progress`. Final state: exactly one run, no duplicate recommendation rows, no orphan run.

Because both sessions stay open across the barrier, any lock-order inversion surfaces as a real deadlock instead of being hidden by sequential execution; the design therefore doubles as the deadlock probe.

## 10. Changes required to the seven proposed RPC contracts

- The route-returning read RPC computes `route text NULL` per family from the corrected matrix; `content_resources` returns `NULL` until Blocker 1 is decided.
- Every eligibility path adds `active = true AND suspended_at IS NULL` plus the six safety-metadata gates from section 6.
- The lesson path adds an authoritative in-transaction parent-course lookup and publication validation.
- `arrival_generate_recommendations` gains explicit `FOR UPDATE` interaction locking and unique-violation catch-and-return semantics.
- `arrival_save_answers` keeps optimistic `answers_revision`, with the stale case raising an error rather than silently succeeding.
- No RPC accepts client-supplied routes, states, candidates, scores, rankings, exclusions, or approvals. All other service invariants are unchanged.

## 11. Revised narrow B3 slices (dependency order)

1. Registry safety-metadata and suspension schema extension: constraints, indexes, admin write RPCs, grant/revoke posture.
2. Deterministic eligibility and scoring helper (EXCLUDE dominance, at least one MATCH, BOOST cannot create eligibility).
3. Route/access resolver for all four families using the corrected templates.
4. `arrival_start_or_resume` and `arrival_abandon_and_restart`.
5. `arrival_save_answers` with revision guard.
6. `arrival_generate_recommendations` (atomic, one run per interaction).
7. Read RPCs returning frozen snapshots plus recomputed routes.
8. Genuine competing-session verification harness and fixture teardown.

## 12. Remaining blockers and owner decisions

1. **`content_resources` has no ID-addressable route.** B3 cannot construct a canonical ID-based route for that family. Owner decision needed: (a) emit no route for content resources until an ID route exists, (b) authorise a later route addition mirroring the healing-resource ID fallback, or (c) drop `content_resources` from the launch scope. No route table is proposed — no repository evidence justifies one.
2. **No safety metadata exists anywhere.** Slice 1 must land before any member RPC; confirm it as the first slice.
3. **The approved bridge-movement vocabulary is undefined.** It must be named by the owner before the CHECK constraint in slice 1 can be written.
4. Legacy slug course routes remain broken (section 5 drift note); reported, not repaired.

## 13. Owner decisions

The three settled owner decisions — approval versus suspension separation, cross-family safety metadata preservation, and the B3/B5 route responsibility split — were treated as binding and were **not reopened**.

## 14. Change confirmation

No files, migrations, database objects, functions, data, routes, UI, hooks, Edge Functions, generated types, tests, fixtures, builds, deployments, or later-stage (B2/B4/B5) work were created, edited, applied, or deleted. All database access was read-only inspection. The only file written is this plan document.

## 15. Final `git status --porcelain`

```text
?? .lovable/plan.md
```