# Draft and Publish Controls for Card Decks

## What will change

- Every existing deck will remain published, so nothing currently visible disappears.
- Every newly created deck will start as **Draft** and remain visible only to admins.
- Add a clear **Publish Deck** control in Card Deck Uploader → Deck Settings, with a Draft/Published status label.
- Allow admins to return a published deck to Draft when needed.
- Hide draft decks and their cards from members across the Door of Remembrance, direct card links, Sacred Spreads, global search, continuation links, and generated member readings.

## Security and data

- Add a deck publication field with a safe default of Draft for new records.
- Enforce visibility in the database, not only in the page design: admins can read all decks/cards, while members can read cards only from published decks they can otherwise access.
- Update the server-side Temple search so unpublished decks and cards are returned only to admins.
- Filter background/member reading generation to published decks, because those processes use privileged access that bypasses normal member visibility rules.

## Verification

- Confirm existing decks are still published after the change.
- Create a temporary draft deck and verify an admin can see it while a regular member cannot list or open it.
- Publish it and verify it becomes member-visible, then remove the temporary test data.
- Confirm the app builds cleanly and the Draft/Published controls display correctly in the uploader.
