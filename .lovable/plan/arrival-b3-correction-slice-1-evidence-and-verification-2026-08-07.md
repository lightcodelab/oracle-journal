# Arrival-B3 Correction — Slice 1 Evidence and Verification

## 1. Verdict

**PASS WITH BLOCKERS.**

The Slice 1 schema, constraints, indexes, controlled write pathway and privilege posture are directly evidenced below and match the reported state. Three blockers remain: the mandated fixture battery cannot be executed under the Plan-mode read-only constraint of this task, `sequence_stage` admits three stages where this task's fixture list assumes seven, and suspension provenance (`suspended_by`) is enforced only by the admin RPC, not by a table constraint.

No mutation of any kind occurred during this verification. All database access was read-only catalog/`SELECT` inspection; the repository tree is unchanged apart from this report.

## 2. Repository evidence

- HEAD: `171dc023fcd006664e465f34f78d1214929968c6`
- Initial `git status --porcelain`: empty (clean)
- Final `git status --porcelain`: `?? .lovable/plan.md` (this report only)
- Migration count: 146 files in `supabase/migrations/`
- Slice 1 migration (single file): `supabase/migrations/20260807020457_af02b444-71df-4503-8373-f15893362fd4.sql`
- SHA-256: `518ad990baee70822d363f8968d2cbd31a6c6e903e6b53045e6cb3693ba77806`
- Length: 123 lines
- Changed-file list for Slice 1: that migration file plus the auto-regenerated `src/integrations/supabase/types.ts` (registry Row/Insert/Update now carry `bridge_codes`, `modality_codes`, `duration_minutes`, `intensity_level`, `sequence_stage`, `suspended_at`, `suspension_reason`, `suspended_by`; `arrival_admin_suspend_resource` appears in the Functions block). No application source, hook, route, UI, test, or Edge Function references the registry or these columns.

## 3. Live column definitions (from `information_schema.columns`)

| Column | Type | Default | Nullable | Allowed values | CHECK | Index | Unknown value behaviour | Authoritative writer | Client privilege |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `suspended_at` | `timestamptz` | none | YES | any instant, or NULL | `arrival_registry_suspension_reason_ck` | `arrival_registry_not_suspended_idx` partial `WHERE suspended_at IS NULL` | NULL = not suspended | `arrival_admin_suspend_resource` / `_unsuspend_` | none |
| `suspension_reason` | `text` | none | YES | non-empty after `btrim` when suspended; NULL otherwise | same CK | — | must be NULL when not suspended | same RPCs | none |
| `suspended_by` | `uuid` | none | YES | `auth.users(id)`, `ON DELETE SET NULL` | FK only | — | NULL = provenance unrecorded (blocker 3) | same RPCs (`auth.uid()`) | none |
| `duration_minutes` | `integer` | none | YES | `> 0` or NULL | `arrival_registry_duration_ck` | — | NULL = unknown; never satisfies a duration-bounded MATCH | admin curation via owner/migration path | none |
| `modality_codes` | `text[]` | `'{}'` | NO | subset of `meditation, visualisation, ritual, somatic, process, recipe`, no duplicates | `arrival_registry_modality_vocab_ck` | GIN `arrival_registry_modality_codes_idx` | `{}` = unknown; ineligible for modality-conditioned MATCH | same | none |
| `intensity_level` | `smallint` | none | YES | `1..3` or NULL | `arrival_registry_intensity_ck` | — | NULL = unknown; never inferred as low demand | same | none |
| `sequence_stage` | `smallint` | none | YES | `1..3` or NULL | `arrival_registry_sequence_ck` | — | NULL = unknown; never inferred as regulate | same | none |
| `bridge_codes` | `text[]` | `'{}'` | NO | exactly the locked 21 codes, no duplicates | `arrival_registry_bridge_vocab_ck` | GIN `arrival_registry_bridge_codes_idx` | `{}` = unknown; ineligible for bridge-conditioned MATCH | same | none |

Live CHECK definitions, verbatim from `pg_constraint`:

```text
arrival_registry_suspension_reason_ck  CHECK (((suspended_at IS NULL AND suspension_reason IS NULL)
                                         OR (suspended_at IS NOT NULL AND btrim(COALESCE(suspension_reason,'')) <> '')))
arrival_registry_duration_ck           CHECK ((duration_minutes IS NULL OR duration_minutes > 0))
arrival_registry_intensity_ck          CHECK ((intensity_level IS NULL OR (intensity_level >= 1 AND intensity_level <= 3)))
arrival_registry_sequence_ck           CHECK ((sequence_stage IS NULL OR (sequence_stage >= 1 AND sequence_stage <= 3)))
arrival_registry_modality_vocab_ck     CHECK (arrival_codes_valid(modality_codes, ARRAY['meditation','visualisation','ritual','somatic','process','recipe']))
arrival_registry_bridge_vocab_ck       CHECK (arrival_codes_valid(bridge_codes, ARRAY['establish_safety','settle','anchor','contain','comfort',
                                         'reduce_demand','restore','replenish','separate','release','stabilise','orient','reconnect','clarify',
                                         'reveal','express','discharge','restore_agency','integrate','embody','deepen']))
```

The bridge array in the live constraint is exactly the 21 locked codes in the locked order — no synonyms, aliases, free text, or extra categories. The vocabulary is a literal array inside the constraint, so it cannot be widened without a migration, and it has no relationship to any Search-tag table: `resource_tags`, `resource_tag_assignments`, `course_tags`, `deck_tag_assignments` and `content_resource_tag_assignments` are not referenced by any registry column, constraint, index, trigger, or function.

Validator `public.arrival_codes_valid(text[], text[])`: `LANGUAGE sql IMMUTABLE`, `SET search_path = public`, owner `postgres`, body `_codes <@ _vocab AND coalesce(array_length(_codes,1),0) = count(DISTINCT c)`. This enforces both vocabulary containment and duplicate rejection, and rejects `''`, alias strings, free text, and case variants (`Anchor`, `SETTLE`) because containment is exact-text.

## 4. Suspension is distinct from `active`

- `active boolean NOT NULL DEFAULT true` is untouched by Slice 1 and retains its sole meaning: Arrival approval/enabled state.
- Suspension lives entirely in `suspended_at` / `suspension_reason` / `suspended_by`. No constraint, trigger, or default couples either direction, so all four combinations are representable: `active=true` unsuspended, `active=false` unsuspended, `active=true` suspended, `active=false` suspended.
- Invariants proven by the CK above: suspended requires a reason non-empty after `btrim`; unsuspended requires `suspension_reason IS NULL`; a suspension timestamp is always present whenever a reason is present.
- `arrival_admin_unsuspend_resource` clears `suspended_at`, `suspension_reason` and `suspended_by` in one statement, so clearing cannot leave a stale reason, timestamp, or provenance.
- `arrival_admin_suspend_resource` rejects a blank reason before writing (`RAISE EXCEPTION 'suspension reason is required'`) and records `suspended_by = assert_caller_is_admin()`.

## 5. Controlled administrative write pathway

```text
arrival_admin_suspend_resource(_registry_id uuid, _reason text)  -- plpgsql, SECURITY DEFINER, owner postgres, search_path=public
arrival_admin_unsuspend_resource(_registry_id uuid)              -- plpgsql, SECURITY DEFINER, owner postgres, search_path=public
assert_caller_is_admin()                                         -- STABLE SECURITY DEFINER, search_path=public,
                                                                 -- raises 42501 unless has_role(auth.uid(),'admin')
```

Function ACLs, live `proacl`:

```text
arrival_admin_suspend_resource    {postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}
arrival_admin_unsuspend_resource  {postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}
assert_caller_is_admin            {postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}
arrival_codes_valid               {=X/postgres, postgres=X, anon=X, authenticated=X, service_role=X}
arrival_registry_lock_source      {postgres=X/postgres, service_role=X/postgres}
arrival_touch_updated_at          {postgres=X/postgres, service_role=X/postgres}
```

`anon` and `PUBLIC` have no EXECUTE on either admin RPC. `authenticated` may call them, but the first statement is `assert_caller_is_admin()`, so an ordinary member is rejected with `42501 Admin privileges required` before any write occurs. `arrival_codes_valid` is executable by `anon`/PUBLIC; it is a pure, side-effect-free array validator that reads no tables and exposes no write path.

## 6. Effective RLS, table privilege, ownership

```text
public.arrival_resource_registry — owner postgres, relrowsecurity=true, relforcerowsecurity=true
policies on arrival_resource_registry: NONE
role_table_grants for arrival_resource_registry: NO ROWS (no anon, no authenticated, no PUBLIC, no service_role entry)
```

RLS is enabled **and forced**, with zero policies, so even the table owner is subject to policy evaluation and every non-superuser path denies. Combined with zero table-level grants, `anon`, `authenticated`, `PUBLIC` and ordinary members cannot `SELECT`, `INSERT`, `UPDATE` or `DELETE` the registry through the Data API. All Slice 1 writes must route through the `SECURITY DEFINER` admin RPCs or a superuser/owner migration path. Both trigger functions and both admin RPCs carry an explicit fixed `search_path`.

Note: the migration's `GRANT ALL ... TO service_role` is not reflected in `role_table_grants`, so the effective posture is stricter than the migration text implies — this must be re-verified before any Edge Function is written against this table.

## 7. Preservation of pre-existing registry integrity

All B1/B1.1 objects are intact and unweakened:

- Exclusive arc: `CHECK (num_nonnulls(content_resource_id, healing_resource_id, course_id, lesson_id) = 1)`
- Four FKs, all `ON DELETE RESTRICT`, to `content_resources`, `healing_resources`, `courses`, `lessons`
- Four partial unique indexes: `..._content_uk`, `..._healing_uk`, `..._course_uk`, `..._lesson_uk`
- `arrival_resource_registry_pkey` on `id`
- `arrival_resource_registry_lock` BEFORE UPDATE → `arrival_registry_lock_source()`, still raising `arrival_resource_registry source identity is immutable` on any change to the four source columns
- `arrival_resource_registry_touch` BEFORE UPDATE → `arrival_touch_updated_at()`
- `active` semantics, type, nullability and default unchanged

The only new FK is `suspended_by → auth.users(id) ON DELETE SET NULL`, which cannot block account deletion.

Current contents: `0` rows total, `0` suspended, `0` with bridge codes, `0` inactive — Slice 1 introduced no seed data.

## 8. Fixtures — designed, not executed (blocker 1)

Every fixture in the mandated battery is a mutation (insert a registry row, attempt member/anon writes, exercise constraint rejections, then roll back). This task is scoped to Plan mode, which prohibits state-changing execution, so the battery is specified here and awaits approval to run. Cleanup counts cannot be reported until then.

Execution shape once approved: one transaction per case wrapped in `BEGIN … ROLLBACK`, plus PostgREST calls under a fixture member JWT and an anon key for the two rejection cases; residue assertion is `SELECT count(*) FROM arrival_resource_registry` returning `0` plus a catalog diff showing no new objects, roles, or settings.

| # | Case | Expected outcome |
| --- | --- | --- |
| 1 | Owner-level insert of a fully valid arc row with valid duration, modality, intensity, stage, bridge codes | accepted inside transaction, then rolled back |
| 2 | `authenticated` member `INSERT`/`UPDATE`/`DELETE` via Data API | permission denied on all three |
| 3 | Same three under anon key | permission denied |
| 4 | Member calls `arrival_admin_suspend_resource` | `42501 Admin privileges required` |
| 5 | `active=false`, `suspended_at IS NULL` | accepted (independence) |
| 6 | `active=true`, suspended with valid reason | accepted (independence) |
| 7 | `suspended_at` set with reason `NULL` / `''` / `'   '` | `arrival_registry_suspension_reason_ck` violation ×3 |
| 8 | Reason set, `suspended_at NULL` | same CK violation |
| 9 | Unsuspend RPC on a suspended row | all three suspension fields NULL, no stale residue |
| 10 | `duration_minutes` = 1, 45, NULL | accepted |
| 11 | `duration_minutes` = 0, -5 | `arrival_registry_duration_ck` violation |
| 12 | `modality_codes` = each of the 6 valid codes, a valid multi-value array, and `{}` | accepted |
| 13 | `modality_codes` = `{yoga}`, `{Meditation}`, `{''}`, `{ritual,ritual}` | `arrival_registry_modality_vocab_ck` violation ×4 |
| 14 | `intensity_level` = 1, 2, 3, NULL | accepted |
| 15 | `intensity_level` = 0, 4 | `arrival_registry_intensity_ck` violation |
| 16 | `sequence_stage` = 1, 2, 3, NULL | accepted |
| 17 | `sequence_stage` = 0, 4 (and 5-7, see blocker 2) | `arrival_registry_sequence_ck` violation |
| 18 | `bridge_codes` = each of the 21 locked codes individually, then all 21 as one array | 22 accepted writes |
| 19 | `bridge_codes` = `{grounding}` (invalid), `{ground}` (alias), `{"take a breath"}` (free text), `{''}` (empty), `{anchor,anchor}` (duplicate), `{Anchor}` and `{SETTLE}` (case variants) | `arrival_registry_bridge_vocab_ck` violation ×7 |
| 20 | Insert a Search tag row, confirm no registry column, constraint, or trigger reads it | no coupling; already proven statically in section 3 |
| 21 | `UPDATE` any of the four source-identity columns | `arrival_resource_registry source identity is immutable` |
| 22 | Insert a second registry row for the same source id | partial unique index violation |
| 23 | Residue check after all rollbacks | `0` rows, `0` new objects, `0` new roles or settings |

## 9. Remaining defects and blockers

1. **Fixtures unexecuted.** The battery in section 8 requires mutation and rollback; Plan mode prohibits it. Approve execution as a separate verification task to convert this verdict to `PASS`.
2. **Sequence-stage cardinality mismatch.** The live constraint admits `1..3` (regulate → stabilise → deepen), which is what the approved Slice 1 contract specified, but this task's fixture list asks for "all seven sequence stages". Either the three-stage domain is confirmed correct and fixture 17 reduces to `0`/`4` rejections, or the locked seven-stage vocabulary must be supplied and the CHECK widened in a follow-up migration. No change made.
3. **Suspension provenance is not constraint-enforced.** `suspended_by` has no CHECK requiring non-NULL when `suspended_at` is set. The admin RPC always sets it, so member-facing paths are safe, but an owner-level or migration write could record a suspension with no actor. A follow-up CHECK (`suspended_at IS NULL OR suspended_by IS NOT NULL`) would close this; not applied here.
4. **Informational.** `GRANT ALL ... TO service_role` from the migration is not visible in `role_table_grants`; any future Edge Function writing this table must have its privileges re-verified rather than assumed.

## 10. No-mutation confirmation

No migrations were created, edited, applied, or rolled back. No database object, row, grant, policy, role, setting, RPC, route, hook, type, test, build, or deployment was created, changed, or deleted. No B2, B4, B5, or further B3 slice work was begun. The only file written is this report.