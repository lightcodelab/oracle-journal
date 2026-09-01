# LP-G.0 — Becoming course foundation and teaching architecture

Read-only discovery and course plan. Nothing was built, migrated, published, or altered. The only tool use was reading files and read-only database queries.

## 1. Repository state

- HEAD: `e4a36a0b7f2783c7682933b5ca57851361821353` — "Removed test account"
- Working tree: clean (no modified, staged, or untracked files)
- Binding document read: `Temple-Living-Pattern-Feature-Plan-v2.md` (most recent uploaded revision, 28 Aug). Its roadmap lists **LP-G — Becoming course: the four deepening movements and eight-step teaching framework** as later product work requiring separate course planning and content approval, and states plainly that the deeper teaching belongs in a separate Becoming course, **not** inside the everyday logging flow.

## 2. Existing course architecture (what actually runs)

**Live model — flat and simple:**

- `courses` (11 rows) → `lessons` (151 rows). Modules are not a table: `lessons.module_title` + `lessons.module_order` group lessons client-side.
- Companions: `lesson_audio_files` (multi-track audio), `lesson_journal_entries` (per-member notes **and** `completed_at`), `course_transformation_tools` (optional tracking-tool links), `lessons.downloadable_files` (attachments JSON), `lessons.body_richtext` (TipTap JSON), `lessons.main_media_kind` / `main_media_embed_url` / `main_media_file_url` (video), `lessons.form_questions` (lesson prompts).
- Courses are filed under a Location (`content_categories` where `type = 'location'`). Relevant existing locations: `The Alchemy of Becoming` (`loc-remembrance-courses`), `The Rites of Remembrance`, `Deepening Courses`, plus the Devotion practice locations.

**Routes:** `/courses` (all courses), `/devotion/course/:courseId`, `/remembrance/course/:courseId` and `/remembrance/courses/:slug` (both render `DevotionCoursePage`), `/devotion/course/:courseId/lesson/:lessonId` (`DevotionLessonPage`), `/admin/courses` (`CourseAdmin`). Breadcrumb/Door framing is derived from the course's Location name in `DevotionCoursePage.tsx`.

**Key files:** `src/pages/DevotionCoursePage.tsx`, `src/pages/DevotionLessonPage.tsx`, `src/components/CourseSessionNav.tsx`, `src/components/admin/CourseForm.tsx`, `src/components/admin/CourseLessonEditor.tsx`, `src/pages/CourseAdmin.tsx`, `src/pages/AllCourses.tsx` + `src/hooks/useAllCourses.ts`.

**Confirmed unused parallel system:** the CMS course hierarchy (`content_courses`, `content_modules`, `content_lessons`, `content_lesson_attachments`) has **0 rows** and no display route. Becoming must use the live `courses`/`lessons` model, not this one.

**Access:** `lessons` SELECT is gated by `can_view_lesson_by_door(auth.uid(), course_id)` on published courses; `lesson_audio_files` by the same plus `has_full_temple_access`. Admins manage everything via `has_role(..., 'admin')` and can see unpublished courses. `lesson_journal_entries` is owner-only (`auth.uid() = user_id`) — no admin read path.

## 3. Reusable vs missing

**Reusable unchanged:** eight-lesson sequencing, module grouping into the four movements, rich text, video, multi-track audio, downloadable attachments, lesson prompts, per-lesson private notes, admin authoring, Location filing, breadcrumbs, mobile session nav, admin-only staging (leave `is_published = false`; admins still see it).

**Missing / must be added at presentation level only:**

1. A non-coercive progress presentation for this one course (see §4).
2. A "Return to this whenever you like" landing frame instead of a start-to-finish course frame.
3. Optional, explicit bridges from a lesson to Practice / Presence / Field Notes that navigate only and create nothing.

No new table, column, RPC, policy, or grant is required.

## 4. Mechanisms that would make Becoming feel coercive

| Mechanism | Where | Verdict |
|---|---|---|
| "N of M complete" + percentage + filling progress bar | `CourseSessionNav.tsx` (progress header) | Must not appear on Becoming. Reframe as a quiet "You have opened these" marker, or omit entirely. |
| "Mark complete" button language | `DevotionLessonPage.tsx` lesson footer | Reframe for Becoming as an optional, reversible "I have sat with this" bookmark, or omit. |
| Lesson numbering read as a mandatory order | lesson number chips in session nav | Keep numbers for orientation, add explicit "you can read these in any order" framing. |
| Course-attached tracking tools implying a required workflow | `course_transformation_tools` | Do not attach tools to Becoming; use explicit optional links instead. |

**Already safe — nothing to fix:** no sequential locking (every lesson is clickable regardless of prior completion), no streaks, no scores, no badges, no deadlines, no reminders, no auto-created record on opening a lesson (rows are written only on explicit member action), no AI or inference anywhere in the course path.

## 5. Recommended member experience

- Becoming is a **teaching companion**, not a program. The landing page opens with the governing promise and an explicit statement that there is no order to keep, nothing to finish, and nothing being measured.
- Every lesson is always open; revisiting is the expected behaviour, not a failure.
- No streaks, scores, deadlines, percentages, or compulsory completion. Optional per-lesson bookmarking only, reversible at any time.
- No diagnosis, no AI interpretation, no inferred identity, no categorising the member.
- Each lesson may end with an **optional** bridge — a plain link to Practice, Presence, or Field Notes that navigates only. Following it creates no record; the member still has to write and save.
- Reflection prompts inside Becoming stay teaching prompts. They do not silently become Living Pattern records.
- **No Arrival route, data, prefill, recommendation, or shared path.**

## 6. Proposed information architecture

**Title:** Becoming
**Subtitle:** The deeper teaching behind your Patterns of Choosing
**Location:** `The Alchemy of Becoming` (`loc-remembrance-courses`), reached from the Door of Remembrance and from `/courses`.

| # | Movement | Lesson | Purpose | Format | Optional bridge |
|---|---|---|---|---|---|
| 1 | Recognise | The Invitation | Notice what is asking for your attention, without turning it into a problem to solve. | Text + audio | Presence — register a Moment |
| 2 | Recognise | Deeper Meaning | Separate what happened from the meaning you gave it. | Text + audio | Presence |
| 3 | Reconcile | Reality As It Is | Hold what is true without self-punishment. | Text + audio | — |
| 4 | Reconcile | The Existing Contract | See the identity agreement already running your choices. | Text + optional video | Practice — name a Pattern |
| 5 | Resolve | The Choice | Choose consciously, including its cost, grief, and support. | Text + audio | Practice |
| 6 | Resolve | The Practice | Turn a choice into one small observable action: when [cue], I will [action]. | Text + worked examples | Field Notes — start an Experiment |
| 7 | Reinforce | Evidence | Learn from what actually happened, not from whether you complied. | Text + audio | Field Notes — Notice / Return |
| 8 | Reinforce | Re-choosing | Return, revise, and re-choose without needing certainty. | Text + closing audio | Practice |

**Explicitly out of scope for LP-G:** any Arrival coupling; AI interpretation or generated reflections; scoring, streaks, or completion requirements; automatic record creation; changes to the Living Pattern schema, RLS, RPCs, media policy, Journal, or the admin-only staging gate; any new table or column; sharing, cohorts, or comments; certificates.

## 7. Can the platform support this unchanged?

**Yes for data and access — no schema, policy, grant, or RPC change is needed.** Becoming is eight `lessons` rows under one `courses` row filed to an existing Location, staged unpublished for admin-only review, and published when content is approved.

**One minimum additive change, presentation-only:** the course/lesson shell currently always shows the "N of M complete / %" progress header and a "mark complete" action. For Becoming these must be replaced with non-measuring language. Recommended approach: a presentation-only "gentle course" prop on `CourseSessionNav` and the lesson footer, switched on for this course's identifier — no migration, no behaviour change for any existing course. If the setting should later be authorable per course, that becomes one additive nullable column on `courses`, deferred until asked for.

## 8. Recommended slices

- **LP-G.1 — Gentle course presentation (frontend only).** Add the non-measuring progress/completion variant and the "read in any order, nothing is being measured" landing frame, active for Becoming only. Verify existing courses are byte-identical in behaviour at 375 / 820 / 1440.
- **LP-G.2 — Course shell and staging.** Create the Becoming course record and eight empty lessons in the four movements, unpublished. Verify admin-only visibility, breadcrumbs, sequencing, and that no member surface exposes it.
- **LP-G.3 — Teaching content.** Author the eight lessons (text, audio, attachments) against approved copy.
- **LP-G.4 — Optional bridges.** Add the navigate-only links to Practice / Presence / Field Notes, and prove clicking a bridge creates zero rows.
- **LP-G.5 — Release verification and publish.** Full-access, non-member, anonymous, and admin behaviour; owner-only note isolation; responsive checks; Journal, Living Pattern, media, and Arrival separation proofs; fixture teardown with exact baseline counts.

Each slice is independently verifiable and independently revertible.

## 9. Access and privacy implications

Becoming introduces no new private data class. Lesson notes stay in `lesson_journal_entries`, owner-only, with no admin read path. Access stays governed by the published-course check plus `can_view_lesson_by_door` / `has_full_temple_access`. The Living Pattern's forced-RLS tables and SECURITY DEFINER RPCs are untouched: a bridge is a link, never a write.

## 10. Proof of no Arrival coupling

- No `courses`, `lessons`, `lesson_journal_entries`, `lesson_audio_files`, or `course_transformation_tools` column, foreign key, or policy references any `arrival_*` object.
- No course or lesson page, hook, or admin editor imports, queries, or calls any `arrival_*` table or RPC.
- The recommendation engine and `arrival_*` schema are reachable only from Arrival's own surfaces; the proposed Becoming design adds no route, prefill, input, or shared identifier to them.

## 11. Verdict

**READY TO PLAN.** The existing course platform supports an eight-part Becoming course with no database change; the only work is presentation-level de-measuring plus content authoring. Stopping here — no course has been built.
