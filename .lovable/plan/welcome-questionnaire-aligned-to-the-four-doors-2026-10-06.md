# Welcome Questionnaire aligned to the Four Doors

## Goal
When a member first enters THE TEMPLE, a short, gentle question asks what they are primarily here for. Their answer shapes the order of the home page so their chosen Door's content comes first. Every Door stays fully open. Nothing is ever hidden.

## The question
"What are you primarily here for?" with four answers, one per Door:

| Answer | Door | What moves up on the home page |
|---|---|---|
| Healing templates, rites and meditations | Devotion | "Begin a practice", then "Create Your Own Rituals" |
| Card decks and card readings | Remembrance | "Let the Cards speak to you" (Remembrance Letters + Sacred Spreads) |
| Personal development and self-awareness | Becoming | A new "Your Becoming journeys" strip showing Alchemy of Becoming courses, then Tools for your return |
| Community | Communion | "Live, Community and Support" |

- One answer only, so the page has a clear lead.
- A "Skip for now" link. Skipping keeps today's default order, and the question does not reappear.
- Shown once, as a calm full-screen welcome card over the home page, in the existing dark, cream and gold style with the four Door images.

## What changes on the home page
- **Stays fixed at the top:** the welcome banner and the row with Guide, Search and Continue your journey.
- **Explore THE TEMPLE:** the chosen Door moves to first position and gets a small gold "Your focus" label.
- **Below that:** the sections linked to their focus come first. All other sections follow in today's order.

## Changing the answer later
- My Profile gets a "My focus" setting with the same four choices plus "No preference".
- A small "Change focus" link sits next to the Explore THE TEMPLE heading.

## Who sees it
- Only active members, admins and members with manual access. Free accounts keep the current look-only preview with no questionnaire.
- Existing members see it once on their next visit, and can skip it.

## Technical details
- Add nullable `primary_focus` (`devotion | remembrance | becoming | communion`) and `focus_prompted_at` timestamp to `profiles`. Existing owner-only RLS covers it.
- New `WelcomeFocusDialog` on `/temple`; it opens when access is resolved and `focus_prompted_at` is null. Answering or skipping sets the timestamp.
- `Temple.tsx` builds the section list from a focus-to-order map. `ExploreDoors` takes an optional `focus` prop to reorder and label.
- New `BecomingJourneysStrip` reuses `useRemembranceCourses` + `ResourceCard`.
- Focus selector added to `Profile.tsx`.
- Record the focus-ordering rule in AGENTS.md and the four answer labels in memory.
