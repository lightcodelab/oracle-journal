# Companion Courses: Deepening Courses location + The Sacred Rewrite course

## What you'll get

1. A new card in **The Mirrors of Sacred Undoing** on `/remembrance` titled *Companion Courses* with the description "To deepen your experience with the cards and remember who you are." It links to a new page.
2. A new page at `/remembrance/deepening-courses` — heading **Companion Courses**, description "To deepen your experience with the cards and remember who you are." It lists thumbnails for every course assigned to the new "Deepening Courses" location, using the exact same card styling as the other uploader-driven course grids.
3. A new **Deepening Courses** location available in the Course Uploader and Content Uploader location dropdowns, scoped to the Remembrance door.
4. The existing course **Test - The Sacred Rewrite** moved to that location and filled with **63 lessons** — one per Sacred Rewrite card — grouped into modules, containing the same content the card screen shows after a draw.
5. Breadcrumbs from those courses/lessons return through Door of Remembrance → Companion Courses.

The card-draw experience stays exactly as it is today; nothing is removed from the deck screen.

## Lesson content mapping

Each card becomes one lesson, ordered by card number, titled `{card_number}. {card_title}`. The lesson body reproduces the card's sections in the same order used on the card screen:

```text
The Card                (card_details)
Opening Invocation      (opening_invocation_heading / _content)
Spiral of Inquiry       (spiral_of_inquiry_*)
Acknowledgement         (acknowledgement_*)
Spiral of Seeing        (spiral_of_seeing_*)
Living Inquiry          (living_inquiry_*)
Guided Audio            (guided_audio_*)
Embodiment Ritual       (embodiment_ritual_*)
Benediction             (benediction_*)
```

Each section's own heading text from the card is used as the lesson sub-heading (falling back to the labels above). Content is stored in the lesson rich-text field so it renders with the standard course typography.

**Modules:** cards are grouped into 7 modules of 9 cards ("Movement One" … "Movement Seven", covering cards 1–9, 10–18, and so on). These are only labels stored on the lessons, so you can rename or regroup any module later in the Course Uploader without touching content.

## Thumbnail

The Companion Courses card and the course cover use a neutral placeholder styled to the Temple aesthetic until you upload the artwork; once you send the image I'll swap both in.

## Technical detail

- Migration: insert `content_categories` row `{name: 'Deepening Courses', slug: 'loc-deepening-courses', type: 'location', page: 'remembrance', active: true}`; update `courses.location_id` for "Test - The Sacred Rewrite" to that row.
- Data population: generate 63 `lessons` rows for that course from `cards` joined to the Sacred Rewrite deck, setting `lesson_number`, `module_title`, `module_order`, and `body_richtext` built from `content_sections`.
- New page `src/pages/DeepeningCourses.tsx`, route `/remembrance/deepening-courses` in `App.tsx`. It reuses `useContentByLocation('loc-deepening-courses')` and `ResourceCard` with `basePath="/remembrance"`, so uploader courses and content resources both appear, with draft visibility for admins — identical behaviour to the existing section pages.
- `src/components/DeckSelection.tsx`: add the Companion Courses card to the Mirrors grid (same markup as the Sacred Spreads link card), navigating to the new route.
- Breadcrumbs: extend the location-name mapping in `DevotionCoursePage.tsx` and `DevotionLessonPage.tsx` so `Deepening Courses` resolves its parent door to `/remembrance` and its section link to `/remembrance/deepening-courses`.