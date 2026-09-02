# TL-2A — Field Notes replacement inventory and implementation plan

Read-only discovery. No source, schema, RPC, RLS, grant, storage, route, content, Journal or gate change was made.

## 1. Repository state

- HEAD: `68dfc73588b4d1f695c0acc333297ea68b32fcc9` ("Used card grey for active tab")
- Working tree: clean (no modified or untracked files)
- Binding document read: `Temple-Living-Pattern-Feature-Plan.md` (Arrival = navigation-only handoff; no shared data)

## 2. Full reflection inventory

| Surface | Route | Component | Table | Current behaviour |
|---|---|---|---|---|
| Resource detail | `/devotion/resources/:slug`, `/remembrance/resources/:slug` | `DevotionResourcePage.tsx:885` | Field Notes RPCs / `journal_entries` | `ReflectionFooter` — Field Notes in admin staging, else Journal |
| Card detail | card open surfaces | `CardDetail.tsx:348` | as above | `ReflectionFooter`, family `card` |
| Card quick preview | dialog | `CardDetailDialog.tsx` | — | No reflection surface (lightweight preview) |
| Course landing/detail | `/devotion/course/:courseId`, `/remembrance/course/:courseId` (+ slug variants) | `DevotionCoursePage.tsx:327` | `journal_entries` | Raw `ContextualJournal`, `context_type="course"` — no Field Notes path |
| Lesson page (A) | `/devotion/course/:courseId/lesson/:lessonId` | `DevotionLessonPage.tsx:695` | `lesson_journal_entries` **and** a copied row into `journal_entries` (`handleSubmitPrompts`) | Author-written "Journal Prompts" form + "Submit to My Journal" |
| Lesson page (B) | same route | `DevotionLessonPage.tsx:739` | `journal_entries` | Second, independent `ContextualJournal` ("Digital Journal"), `context_type="lesson"` |
| Lesson completion | same route | `DevotionLessonPage.tsx:81-96` | `lesson_journal_entries.completed_at` | Explicit "Completed" button; course progress aggregation reads it |
| Protocol landing | `/devotion/protocols` | `MyProtocols.tsx` | — | List only, no reflection |
| Protocol step | `/devotion/protocols/:protocolId` | `ProtocolDetailPage.tsx:579` | `journal_entries` | `ContextualJournal`, `context_type="protocol_step"`, `contextId = step.id` |
| Guided tools | `/tools`, `/tools/:slug/new`, `/tracking` | `Tools`, `ToolReflection`, `MyTracking` | `transformation_entries` | Structured field/score instruments — separate system |
| Legacy archive | `/journal` | `Journal.tsx` | `journal_entries` | Full owner-only archive, search, tags, soft delete |
| Course/module lists | `/courses`, `/remembrance/companion-courses`, `/devotion/section/...` | listing pages | — | No reflection. **Modules have no own member-facing surface** (`lessons.module_title` only), so there is nothing to convert |

Confirmed: `ResourceFieldNotes` never writes to `journal_entries`, `lesson_journal_entries` or `transformation_entries`; it only reads `journal_entries` for the read-only "Earlier Journal Notes" block.

## 3. Disposition per surface, source identity and copy

| Surface | Disposition | Source identity | Family supported today? | Member copy |
|---|---|---|---|---|
| Course landing/detail | Field Notes composer + read-only Earlier Journal Notes | `course` = `courses.id` | Yes | "Make this course a small experiment" / "Add this course as support in an experiment I already have" |
| Lesson page — Digital Journal | Replace with Field Notes composer + read-only Earlier Journal Notes | `lesson` = `lessons.id` | Yes | "Make this a small experiment" / "Add this session as support in an experiment I already have" |
| Lesson page — Journal Prompts | Deliberately separate: an author-written teaching instrument, not free reflection. Keep in `lesson_journal_entries`. **Decision required:** stop the duplicate copy into `journal_entries` for new submissions | n/a | n/a | unchanged |
| Lesson completion button | Neither. Stays exactly as is; must never create a Field Note or resource tag | n/a | n/a | unchanged |
| Protocol step | Field Notes anchored to the step's linked **healing resource** (`areekeera_protocol_steps.resource_id`) + read-only Earlier Journal Notes keyed to the step. When a step has no linked resource: history only, no composer | `healing_resource` = `healing_resources.id` | Yes | "Make this practice a small experiment" / "Add this practice as support in an experiment I already have" |
| Protocol landing | Neither (list) | — | — | — |
| `/tools`, `/tracking` | Deliberately separate reflection experience — typed fields and scored series, a different contract from Try → Notice → Return | — | — | unchanged |
| `/journal` | Preserved unchanged as the legacy archive and the single read path for history | — | — | unchanged |
| `CardDetailDialog` | Neither; preview only, full card detail already carries Field Notes | — | — | — |

Every new surface reuses the existing verbatim privacy line: "Private to you. Nothing here is shared, analysed, or visible to Temple administrators."

## 4. Data-model support: existing vs missing

Already supported by `living_resource_tags` + `living_resource_visible_title` (server-derived title, entitlement proved, publication proved):

| Family | Title source | Publication gate | Entitlement gate |
|---|---|---|---|
| `content_resource` | `content_resources.title` | `status='published'` | `has_full_temple_access` |
| `healing_resource` | `healing_resources.title` | `status='published'` | `has_full_temple_access` |
| `course` | `courses.title` | `is_published` | `can_view_lesson_by_door` |
| `lesson` | `lessons.title` via parent course | parent `is_published` | `can_view_lesson_by_door` |
| `card` | `decks.name || ': ' || cards.card_title` | none | `can_view_card` |

**Nothing is missing for the recommended plan.** Course and lesson origins are fully supported; protocol steps are covered through the already-supported `healing_resource` family.

`protocol` / `protocol_step` are deliberately **not** recommended as new families, because:

- `areekeera_protocols` has no `status`/`is_published` column and no owning `user_id`, so publication cannot be proved;
- its only ownership path is `recommendation_id → recommendation_events`, i.e. the recommendation engine — wiring Field Notes to it would create exactly the cross-feature data path the binding plan forbids;
- `areekeera_protocol_steps` has no `title` column, so any snapshot would fall back to `notes` (member-visible free text) or the linked resource title anyway.

If the owner later insists on a first-class protocol origin, the smallest secure additive change would be: add a real publication flag plus an owner column (or an owner-proving security-definer helper that does not read `recommendation_events`), then extend `living_tags_family_chk` and the three whitelists and add `CASE WHEN 'protocol'` branches to `living_resource_visible_title`. That is a schema decision, not part of TL-2.

Also observed, worth a separate one-line fix later: `living_resource_title` (unused by write paths) has no `'card'` branch, unlike its entitlement-checking twin.

## 5. Migration / RPC / policy / storage implications

**None required** for the recommended slices. TL-2B/2C/2D are frontend-only: they route existing pages through `ReflectionFooter` with already-whitelisted families. No new table, column, constraint, RPC, policy, grant, bucket or object path.

## 6. Security and privacy findings

- Every title snapshot is server-derived inside `SECURITY DEFINER` functions after publication and entitlement are proved; the client supplies only family + id.
- No client-supplied title, owner id, status, availability, timestamp, completion state or derived psychological field on any existing or proposed path.
- `living_experiments`, `living_field_notes`, `living_resource_tags`: RLS enabled **and forced**, single owner-only `SELECT` policy each, no INSERT/UPDATE/DELETE policy, no admin or `service_role` policy. `living_media_attachments`: RLS forced with zero policies — reachable only through definer functions. No admin read path exists anywhere in these four tables.
- No automatic Field Note or resource tag is created by page view, lesson completion, course completion, protocol progress or resource use; every write in the plan is behind an explicit member button.
- No export, sharing, public media URL or AI analysis is introduced.

## 7. Legacy Journal preservation plan

- `journal_entries`, `lesson_journal_entries` and `transformation_entries` rows are never deleted, migrated, merged, relabelled or exposed to administrators.
- History appears only inside a collapsed, read-only "Earlier Journal Notes (n)" block, keyed to the same `context_type`/`context_id` pair the surface used before, with the existing line "Notes you wrote here before. They are unchanged and remain in My Journal." and a link to `/journal`.
- `/journal` stays the one place history is editable, so no surface becomes a second editable journal.
- Recommended refactor inside TL-2B: extract that block from `ResourceFieldNotes` into a shared read-only `EarlierJournalNotes` component so no new surface can accidentally re-introduce a writer.

## 8. Arrival isolation proof

- No Arrival route, link, prefill, join, recommendation or shared signal exists in `ReflectionFooter`, `ResourceFieldNotes`, `useLivingExperiments` or any `living_*` function body.
- The only place a protocol touches Arrival-adjacent data is `areekeera_protocols.recommendation_id → recommendation_events`; the plan explicitly declines to read it, which is why protocol steps anchor to `healing_resource` instead.
- No slice adds an `/arrival` route, import, query or write.

## 9. Recommended ordered slices (revised)

The proposed TL-2B/2C/2D shape holds, with one substantive revision: TL-2C is **not** a new protocol source family, it is an anchor-to-existing-healing-resource slice, so no migration is needed anywhere in TL-2.

- **TL-2B — course + lesson.** Extract `EarlierJournalNotes`; route `DevotionCoursePage` (`course`) and the lesson page's Digital Journal (`lesson`) through `ReflectionFooter`. Leave Journal Prompts and the Completed button untouched. Frontend only.
- **TL-2C — protocol step.** Route `ProtocolDetailPage` through `ReflectionFooter` anchored to the step's linked healing resource; history-only when a step has no linked resource. Frontend only.
- **TL-2D — sweep and legacy hygiene.** Resolve the Journal-Prompts duplication decision, confirm no `ContextualJournal` writer remains outside `/journal`, confirm `CardDetailDialog` stays preview-only, and verify the Earlier Journal Notes block renders on every converted surface.

Rollout gate is untouched: all three slices stay behind the existing `hasFullTempleAccess && isAdmin` staging gate in `ReflectionFooter`. Opening Field Notes to all full-access members is a separate, later decision.

## 10. Verdict

**DECISION REQUIRED** — two owner decisions before implementation:

1. Protocol steps: confirm anchoring to the step's linked healing resource (recommended, no migration, no recommendation-engine coupling) rather than a new `protocol_step` family.
2. Lesson Journal Prompts: confirm whether "Submit to My Journal" should stop writing a duplicate `journal_entries` row for new submissions while keeping answers in `lesson_journal_entries` and all existing rows intact.

With those two answers, TL-2B is READY TO IMPLEMENT as a frontend-only slice with no schema, RPC, policy or storage change.
