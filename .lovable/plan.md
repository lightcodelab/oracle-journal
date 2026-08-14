# Arrival-B3 Preflight Addendum — Final Contract Clarification

## 1. Verdict

**PASS.** Both binding clarifications are accepted and restated below as amended contract wording. No blocking condition is introduced.

## 2. Amended contracts

### 2.1 Mandatory membership gate (amended lesson route/access contract)

Exact amended wording, binding for every Arrival member RPC:

> **Arrival entitlement rule.** `public.has_full_temple_access(auth.uid())` is the single, mandatory entitlement gate for every Arrival member RPC, including candidate eligibility, resource resolution, lesson resolution, route emission, and every read RPC. If `has_full_temple_access(auth.uid())` is false, the RPC resolves no resource, emits no route, and returns no candidate — no other condition, function, grant, role, or metadata value can substitute for it or restore access.
>
> **`can_view_lesson_by_door` is never an entitlement path for Arrival.** It must never appear in an `OR` with the full-access gate, and must never be the sole condition allowing a lesson, course, or route to be resolved. If retained at all, it may only be evaluated **after** `has_full_temple_access(auth.uid())` has already returned true, purely as a narrowing compatibility or source-visibility check. Its result may only remove a candidate or suppress a route; it may never add, restore, or widen access. Removing it entirely must never change which resources a caller can reach.
>
> **Lesson route/access contract (amended).** For `resource_type = 'lesson'`, inside one transaction and in this order: (1) assert `has_full_temple_access(auth.uid())`; (2) read the registry row and require `active = true AND suspended_at IS NULL`; (3) apply all accepted Slice 1.1 safety gates (duration, modality, intensity, sequence stage 1..7, bridge codes), where unknown metadata means ineligible; (4) read the authoritative `lessons` row by `id` and take `course_id` from that row only — never from client input, the registry, or a frozen snapshot; (5) require the parent `public.courses` row to exist and `is_published = true`, since `lessons` carries no publication column; (6) optionally evaluate `can_view_lesson_by_door(auth.uid(), lessons.course_id)` as a narrowing check only; (7) emit `'/devotion/course/' || lessons.course_id || '/lesson/' || lessons.id`. If any of steps 1, 2, 3, 4, or 5 fails, emit `route = NULL` and return the frozen snapshot only. Route strings remain rendering outputs and are never identity, never client input, and never a substitute for `(resource_type, resource_id)`.

Corresponding wording applies unchanged in spirit to `content_resources`, `healing_resources`, and `courses`: full Temple access first, then registry approval and non-suspension, then safety gates, then publication, then route emission.

### 2.2 Zero-residue concurrency harness (barrier helper and fixture identity)

Exact design, binding for the later B3 implementation fixtures:

**Barrier helper — creation.** A single test-only function `public._arrival_test_barrier(_key bigint)`, `LANGUAGE plpgsql`, `SECURITY DEFINER`, `SET search_path = public`, whose body takes `pg_advisory_xact_lock(_key)` only. The lock is **transaction-scoped**: it releases automatically at commit or rollback, so no session-level lock can survive a fixture. The function performs no DML, touches no Arrival table, and returns void. It exists only for the duration of the fixture run.

**Barrier helper — ACL.** Created inside the same transaction/migration step as its ACL statements, in this order: `REVOKE ALL ON FUNCTION public._arrival_test_barrier(bigint) FROM PUBLIC;` then `GRANT EXECUTE ... TO service_role;` and nothing else. It is never executable by `PUBLIC`, `anon`, or ordinary `authenticated` members. Fixture drivers reach it only through the `service_role` path.

**Barrier helper — removal.** `DROP FUNCTION IF EXISTS public._arrival_test_barrier(bigint);` runs unconditionally in the teardown step, including on fixture failure (teardown is not conditional on assertions passing). Verification: `SELECT count(*) = 0 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname LIKE '\_arrival\_test\_%'`.

**Fixture identity — creation.** One `auth.users` row created only through the platform's supported admin path, tagged with a recognisable fixture marker, and recorded in the driver's local state. No database role is created; no `SET`/`ALTER ROLE`/`ALTER DATABASE` setting is introduced; no grant is issued to any fixture principal; no policy is added, altered, or relaxed for the fixture. RLS is exercised as-is under the fixture user's own JWT.

**Fixture identity — removal.** Teardown deletes the fixture user, which cascades its Arrival rows, then explicitly deletes any residual `arrival_interactions` rows for that user id (cascade removes `arrival_answers`, `arrival_recommendation_runs`, `arrival_recommendations`). Every fixture transaction that is expected to fail must fail by `RAISE`, so it rolls back completely and leaves no partial rows.

**Verification / zero-residue proof.** Teardown asserts, as a single final report:
1. `count(*) = 0` for each of `arrival_interactions`, `arrival_answers`, `arrival_recommendation_runs`, `arrival_recommendations`, `arrival_interactions` restart successors, and every other Arrival table scoped to the fixture identity (by `user_id`, or by join through `interaction_id`/`run_id`).
2. `count(*) = 0` for the fixture identity in `auth.users` and in `public.profiles`.
3. Zero test-only helper functions remaining (`pg_proc` check above).
4. Zero fixture roles: `count(*) = 0` from `pg_roles` for any fixture-named role (none are created, so this must be trivially zero).
5. Zero fixture grants/ACL residue: `arrival_resource_registry` still shows no `anon`/`authenticated` privileges in `pg_class.relacl`, and no Arrival object ACL differs from its pre-fixture snapshot.
6. Zero fixture settings: no non-default entries in `pg_db_role_setting` and no `current_setting` keys introduced by the fixture.
7. Registry curation rows and all pre-existing content are byte-identical to their pre-fixture snapshot.

Any assertion failing makes the whole fixture run a FAIL; residue is never accepted as incidental.

## 3. Additional confirmations

- `/devotion/resources/content-<uuid>` is the **approved** emitted content-resource route; B3 emits `'/devotion/resources/content-' || id`.
- B3 **never** emits `/devotion/courses/:slug` or `/remembrance/courses/:slug`, and never accepts a route string as input.
- The broken legacy slug course routes (`src/App.tsx:129`, `src/App.tsx:106`) are recorded as **out-of-scope technical debt** and are **not repaired in B3**.
- `anon SELECT` on `public.courses` and `public.lessons` likewise remains reported, out-of-scope debt for B3.

## 4. Remaining B3 blocker

**None blocking.** Implementation may proceed with slice 1 order as previously accepted. Two open items remain informational only: the legacy slug course routes and the `anon SELECT` grants on `courses`/`lessons`, both explicitly out of B3 scope.

## 5. Read-only scope confirmation

No migrations, database objects, functions, grants, policies, RLS changes, data, routes, UI, hooks, types, seeds, tests, fixtures, builds, or deployments were created, modified, or deleted during this addendum. No database write of any kind occurred. The only file written is this report document.
