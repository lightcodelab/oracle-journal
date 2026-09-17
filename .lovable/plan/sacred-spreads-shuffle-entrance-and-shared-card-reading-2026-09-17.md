# Sacred Spreads: shuffle entrance and shared card reading

## Outcome
- When a member opens Sacred Spreads, the four deck backs gather and shuffle, then deal the spread-option cards into their existing grid.
- After a member chooses a spread and reveals its final card, a shared reading is generated automatically from the exact cards and their positions.
- The reading identifies the common thread across the selection, speaks in THE TEMPLE’s grounded and intimate voice, and does not use monthly themes or pilgrimage continuity.
- Saving the spread stores both the card snapshot and the generated reading. Existing saved spreads remain readable without a generated reading.

## Experience
1. Replace the immediate spread grid entrance with a short, finite multi-deck shuffle and deal sequence.
2. Respect reduced-motion preferences by skipping the shuffle and showing the spread options directly.
3. Preserve the current card-selection, reveal, card-detail, and back-navigation behavior.
4. On the final reveal, show a clear “reading being written” state, then reveal the shared reading below the cards.
5. Keep the Save This Reading action available only after generation succeeds; saving persists the cards and shared reading together.
6. Surface the actual generation error with a retry action, while keeping all revealed cards intact.
7. Show the same shared reading when the saved spread is opened from My Readings.

## Secure generation and persistence
- Add a signed-in, full-access member function dedicated to Sacred Spread readings.
- Validate the spread identifier, position labels, card identifiers, and expected card count on the server.
- Re-fetch the selected cards and their deck names/content server-side so browser-supplied card meanings cannot alter the reading.
- Generate from each card’s title, deck, position, and substantive card content, with instructions to synthesize a common thread rather than write unrelated mini-readings.
- Reuse the established Lovable AI gateway handling: streaming request, no artificial timeout, clear 400/401/402/403 errors, and bounded backoff only for 429/5xx.
- Add nullable generated-reading and model fields to saved readings; retain owner-only access and current row-level protections.

## Technical details
- Front end: update the Sacred Spreads page and spread components for finite shuffle/deal states, automatic generation, retry, and reading display.
- Saved view: pass and render the persisted reading in the existing spread dialog.
- Backend: add and deploy a `generate-sacred-spread-reading` function plus shared prompt/content helpers where reuse is appropriate.
- Database: add nullable text metadata to `saved_readings`, preserving all existing rows and policies.
- Types: update the local saved-reading shape and generated database types through the normal backend type flow.

## Verification
- Test one-card, two-card, three-card, and four-card spreads.
- Confirm generation starts exactly once after the final reveal and retry does not redraw cards.
- Confirm saved readings reopen with the same cards, positions, and generated text.
- Confirm old saved spreads still open cleanly without generated text.
- Confirm unauthenticated and non-entitled calls are rejected, malformed card payloads return clear errors, and a real AI request succeeds.
- Check desktop and mobile layouts, reduced motion, loading/error states, preview logs, and the production build signal.
