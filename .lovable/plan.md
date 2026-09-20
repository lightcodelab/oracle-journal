# Card Deck uploader: rich text, image upload, flexible sections

## What changes for you

**1. Rich text everywhere content is written**
Every long-form content box in the Card Deck Editor (The Card, Mini Reading, Opening Invocation content, Teaching, Activity, Journalling Activity, and any new section you create) gets the same editing toolbar you already use for course descriptions: bold, italic, underline, headings, bullet and numbered lists, quotes, links, alignment, and image insert/library.

Short single-line fields stay plain text boxes, because they are displayed as the section's heading and must be one clean line: Card Title, all the "— Heading" fields, Reflection Question, Vimeo Video ID, Card Number.

**2. Card image becomes an uploader**
The "Image File Name" box is replaced with an image upload area: choose a file, it is compressed and stored, and you see a preview with a Remove button. Existing cards keep working untouched — the old file names still display exactly as they do now, and you can replace any of them with an upload.

**3. Build the card reading from sections you choose**
Instead of a fixed list of every possible field, each card shows only the sections that are actually filled in, each in its own block with a Remove button. Below them: an **Add a section** dropdown listing that deck's named sections (The Card, Mini Reading, Opening Invocation, Spiral of Inquiry, Acknowledgement, Spiral of Seeing, Living Inquiry, Guided Audio, Embodiment Ritual, Closing Benediction, and the equivalents for the other decks) plus **New custom section**.

A custom section asks for a section title (shown on the public card page exactly as typed) and a rich-text content box. Custom sections can be reordered up/down and appear on the card page after the deck's built-in sections, styled identically.

## Technical notes

- `src/components/admin/CourseDescriptionEditor.tsx` is generalised into a reusable `RichTextEditor` (same TipTap setup and `RichTextEditorToolbar`); the existing course usage keeps working via a thin re-export so nothing else changes.
- `src/components/FormattedContent.tsx` gains an HTML branch: when the stored value contains HTML tags (`looksLikeHtml` from `src/lib/richText.ts`), render it inside a `prose prose-invert` wrapper; otherwise keep today's plain-text/markdown formatter untouched. This keeps all existing plain-text card content rendering exactly as it does now.
- New `src/lib/cardImage.ts` exporting `cardImageSrc(name)`: returns `name` when it starts with `http`, else `/cards/${name}`. Applied to every card image render site (`CardDetail`, `OracleCardComponent`, `SpreadReading`, `SpreadViewDialog`, `StarterCardSpread`, `SaveReadingDialog`, `MyReadings`, `MyRemembranceLetters`). `image_file_name` column is unchanged — uploads store the public URL in it, so no migration is required.
- Uploads go to the existing `content-images` bucket under `cards/`, through `compressImage` (60% WebP, max 1920px), matching the deck thumbnail flow already in this page.
- Custom sections are stored additively in `content_sections.custom_sections` as an ordered array of `{ id, title, content }`. Built-in fields keep their current column/JSON storage, and the Magic not Logic `card_details` mirroring stays in place.
- `CardDetail.tsx` renders `custom_sections` in order after the deck-specific blocks and before Linked Resources, using the same `bg-card border border-border rounded-lg p-6` block and `font-serif text-xl` heading.
- Section presence in the admin is derived from non-empty values, so nothing needs backfilling.
