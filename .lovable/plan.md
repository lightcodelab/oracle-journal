# Task Arrival-B3 Preflight — Transactional Service Contract

## 1. Verdict

**PASS WITH BLOCKERS.**

The accepted B1 + B1.1 foundation is live, drift-free, and sufficient to implement six of the seven operations exactly as specified. Three blockers (B-1, B-2, B-3 in §13) constrain `arrival_generate_recommendations` hard-gate scope and the corresponding fixture set; they are B2/registry-shape decisions, not B1 defects.

## 2. Repository state

| Item | Value |
|---|---|
| HEAD | `d466529d043d7ab4a5a6291a543f24e395ebd906` |
| `git status --porcelain` | empty (clean) |
| Migration count | 141 |
| B1 file | `supabase/migrations/20260729090536_3e2799e5-4a80-452a-ba74-c6f4e1ba85e1.sql` — present |
| B1 SHA-256 | `b3d1a2cfc0f6ac1032e87e12ca4f16db677286d6d7ad6ffdc512ff9969995693` |
| B1.1 file | `supabase/migrations/20260730011534_b3a7e700-ed8b-4b23-87d2-b2a89c1949bc.sql` — present |
| B1.1 SHA-256 | `beb5a9066992b3cad42fb58cfd3430b8bb7790a462a84a3151774a76b7777f65` |

Note: the task brief cites B1 as `20260729090545_ea1e68ab-…`. No such file exists. The only Arrival B1 migration in the repo is `20260729090536_3e2799e5-…`. Treated as the accepted B1.

## 3. Live / source drift

**No drift.** Object inventories parsed from the two migration files match the live catalogue exactly:

- 10 tables, 13 `arrival_*` functions, 21 triggers, 4 policies, 13 indexes — identical sets in source and live.
- Live function bodies for `arrival_run_immutable`, `arrival_recommendation_immutable`, `arrival_question_lock`, `arrival_answer_option_lock`, `arrival_match_rule_lock`, `arrival_qv/rv_delete_guard`, `arrival_reasons_valid` are the B1.1 corrected versions (parent-row discriminator on DELETE; INSERT blocked on published parents).

## 4. Accepted schema details B3 depends on

### 4.1 Version control
- `arrival_questionnaire_versions(version_number uk, status draft|published|archived, published_at)`; `arrival_rule_versions(questionnaire_version_id, version_number uk, status draft|published|retired, is_current, published_at)`.
- `arrival_rv_single_current_uk`: `UNIQUE ((1)) WHERE is_current` — **at most one current rule version globally**.
- `arrival_rv_id_qv_uk UNIQUE (id, questionnaire_version_id)` backs the composite FKs that pin interaction and run to the same questionnaire.
- `arrival_rv_current_only_when_published CHECK (NOT is_current OR status='published')`.

### 4.2 Questionnaire body
- `arrival_questions(questionnaire_version_id, slug, prompt, helper_text, display_order, select_min default 1, select_max default 1, required default true)` with `select_max >= select_min`, `required ⇒ select_min >= 1`. **Multi-select is expressed by `select_max > 1`** — no B2 content decision needed at B3.
- `arrival_answer_options(question_id, slug, label, display_order)`; `arrival_ao_id_question_uk UNIQUE (id, question_id)`.

### 4.3 Interaction
- `arrival_interactions(user_id → auth.users ON DELETE CASCADE, questionnaire_version_id, rule_version_id, state, answers_revision bigint default 0, restarted_from_interaction_id, started_at, completed_at, abandoned_at)`.
- `arrival_i_one_in_progress_per_user`: `UNIQUE (user_id) WHERE state='in_progress'` — the concurrency primitive for start/resume and restart.
- `arrival_i_restart_successor_uk`: `UNIQUE (restarted_from_interaction_id) WHERE NOT NULL` — the replay primitive for restart.
- `arrival_i_state_timestamps` couples state to its timestamp; `arrival_i_rule_matches_qv` composite FK pins the rule version to the questionnaire version.

### 4.4 Answers
- `arrival_answers(interaction_id ON DELETE CASCADE, question_id, answer_option_id)`.
- `arrival_a_option_belongs_to_question FOREIGN KEY (answer_option_id, question_id) REFERENCES arrival_answer_options(id, question_id)` — **option/question mismatch is already impossible at the DB level**.
- `arrival_a_unique_selection UNIQUE (interaction_id, question_id, answer_option_id)`.
- Question-belongs-to-pinned-questionnaire is **not** enforced by constraint; B3 must validate it.

### 4.5 Registry
- `arrival_resource_registry(content_resource_id | healing_resource_id | course_id | lesson_id, active bool default true, admin_notes)`; `num_nonnulls(...) = 1`; one partial unique index per family; source identity immutable via `arrival_registry_lock_source`.
- Registry carries **no** duration, modality, intensity, capacity, sequence, bridge, route, approval-vs-suspension, or door column.

### 4.6 Rules
- `arrival_resource_match_rules(rule_version_id, registry_id, answer_option_id, effect MATCH|BOOST|EXCLUDE, weight numeric default 0, reason_template)`; `EXCLUDE ⇒ weight = 0`; `weight >= 0`; `UNIQUE (rule_version_id, registry_id, answer_option_id, effect)`. Immutable and insert-blocked once the rule version is published/retired.

### 4.7 Run and recommendations
- `arrival_recommendation_runs(interaction_id UNIQUE, rule_version_id, questionnaire_version_id, outcome complete|partial)`; trigger `arrival_rr_check_pin` rejects a run whose pinned versions differ from the interaction. **`UNIQUE(interaction_id)` is the one-run-per-interaction guarantee.**
- `arrival_recommendations(run_id ON DELETE CASCADE, registry_id, resource_type, resource_id, title_snapshot, summary_snapshot, score, reasons jsonb, rank)`; `rank BETWEEN 1 AND 3`; `UNIQUE(run_id, rank)`; `UNIQUE(run_id, registry_id)`; `reasons` must satisfy `arrival_reasons_valid` (JSON array, length 1–2, all non-empty strings); no default on `reasons`.
- No route column. Routes are re-resolved at read time — matches the locked boundary.

### 4.8 Privilege boundary (as accepted)
All ten tables: `rls = true`, **`force = true`**, `acl = {postgres, service_role, sandbox_exec}`. **`anon` and `authenticated` hold no table privileges.** The four `*_owner_select` policies (`authenticated`, `USING user_id = auth.uid()` / EXISTS-join) are therefore currently inert defence-in-depth. B3 must **not** add table grants; all member access flows through `SECURITY DEFINER` RPCs.

## 5. Existing conventions, with evidence

| Convention | Evidence |
|---|---|
| Authenticated member RPC returning jsonb | `public.get_member_state(_user_id uuid)` — `secdef=true`, `search_path=public`, `EXECUTE` to `authenticated`; consumed by `src/hooks/useMemberState.ts` L112 |
| Membership gate | `public.has_full_temple_access(_user_id uuid)` — `SQL STABLE SECURITY DEFINER SET search_path=public` |
| Admin gate returning the actor | `public.assert_caller_is_admin()` used as `DECLARE v_actor uuid := public.assert_caller_is_admin();` in `20260721065320_5114f349-….sql` L257/281/307 |
| Row locking before conditional write | `20260721065320_…` L261 `PERFORM 1 … FOR UPDATE`, L283/L309 `SELECT * INTO v_row … FOR UPDATE` |
| Lock-or-insert idempotency | `20260720071015_aedb98e9-….sql` L52–60 (`stripe_webhook_events`: `SELECT … FOR UPDATE; IF NOT FOUND THEN INSERT`) |
| Replay tolerance (return instead of raise) | `admin_revoke_manual_full_access` L311 `IF v_row.revoked_at IS NOT NULL THEN RETURN; END IF;` |
| Transaction-scoped fixture testing | `_mirror_exchange_run_tests()`, `_oracle_access_run_tests()`, `_phase3_2_run_tests()` — `RETURNS TABLE(name text, passed boolean, detail text)`, `SECURITY DEFINER`, `search_path=public`; B1.1 verification block in `20260730011534_…` |
| Owner-only RLS with explicit `TO authenticated` | `20260729035039_d5a134ec-….sql` L42–47, L71–76 |
| Function ownership / grants baseline | every helper above: `owner=postgres`, `proacl` grants `EXECUTE` to `authenticated` + `service_role` only (no `anon` on member RPCs; `anon` present only on `has_role`, `has_full_temple_access`, `attribute_affiliate_referral`) |

**No existing project convention** for optimistic revision control or for structured `{ok, code, data}` error envelopes — existing RPCs use `RAISE EXCEPTION` with plain messages (`'Grant not found'`). B3 introduces the revision pattern (schema already provides `answers_revision`) and should keep `RAISE EXCEPTION` with an `ERRCODE` for errors, matching the house style rather than inventing an envelope.

## 6. Proposed RPC signatures

All: `LANGUAGE plpgsql`, `SECURITY DEFINER`, `OWNER TO postgres`, `SET search_path = public`, `REVOKE ALL … FROM PUBLIC, anon`, `GRANT EXECUTE … TO authenticated` (plus `service_role` where noted). Every one begins with `v_uid uuid := auth.uid()`; a NULL uid raises `insufficient_privilege`, and a non-`has_full_temple_access(v_uid)` caller raises `insufficient_privilege`.

| # | Signature | Returns | Volatility |
|---|---|---|---|
| 1 | `arrival_start_or_resume()` | `jsonb` | VOLATILE |
| 2 | `arrival_abandon_and_restart(_expected_interaction_id uuid)` | `jsonb` | VOLATILE |
| 3 | `arrival_save_answers(_interaction_id uuid, _expected_revision bigint, _answers jsonb)` | `jsonb` | VOLATILE |
| 4 | `arrival_generate_recommendations(_interaction_id uuid, _expected_revision bigint)` | `jsonb` | VOLATILE |
| 5 | `arrival_load_interaction(_interaction_id uuid)` | `jsonb` | STABLE |
| 6 | `arrival_list_history(_limit int DEFAULT 20, _offset int DEFAULT 0)` | `jsonb` | STABLE |
| 7 | `arrival_resolve_run(_run_id uuid)` | `jsonb` | STABLE |

`_answers` shape: `[{"question_id": uuid, "option_ids": [uuid, …]}, …]`. No user id, score, candidate, order, route, or state field is accepted anywhere — the only client inputs are opaque identifiers the server re-validates against `auth.uid()`-owned rows.

## 7. Per-operation contracts

### 7.1 `arrival_start_or_resume()`
- **Transaction:** the implicit single-statement transaction of the RPC call.
- **Reads:** `arrival_interactions` (caller's `in_progress` row, `FOR UPDATE`), `arrival_questionnaire_versions`, `arrival_rule_versions`, `arrival_questions`, `arrival_answer_options`, `arrival_answers`.
- **Flow:** lock-or-create, mirroring `20260720071015_…` L52–60. `SELECT … WHERE user_id = v_uid AND state='in_progress' FOR UPDATE`. If found → return it plus its pinned questionnaire payload. If not found → resolve `rv` = the single `arrival_rule_versions` row with `is_current`, and `qv` = `rv.questionnaire_version_id` (must be `status='published'`); insert one interaction pinned to both.
- **Concurrency:** two simultaneous first-time calls both miss the lock and both insert; `arrival_i_one_in_progress_per_user` makes exactly one succeed. The loser catches `unique_violation` and re-selects the winner's row, returning the identical result. No duplicate is possible.
- **Writes:** 0 or 1 `arrival_interactions` row.
- **Errors:** `insufficient_privilege` (no uid / no full Temple access); `no_data_found` `'arrival is not currently published'` when no `is_current` published rule version exists.
- **Returns:** `{interaction_id, state, answers_revision, questionnaire_version_id, rule_version_id, started_at, questions:[{id, slug, prompt, helper_text, display_order, select_min, select_max, required, options:[{id, slug, label, display_order}]}], answers:[{question_id, option_ids[]}]}`. No rule, weight, registry, or score data is exposed.
- **Forgery:** the caller supplies nothing; the questionnaire and rule version are chosen by the server from `is_current`.

### 7.2 `arrival_abandon_and_restart(_expected_interaction_id uuid)`
- **Reads/locks:** `SELECT … WHERE id = _expected_interaction_id FOR UPDATE`, then assert `user_id = v_uid`.
- **Replay:** if the locked row is already `abandoned`, look up its successor via `arrival_i_restart_successor_uk` (`WHERE restarted_from_interaction_id = _expected_interaction_id`). If a successor exists → return it unchanged. If it is `abandoned` with no successor → raise (indicates a torn state, never produced by this RPC). If the row is `completed` → `invalid_parameter_value`.
- **Writes:** `UPDATE … SET state='abandoned', abandoned_at = now()` then `INSERT` the successor pinned to the **current** published questionnaire/rule version, with `restarted_from_interaction_id = _expected_interaction_id`. Both in the one RPC transaction; a failure of either rolls back both.
- **Concurrency:** the `FOR UPDATE` on the predecessor serialises restart. A second concurrent caller blocks, then sees `abandoned` + an existing successor and takes the replay path. The successor insert is additionally protected by both `arrival_i_one_in_progress_per_user` and `arrival_i_restart_successor_uk`; a `unique_violation` on either is caught and converted to the replay lookup.
- **Errors:** `insufficient_privilege`; `no_data_found` (unknown id); `insufficient_privilege` for a foreign interaction (deliberately indistinguishable from not-found in the message to avoid ID probing); `invalid_parameter_value` (completed).
- **Returns:** identical shape to `arrival_start_or_resume`, for the successor.

### 7.3 `arrival_save_answers(_interaction_id, _expected_revision, _answers)`
- **Locks:** `SELECT … FOR UPDATE` on the interaction; assert `user_id = v_uid` and `state='in_progress'`.
- **Optimistic control:** `IF v_row.answers_revision <> _expected_revision THEN RAISE EXCEPTION … ERRCODE '40001'` (`serialization_failure`) so the client can refetch and retry. The lock guarantees the check-then-write is atomic.
- **Validation:** every `question_id` must belong to `v_row.questionnaire_version_id`; every `option_id` must belong to that `question_id` (also structurally guaranteed by `arrival_a_option_belongs_to_question`); `array_length(option_ids)` must fall within that question's `select_min`/`select_max` (0 allowed only when `required = false` and `select_min = 0`); no duplicate option ids. Any violation raises `invalid_parameter_value` and rolls the whole save back — partial saves are impossible.
- **Writes:** `DELETE` then `INSERT` the caller's answers for exactly the submitted question ids (leaves untouched questions intact), then `UPDATE arrival_interactions SET answers_revision = answers_revision + 1`.
- **Returns:** `{interaction_id, answers_revision, saved_question_count, answers:[…]}`.
- **Forgery:** the questionnaire version comes from the pinned interaction, never from the payload; unpublished, foreign, or cross-version questions cannot be reached.

### 7.4 `arrival_generate_recommendations(_interaction_id, _expected_revision)`
One PL/pgSQL body = one database transaction. All 14 required steps occur inside it; any raise rolls back everything including the run.

1. `v_uid := auth.uid()`; NULL → `insufficient_privilege`. `has_full_temple_access(v_uid)` false → `insufficient_privilege`.
2. `SELECT * INTO v_i FROM arrival_interactions WHERE id = _interaction_id FOR UPDATE;` — serialises generation per interaction.
3. **Replay short-circuit:** `SELECT * FROM arrival_recommendation_runs WHERE interaction_id = _interaction_id` — if present, return that existing run's payload verbatim and exit. This is reached under the lock, so a concurrent second caller blocks, then takes this path. `arrival_recommendation_runs_interaction_id_key` is the belt-and-braces guarantee; a `unique_violation` on insert is caught and converted to the same re-read.
4. Ownership (`v_i.user_id = v_uid`), status (`in_progress`), revision (`answers_revision = _expected_revision`, else `40001`), completeness (every `required` question of the pinned version has answers within `select_min`/`select_max`) — else `invalid_parameter_value`.
5. **Signal derivation is server-side only:** the candidate signal set is exactly `SELECT answer_option_id FROM arrival_answers WHERE interaction_id = v_i.id`. Nothing from the client enters scoring.
6. **Hard gates** (see §9): registry `active = true`, and per-family publication/availability re-checked live at generation time.
7. **Effects**, evaluated against `arrival_resource_match_rules WHERE rule_version_id = v_i.rule_version_id AND answer_option_id = ANY(selected)`:
   - `EXCLUDE` present for a registry row → that row is removed regardless of any other effect (EXCLUDE dominates).
   - at least one `MATCH` required → registry rows with zero MATCH rows are ineligible, so `BOOST` alone can never create eligibility.
   - `score = sum(weight)` over surviving MATCH + BOOST rows.
8. **Deterministic rank:** `ORDER BY score DESC, r.created_at ASC, r.id ASC`.
9. `LIMIT 3`.
10. **Snapshot:** `title_snapshot` and `summary_snapshot` resolved live from the source table (§9); reasons = the distinct non-empty `reason_template` values of the **MATCH** rows that fired, ordered by weight desc then rule id asc, `LIMIT 2`. If zero non-empty MATCH reasons survive for a candidate, that candidate is dropped before ranking (it cannot satisfy `arrival_rc_reasons_valid`).
11. Insert exactly one `arrival_recommendation_runs` row with `outcome` from step 13; `arrival_rr_check_pin` re-verifies the pinned versions.
12. Insert 1–3 `arrival_recommendations` with `rank = 1..n`; immutable by trigger from that moment.
13. `outcome = 'complete'` when n = 3, `'partial'` when n ∈ {1,2}. Mark the interaction `state='completed', completed_at=now()`.
14. n = 0 → `RAISE EXCEPTION … ERRCODE 'no_data_found'`. The raise unwinds the entire RPC transaction, so no run, no recommendations, and no state change persist; the interaction stays `in_progress`.

- **Returns:** `{run_id, outcome, interaction_id, created_at, recommendations:[{rank, resource_type, resource_id, title, summary, reasons[]}]}` — score is not returned to the client.

### 7.5 `arrival_load_interaction(_interaction_id uuid)`
`STABLE`, read-only. Asserts uid, full access, and `user_id = v_uid`. Returns the same payload shape as `arrival_start_or_resume`, plus `run` (the §7.7 shape) when the interaction is completed. No table grant is required or added; the RPC is the only door.

### 7.6 `arrival_list_history(_limit int DEFAULT 20, _offset int DEFAULT 0)`
`STABLE`. `_limit` clamped to `[1, 50]`. Returns `{items:[{interaction_id, state, started_at, completed_at, abandoned_at, run_id, outcome, recommendation_count, titles:[title_snapshot …]}], total}` for `user_id = auth.uid()` only, ordered `started_at DESC`. **Raw answers are deliberately not exposed** — the accepted contract does not require them in history; they remain reachable only through `arrival_load_interaction` for a specific owned interaction. No admin variant exists.

### 7.7 `arrival_resolve_run(_run_id uuid)`
`STABLE`. Asserts uid, full access, and ownership via `run → interaction.user_id = auth.uid()`. For each frozen recommendation, joins the registry to the live source row and returns:

`{run_id, outcome, created_at, items:[{rank, resource_type, resource_id, title: title_snapshot, summary: summary_snapshot, reasons, available: bool, route: text|null}]}`

- `title`/`summary`/`reasons` always come from the frozen snapshot — never re-read from live.
- `available = false` and `route = null` when the source row is missing, unpublished, or (for a lesson) its parent course is unpublished. The item is still returned so history stays visible, and it is rendered muted and non-navigable.
- No fallback, no substitution, no nearest-match: the resolver only ever resolves the exact `(resource_type, resource_id)` recorded.

## 8. Ownership, `search_path`, grants

For all seven functions:

```sql
ALTER FUNCTION public.<fn>(…) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.<fn>(…) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.<fn>(…) TO authenticated;
GRANT EXECUTE ON FUNCTION public.<fn>(…) TO service_role;
```

`SECURITY DEFINER`, `SET search_path = public` (matching `get_member_state` / `has_full_temple_access` / `admin_*` precedent). `anon` is explicitly revoked — Arrival is member-only. No table-level `GRANT` to `anon` or `authenticated` is added; the B1 privilege boundary is preserved unchanged.

## 9. Resource-family route / access matrix

Legend: **A** = already in the accepted Arrival schema; **B2** = belongs in the registry/rule seed; **D** = resolved dynamically in B3; **✗** = does not exist today.

| Signal | content_resources | healing_resources | courses | lessons |
|---|---|---|---|---|
| Publication | **D** `status='published'` (+ `scheduled_publish_at`) | **D** `status='published'` (+ `scheduled_publish_at`) | **D** `is_published = true` | **D** inherit parent `courses.is_published` — table has no own flag |
| Arrival approval | **A** `registry.active` | **A** | **A** | **A** |
| Suspension | **A** — same `active` flag, no separate column (see B-1) | **A** | **A** | **A** |
| Duration | ✗ | **D** `duration_sec` | ✗ | ✗ |
| Modality | ✗ (`resource_type_id` only) | **D** `modality` enum | ✗ | ✗ |
| Capacity / intensity | ✗ | **D** `intensity` int | ✗ | ✗ |
| Sequence position | ✗ | ✗ | **D** `display_order` | **D** `module_order`, `lesson_number` |
| Bridge movement | ✗ | ✗ | ✗ | ✗ |
| Route construction | **D** `/devotion/resources/:slug` or `/decks/resources/:slug` via `content_categories.page` | **D** rendered under Devotion resource paths | **D** `/devotion/courses/:slug`-family via `location_id` / `door_type` | **D** `/devotion/course/:course_id/lesson/:id` |
| Parent course | n/a | n/a | n/a | **D** `lessons.course_id` |
| Member entitlement | **D** `has_full_temple_access` | **D** + `tier` | **D** | **D** via `can_view_lesson*` |
| Broken/stale route | ✗ — no server-side route health source | ✗ | ✗ | ✗ |

Search tags were not used for any cell.

## 10. Publication-control gap

**Gap exists; it does not block B3.**

- Nothing in the accepted foundation or the seven operations can move a questionnaire version `draft → published`, or a rule version `draft → published` with `is_current = true` while retiring the predecessor. `arrival_questionnaire_lock` / `arrival_rule_version_lock` permit exactly those transitions, but only for a caller with table privileges — which today means `postgres`/`service_role` only.
- B2 can therefore publish entirely from within its own migration (running as `postgres`), which is the same mechanism every prior seed in this repo uses. B3's `arrival_start_or_resume` only needs to *read* `is_current` and does not care how it was set.
- Proposed narrow contract, **not created here**, for a later admin task:
  - `arrival_admin_publish_questionnaire_version(_qv_id uuid) RETURNS jsonb` — `assert_caller_is_admin()`, `FOR UPDATE`, draft-only, sets `status='published', published_at=now()`, requires ≥1 question and ≥2 options per question.
  - `arrival_admin_publish_rule_version(_rv_id uuid) RETURNS jsonb` — `assert_caller_is_admin()`, `FOR UPDATE`, draft-only, parent questionnaire published, ≥1 MATCH rule present, atomically `is_current=false` + `status='retired'` on the prior current row and `is_current=true, status='published'` on the new one (`arrival_rv_single_current_uk` enforces the swap).
  - Both grant admins control over *content* only. Neither reads `arrival_answers`, `arrival_interactions`, `arrival_recommendation_runs`, or `arrival_recommendations` — the no-admin-access-to-private-member-data boundary is untouched.
- **Verdict: blocks B2 ergonomics only, not B3 implementation.**

## 11. Zero-residue fixture plan

Shape: `public._arrival_b3_run_tests() RETURNS TABLE(label text, passed boolean, note text)`, `SECURITY DEFINER`, `SET search_path=public`, following `_mirror_exchange_run_tests()` / `_oracle_access_run_tests()`. Called once inside the B3 implementation migration from a `DO` block wrapped in `BEGIN … EXCEPTION WHEN … END` with an explicit terminal `RAISE EXCEPTION 'rollback fixtures'` caught by the outer block, so every fixture row unwinds. Sentinel `auth.users` rows are created with a fixed `arrival-b3-fixture-…@invalid` prefix and deleted explicitly before the rollback, then asserted absent.

Caller identity is simulated with `PERFORM set_config('request.jwt.claims', json_build_object('sub', <uid>, 'role','authenticated')::text, true)` (`true` = transaction-local, so it also unwinds), and cleared between cases.

| # | Case | Expected |
|---|---|---|
| 1 | unauthenticated (`claims` cleared) calls each of the 7 | `insufficient_privilege` |
| 2 | member without full Temple access | `insufficient_privilege` on all 7 |
| 3 | member B calls load/resolve/restart on member A's ids | `insufficient_privilege`; zero rows disclosed |
| 4 | two `arrival_start_or_resume` in one transaction after the first commits its unique index reservation | one interaction total; identical ids returned |
| 5 | concurrent restart (simulated: second call after the first, same `_expected_interaction_id`) | successor returned, not duplicated |
| 6 | replayed restart (third call) | same successor id |
| 7 | `arrival_save_answers` with `_expected_revision = revision - 1` | `40001`, revision unchanged |
| 8 | save with foreign `question_id`, cross-version `question_id`, option of another question, unpublished-version question | `invalid_parameter_value`; zero answers written |
| 9 | direct `INSERT/UPDATE/DELETE` as `authenticated` on all 10 tables | permission denied (no grants) |
| 10 | registry row whose source is `status='draft'` / `is_published=false` | excluded from candidates |
| 11 | registry row with `active=false` | excluded |
| 12 | recommendation whose source row is later unpublished, then `arrival_resolve_run` | `available=false`, `route=null`, snapshot title intact |
| 13 | candidate with NULL `duration_sec` | see B-2 — asserts documented v1 behaviour only |
| 14 | over-duration / over-intensity candidate | see B-2 |
| 15 | lesson candidate whose parent course is unpublished | excluded at generation; `available=false` at resolve |
| 16 | `EXCLUDE` + high-weight `MATCH` on the same registry row | excluded |
| 17 | `BOOST` only, no `MATCH` | not recommended |
| 18 | identical fixture run twice from two interactions with identical answers | byte-identical ordering and ranks |
| 19 | second `arrival_generate_recommendations` on the same interaction | same `run_id`; `arrival_recommendation_runs` count stays 1 |
| 20 | 3+ eligible candidates | `outcome='complete'`, 3 rows, ranks 1-2-3 |
| 21 | exactly 2 eligible | `outcome='partial'`, 2 rows |
| 22 | 0 eligible | raises; zero runs, zero recommendations, interaction still `in_progress`, `answers_revision` unchanged |
| 23 | rule with empty/whitespace `reason_template`, and with 3 firing MATCH reasons | candidate dropped / exactly 2 reasons stored |
| 24 | `UPDATE`/`DELETE` on an emitted run or recommendation as `postgres` | blocked by B1.1 immutability triggers |
| 25 | `DELETE FROM auth.users` for a fixture member with a completed run | zero orphaned interactions/answers/runs/recommendations |
| 26 | `arrival_list_history` as member B | only B's rows; A's count = 0 |
| 27 | post-rollback assertion | zero `arrival_*` rows, zero fixture `auth.users`, zero fixture `content_resources`/`courses`/`lessons`/`healing_resources` |

No mutation fixture was executed during this preflight.

## 12. Recommended B3 slices, in dependency order

1. **B3.1** — `arrival_start_or_resume`, `arrival_load_interaction`, plus the shared internal helper that builds the questionnaire payload. Grants and revocations. Fixtures 1–4, 9, 26.
2. **B3.2** — `arrival_abandon_and_restart`. Fixtures 5, 6.
3. **B3.3** — `arrival_save_answers`. Fixtures 7, 8.
4. **B3.4** — `arrival_generate_recommendations` + the internal eligibility/route-availability helper. Fixtures 10, 11, 15–24.
5. **B3.5** — `arrival_list_history`, `arrival_resolve_run`. Fixtures 12, 25, 27.

Slices 1–3 are implementable today with zero seed data (they raise cleanly when nothing is published). Slice 4 can be written today but can only be *fixture-verified* using transaction-scoped synthetic questionnaire/rule/registry rows — which is the plan above, so B2 is not a hard prerequisite.

## 13. Blockers and owner decisions

- **B-1 (owner decision).** The registry has a single `active` boolean. "Arrival approval" and "suspension" are therefore the same switch, and a suspension leaves no reason or audit trail. Confirm this is acceptable for v1, or authorise a B2 registry column (`suspended_at`, `suspension_reason`).
- **B-2 (blocker for 4 fixtures).** Duration, capacity/intensity, and sequence position exist only on `healing_resources` (`duration_sec`, `intensity`) and on ordering columns of `courses`/`lessons`. `content_resources`, `courses`, and `lessons` have no duration or capacity at all, and **bridge movement does not exist on any family**. The fixture cases "unknown duration", "over-time", "over-capacity", and "premature sequence" cannot be meaningfully asserted for three of four families. Decide: (a) drop time/capacity/sequence hard gates from v1 and treat those four fixtures as documented-behaviour assertions only; or (b) authorise B2 registry columns carrying admin-curated duration/capacity/sequence/bridge values.
- **B-3 (blocker for 1 fixture).** There is no server-side source of route health — routes are constructed inside page components, and no table records a canonical path. B3 can only detect *unavailable source rows*, not *stale or broken routes*. Confirm that "broken route" collapses into "source unavailable" for v1, or authorise a route-resolution table in B2.
- **B-4 (informational).** The four `*_owner_select` policies are inert because `authenticated` holds no table privileges. That is correct for the RPC-only design; flagged so it is not later mistaken for a defect and "fixed" by adding grants.
- **B-5 (informational).** The task brief's B1 filename `20260729090545_ea1e68ab-…` does not exist; `20260729090536_3e2799e5-…` was used. Confirm the reference.

## 14. Change confirmation

No files were created, modified, moved, or deleted. No migration was authored or applied. No database object, row, grant, policy, trigger, or function was created or altered. No route, UI, hook, type, seed, test, build, deployment, or later-stage work was touched. Every database statement issued was a catalogue `SELECT`.

## 15. Final `git status --porcelain`

Empty — working tree clean at `d466529d043d7ab4a5a6291a543f24e395ebd906`.
