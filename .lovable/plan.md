# Living Pattern — read-only impact assessment (no code changed)

One guided **Pattern Record** (Pause → Perceive → Practise, all required) with a **Return** added later, replacing the three separate optional logs.

## 1. What exists today

### /temple — the Home card
`src/components/temple/LivingPatternCard.tsx`. One section, "Your Living Pattern Lab", plus three image panels that each present a *separate* log with its own button:
- States of Being → PAUSE → "Log a State of Being" → `/living-pattern?lens=pause`
- Moments of Meaning → PERCEIVE → "Log a Moment of Meaning" → `?lens=perceive`
- Patterns of Choosing → PRACTICE → "Log a Pattern of Choosing" → `?lens=practice`

Also links to `/living-pattern/orientation` and the Becoming course. This three-panel structure is exactly the model being superseded.

### /living-pattern — the logging surface
`src/pages/LivingPatternLenses.tsx` holds a banner and a three-tab bar (Pause / Perceive / Practice) that mounts three independent page components. Its intro says outright: "These are not steps you must complete in sequence; choose to log whatever is true in the moment."
- `LivingPatternPause.tsx` — steps Register / Receive / Reorient. Every field is labelled "(optional)". Save is enabled if **any one** field has content ("Add a word or a note anywhere in this Pause and it can be saved"). Writes a `living_states` row.
- `LivingPatternPresence.tsx` — Register / Recognise / Recalibrate, optional label, optional links to a State or Pattern, optional Temple-support tag. Writes `temple_moments` + `temple_moment_movements`.
- `LivingPatternPractice.tsx` — a named Pattern with commitment, a "When… I will…" rehearsal, plus evidence entries. Writes `living_patterns` / `living_pattern_evidence`.

All three can also spin off an experiment (`living_experiments`) with a chosen "Guide".

Secondary routes that also open pieces of this model: `/living-pattern/moments`, `/moments/:id`, `/patterns`, `/patterns/:id`, `/experiments`, `/experiments/:id`, `/orientation`, plus redirects `/pause`, `/presence`, `/perceive`, `/practice` (`src/App.tsx:150-162`).

### /living-pattern/record — My Living Pattern
`src/pages/LivingPatternRecord.tsx` composes: Living Thread (chronological, keyset "go back further"), `ActivePatternsPanel`, `ThemesPanel`, experiments list, Field Notes shown as thread entries, and `InvitationsPanel`.

### Data and privacy
14 private tables: `living_states`, `temple_moments`, `temple_moment_movements`, `living_patterns`, `living_pattern_evidence`, `living_experiments`, `living_field_notes`, `living_record_links`, `living_resource_tags`, `living_themes`, `living_theme_attachments`, `living_invitation_hides`, `living_media_attachments`, `living_media_deletions`.

All have RLS **enabled and forced**, and none grant anything to `anon` or `authenticated` — so the ~60 owner-scoped `living_*` security-definer functions are the only door. Admins have no general read access. This protection model is sound and should be carried forward unchanged.

### How much real member data exists
- `living_experiments`: **9 rows, 1 account**
- `living_field_notes`: **19 rows** (all attached to those experiments)
- `living_states`, `temple_moments`, `living_patterns`, `living_pattern_evidence`, `living_themes`, `living_theme_attachments`, `living_record_links`, `living_resource_tags`, `living_media_attachments`: **0 rows**

So there is almost nothing to migrate, and no member other than the one testing account has recorded anything.

### Two things you should decide on before we build
1. **Every Living Pattern page is currently admin-only.** All ten pages gate on `hasFullTempleAccess && isAdmin`, and the profile menu link does too. No paying member can reach any of this today. Earlier we opened the Field Notes footer to all entitled members, but these routes were left behind the staging gate.
2. Field Notes also appear on lesson and protocol-step surfaces (`ReflectionFooter.tsx`, `ResourceFieldNotes.tsx`, `EarlierJournalNotes.tsx`, `FieldNoteMedia.tsx`) with audio/photo attachments. Those are reachable by entitled members and are **not** part of the new Pattern Record flow. They need a decision: keep as a separate practice, or fold into Return.

## 2. Changes needed to move to one Pattern Record

- One record replaces three: one row per Pattern Record holding all of Pause, Perceive, Practise; Return stored as a later, separate completion on that same record.
- Required-before-save replaces save-anything: all nine initial questions must be answered, with "I'm not sure yet" as a real completed answer, not a skip.
- One question per screen replaces long forms with all fields visible, with Back/Continue and a plain "step 3 of 9" style indicator — no score, streak or percentage.
- Copy that invites choosing between three logs is removed from the Home card, the tab bar, the orientation page and the profile menu.
- `/living-pattern` keeps its route but becomes the single guided flow; the three lens tabs go. Old lens URLs and the moments/patterns routes redirect into `/living-pattern/record` rather than 404.
- Australian spelling "Practise" throughout the member-facing labels.

## 3. Migration strategy — preserve, never rewrite

Additive only. Nothing is deleted, renamed, or reinterpreted.

1. Add new tables alongside the old ones. Not one existing row is altered.
2. The 9 experiments and 19 field notes stay exactly where they are, readable through their existing screens. They are shown in the Living Thread under a quiet "Earlier records" heading so their meaning is never restated as something they were not.
3. No backfill invents Pause/Perceive/Practise answers from old data — that would silently put words in her mouth. Old records remain old records.
4. Old tables keep forced RLS and zero direct grants. No new read path, no admin visibility.
5. The delete-account path must be extended to the new tables in the same slice that creates them.

## 4. Proposed canonical schema

`pattern_records` — one row per record, owner-only:
- identity: `id`, `user_id`, `occurred_at`, `schema_version`, `content_revision`, `created_at`, `updated_at`
- Pause: `moment_text` (free), `state_words` (controlled list + her own words), `body_text` (free) with `body_cues` (controlled), `capacity` (controlled: very little / some, carefully / ordinary / more than usual)
- Perceive: `meaning_text`, `prediction_text` (free); `familiarity` (controlled: very / a little / new / not sure yet); `protection_text` (free, required only when familiar)
- Practise: `action_text`, `identity_text` (free); `continue_identity` (controlled: yes / not this time / not sure yet); `experiment_text` (free)
- completion: `initial_completed_at` (set only when all nine are answered)

`pattern_returns` — later evidence, one or more per record:
- `record_id`, `tried_text`, `happened_text`, `noticed_text`, `prediction_outcome` (controlled: came true / partly / not as expected / not sure yet), `support_text`, `carry_forward_text`, `recorded_at`

Every free-text field accepts the literal "I'm not sure yet" as a valid answer. Controlled fields are stored as codes so Common Themes can count them deterministically; free text is never parsed for meaning.

Access: forced RLS, no grants to `anon`/`authenticated`, all reads and writes through new owner-scoped security-definer functions that derive `user_id` from the session — never from the request body. Versioned via `schema_version`, edited with optimistic `content_revision` checks, matching the existing pattern.

## 5. Mobile-first flow

One question per screen, warm light surface, dark ink, generous space. Small movement label (PAUSE / PERCEIVE / PRACTISE), one large question, one or two helper lines, the input, then Back and Continue. Answers are held in the browser as she moves, and only written when she saves — so a half-finished record never lands in her private record. Continue stays disabled until the current question is answered. Screen 5 reveals the protection question only when she says the moment feels familiar. Save button: "Save this Pattern Record"; confirmation: "This record is yours. You can return when life has had time to answer back."

Return opens later from the saved record as an invitation, never a task, badge or overdue flag. Final button: "Add this to my evidence".

## 6. My Living Pattern (/living-pattern/record)

Four views, same route:
1. **Living Thread** — Pattern Records newest first, each showing the moment in her own words, and its Returns beneath. Older experiments and field notes appear below under "Earlier records".
2. **Common Themes** — counts only, computed live from her own rows: most-used state words, body cues, capacity levels, familiarity answers, prediction outcomes, and repeated phrases she herself typed identically. Every count opens the exact records behind it. No scoring, no clustering by inference, no hidden model.
3. **Experiments awaiting Return** — records saved more than a few days ago with no Return yet, phrased as an invitation.
4. **Evidence-grounded invitations** — deterministic and always traceable, e.g. "You have recorded 'I am too much' in five moments this month", each linking to those five records, phrased as a question, never a conclusion.

No AI interpretation, no Arrival or AreekeerA® Guide connection, no efficacy claims about Temple support.

## 7. Slices and how each is verified

1. **Schema + owner-only functions.** Verify: new tables reject direct reads; a second signed-in account cannot see the first's record; admin sees nothing; account deletion removes the new rows.
2. **Guided flow on /living-pattern.** Verify: cannot save until all nine answered; "I'm not sure yet" counts as answered; Back preserves answers; nothing is written before Save; the protection question appears only when familiar.
3. **Return on a saved record.** Verify: saving works without a Return; Return can be added later; nothing reads as overdue.
4. **My Living Pattern rebuilt.** Verify: new records and Returns appear; the 9 old experiments and 19 field notes still open unchanged; every theme count opens its underlying records.
5. **Home card + copy + redirects.** Verify: one clear invitation, no three-log choice, old lens URLs land somewhere sensible, no other Home card touched.
6. **Access decision applied** (pending your answer on the admin gate). Verify: intended members in, everyone else out.

## 8. Supersedes / preserves / needs your decision

**Supersedes:** three separate record types as the member-facing model; "log whatever has energy"; save-one-true-line; optional fields; the Pause Register/Receive/Reorient and Moment Register/Recognise/Recalibrate wordings; the three-panel Home card; separate lens tabs and moment/pattern routes; "Practice" spelling in member labels.

**Preserves:** the `/living-pattern`, `/living-pattern/record` and `/temple` routes; forced RLS with no direct table grants; owner-derived writes; no admin read access; no Arrival or Guide connection; no generative interpretation; revision-checked edits; existing experiment and field-note data; the calm, non-scoring tone.

**Needs a decision from you:**
1. Admin-only staging gate — open all Living Pattern routes to entitled members now, or keep staging until the rebuild lands?
2. Field Notes on lesson and protocol pages (with audio/photo) — keep as a separate practice, or fold into Return?
3. The 9 experiments and 19 field notes belong to one test account — preserve as "Earlier records", or clear that test data first?
4. Themes, record-links and resource-tags exist but are unused (0 rows) — retire them, or carry them into the new model?
5. Can a member edit a saved Pattern Record's initial answers, or only add Returns?
6. Should the Becoming course and orientation page copy be rewritten in the same release, since both teach the superseded model?
