# Ritual Builder — Inspection Report and Plan

## What the inspection found

- **Spreads**: six spreads are defined in the app itself (Past, Present, Future; Daily Guidance; Mind, Body, Spirit; Situation, Challenge, Guidance; Shadow & Light; The Inner Compass). Cards are drawn at random from every published deck. The spreads page cannot yet be opened straight to a chosen spread.
- **Deck single-card draws**: the deck page can already open a chosen deck, or reopen a card drawn earlier. Saved single-card readings and saved spreads share the same reading storage.
- **My Readings**: a reading can only be opened by clicking it. There is no direct link to one reading yet.
- **Resources**: three kinds of item appear under All Resources: uploaded resources, AreekeerA® healing resources, and older courses. Courses are already marked as courses, so they can be left out by type rather than by where they appear. Draft items are hidden from members by the database, not just the screen.
- **Thumbnails**: resource, deck and spread thumbnails are each one large clickable area. The admin Edit button and Draft label sit in the top-right corner of resource thumbnails.
- **Journal**: entries are sorted by what they relate to (card, lesson, course). Ritual visits can be added as a new **Rituals** view without changing those.
- **Access**: every ritual page will need an active membership, using the same check as the rest of the app. Free accounts get the usual join screen.
- **Existing rituals**: nothing ritual-related exists yet, so nothing needs migrating.

## What I'll build

### My Rituals (new pages)
- **My Rituals** page with three groups: Daily, Weekly and Monthly. You can make as many rituals as you like in each, each with a name and an optional intention.
- **Ritual page**: edit the name, intention and group; add, reorder (move up/down) and remove steps. There are three step types:
  - **Card draw from one deck**: a fresh single card from that deck on each visit.
  - **Sacred Spread**: one of the existing spreads, drawn from every deck as it is today.
  - **Resource**: any published resource that isn't a course, audio or not.
  - Each step can have its own label and an optional journal prompt.
- **Begin visit**: saves a dated copy of the ritual as it is today. If a visit is unfinished, the button reads **Resume** instead. You can skip steps, write a short note on each step, add a closing reflection, leave partway and come back, and save whenever you like. No step has to be ticked off and no writing is required.
- **Inside a visit**, each step opens the existing experience, with a **Return to ritual** link back:
  - Deck step: opens the deck and draws one card. That card is stored with the visit, so coming back or reloading shows the same card.
  - Spread step: opens the spread directly. The reading is stored with the visit, so returning reopens the same reading and nothing is redrawn or regenerated.
  - Resource step: opens the resource page as it is today.
- **Visit history** on each ritual page, plus a **Rituals** view in the Journal listing all saved visits, with a filter for one ritual. These views read the same saved visit, so nothing is copied twice.
- There are no streaks, overdue warnings, reminders or required times.

### Add to Ritual
- A small round **+** in the top-right of each resource, deck and spread thumbnail, with an "Add to Ritual" tooltip and a large enough tap target. The Edit button and Draft label move beside it so nothing overlaps. The + is a separate control, so the rest of the thumbnail opens as it does now.
- There is also an **Add to Ritual** button on resource pages, deck pages and spread pages.
- Both open the same window, which is a pop-up on desktop and slides up from the bottom on phones:
  1. Shows the item's name and type.
  2. Lists your rituals by group, with **Create a Ritual** (name and group, then you're brought straight back).
  3. Lets you add an optional step label, which defaults to the item's name.
  4. Adds it with **Add to Ritual**, then confirms, for example "Added to Morning Ritual", with a **View Ritual** link, and you keep browsing where you were.
- Adding only saves the step. It never draws cards, plays anything, starts a visit or writes a journal entry. A quick double-tap won't add the step twice, but you can still add the same item twice on purpose.
- There's no + on courses, drafts or anything a member can't open. The database checks this too when the step is saved.

### Entry points
- A **My Rituals** card on THE TEMPLE home page, in the same style as the Sacred Spreads card.
- A **My Rituals** link on the Door of Devotion.

### Unavailable content
- If an item in a ritual is later unpublished or removed, that step is marked "no longer available". Its history and notes are kept, and you can choose a replacement. Nothing is ever swapped in automatically.

## Not in this version (needs your go-ahead separately)
- Fixed deck plus spread pairings (a spread drawn from one deck only). This is possible later: spreads currently draw from every published deck, so it means adding a deck choice to the spreads page. It's about half a day.
- Deleting or archiving rituals. For now you can remove steps, but whole rituals can't be deleted, so no history is lost.
- Reminders and notifications.
- Linking ritual visits into Living Pattern.
- Courses or lessons as steps.

## Technical details

New tables, all owner-only through row-level security (`auth.uid() = user_id`) and gated by `has_full_temple_access`, with grants to `authenticated` and `service_role`:
- `rituals` (id, user_id, name, intention, rhythm enum daily/weekly/monthly, timestamps)
- `ritual_steps` (ritual_id, position, kind enum deck/spread/resource, deck_id, spread_type, resource_source content/healing, resource_id, label, journal_prompt, client_request_id unique per ritual for idempotent adds)
- `ritual_visits` (ritual_id, user_id, status in_progress/saved, ritual snapshot jsonb, closing_reflection, started_at, saved_at), with a partial unique index on (ritual_id) where status = 'in_progress' to allow one unfinished visit per ritual
- `ritual_visit_steps` (visit_id, snapshot of step, position, note, marked_done, saved_reading_id, card_draw card_id/deck_id, reading_status pending/ready/failed, unique visit_id+position)

Server functions (security definer): `add_ritual_step` (validates eligibility: published, not `is_course`, not a legacy course, deck published and non-starter, spread id in the allowed list), `start_or_resume_ritual_visit` (race-safe through the unique index), and `attach_visit_reading` (sets saved_reading_id only when it is empty, so retries can't create duplicates).

Integrations:
- `SacredSpreads.tsx` reads `?spread=&visitStep=`. The draw and auto-save that already exist run once. It looks up `attach_visit_reading` first, and if a reading is already linked, it reopens it without drawing again.
- Deck view (`Index.tsx`) reads `?deck=&visitStep=`. The first draw is stored on the visit step. After that it reuses `?card=` resume.
- `/readings?reading=<id>` opens that reading's dialog.

Shared `AddToRitualDialog` (Dialog on desktop, Drawer on mobile). Thumbnail plus control added to `ResourceCard`, `DeckSelection` and `SpreadSelection` with `stopPropagation`. New routes `/rituals`, `/rituals/:id`, `/rituals/:id/visit` (member-gated). New Journal "Rituals" filter reads `ritual_visits`.

Checks: create and edit rituals in all three groups; add, reorder and remove steps; start a visit in two tabs (one unfinished visit); draw, reload, resume (same reading id); edit a ritual after a visit (snapshot unchanged); second account cannot read the first account's rituals; free account sees the join screen; course items have no +.
