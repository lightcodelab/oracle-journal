# Card Deck Page Controls and Rich Deck Descriptions

## What will change

- Move **Shuffle the Deck** and **Go to Card Number** directly beneath the selected deck banner.
- Keep both controls together responsively, while allowing them to fit cleanly on narrow screens.
- Replace the plain Description box in **Card Deck Uploader → Deck Settings** with the existing WYSIWYG editor.
- Render the saved deck description as formatted content on the main deck page, beneath the two controls.
- Keep the Door of Remembrance deck tiles as short plain-text previews so saved formatting does not expose HTML tags.

## Technical details

- Reuse the existing rich-text editor and formatted-content renderer already used for card content.
- Continue saving the description in the existing deck description field; no database change is needed.
- Sanitize the deck-grid excerpt into plain text while preserving full formatting on the selected deck page.
- Verify the selected deck layout at mobile and desktop widths and confirm the admin description saves and displays correctly.
