# Sacred Rewrite: Mini Card Readings

## What changes

When a member shuffles the deck or jumps to a card number in **The Sacred Rewrite**, the card view will show a short reading instead of the full seven-section teaching:

1. **The Distortion** and **The Higher Truth** (kept verbatim from the card).
2. A 2-3 sentence woven reading summarising the card's theme.
3. One distilled reflection question drawn from that card's Spiral of Inquiry / Living Inquiry.
4. A **"Go deeper in the Companion Course"** link that opens that card's lesson in the Sacred Rewrite companion course, where the full content lives.

All 63 cards get their own mini reading, written from that card's existing content (invocation, spirals, acknowledgement, benediction), so the tone matches the deck.

Every mini reading is editable per card in the Card Deck editor under a new **Mini Reading** section (reading text + reflection question), so you can rewrite anything I generate.

## Your second question - does deck editing update the course?

No. They are two separate stores. The companion course lessons are a **copy** generated once from the cards; the course has its own 63 lesson records. Editing a card in the deck editor will **not** change the companion course lesson, and editing a lesson will not change the card.

If you want them linked, that is separate work - options later: (a) a "re-sync this card into its lesson" button in the deck editor, or (b) make the lesson read directly from the card so there is one source of truth. Not included here.

## Technical detail

- **Storage:** two new keys inside `cards.content_sections` - `mini_reading` and `mini_reflection_question`. No schema change needed (`content_sections` is already `jsonb`), so no migration; content is written as a data update.
- **Generation:** for each of the 63 Sacred Rewrite cards, compose the reading and question from existing `card_details`, `opening_invocation_content`, `spiral_of_inquiry_content`, `spiral_of_seeing_content`, `living_inquiry_content` and `benediction_content`, then write both keys back per card. Existing columns are left untouched.
- **Card view (`src/components/CardDetail.tsx`):** in the `isSacredRewrite` branch, render The Card (Distortion/Higher Truth), the mini reading, the reflection question and the companion-course link; stop rendering Opening Invocation, Spiral of Inquiry, Acknowledgement, Spiral of Seeing, Living Inquiry, Guided Audio, Embodiment Ritual and Benediction. `CardDetailDialog` and spread views inherit this since they use the same component. Fallback: if a card has no `mini_reading`, show the current full sections so nothing goes blank.
- **Deep link:** map card number to the matching lesson in the "Test - The Sacred Rewrite" course (lessons were generated in card order) and link to the existing companion-course lesson route; if the member lacks access, link to the Companion Courses page instead.
- **Editor (`src/pages/CardDeckAdmin.tsx`):** add to `DECK_FIELDS['The Sacred Rewrite']` two `storage: 'json'` fields - `mini_reading` (textarea) and `mini_reflection_question` (input) - placed directly after `card_details`. Existing save logic already persists `json` fields into `content_sections`.
- **Scope:** other decks (AreekeerA, Magic not Logic, The Art of Self-Healing) are unchanged.