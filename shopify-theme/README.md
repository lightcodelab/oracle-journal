# Temple of Sustainment — Shopify Theme

A Shopify **Online Store 2.0** theme styled to match the Temple of Sustainment app.
Editorial luxury aesthetic (inspired by Impulse & Prestige), Temple branding:
deep brown-black backgrounds, warm cream text, gold accents, Playfair Display
display type with Inter body.

## Installing on Shopify

1. Zip the **contents** of the `shopify-theme/` folder (not the folder itself).
   From this repo:
   ```bash
   cd shopify-theme
   zip -r ../temple-of-sustainment-theme.zip . -x "*.DS_Store" "README.md"
   ```
2. In Shopify admin: **Online Store → Themes → Add theme → Upload zip file**.
3. Once uploaded, click **Customize** to open the theme editor.
4. Set your logo, hero image, featured collections, and colors under
   **Theme settings**.
5. **Preview** the theme, then **Publish** when ready.

## Structure

Standard OS 2.0 layout:

```
config/       theme settings schema + defaults
layout/       theme.liquid, password.liquid (page wrappers)
templates/    JSON templates for index, product, collection, cart, etc.
sections/     modular sections (hero, featured-collection, header, footer…)
snippets/     reusable partials (product-card, price, icons…)
assets/       CSS, JS, static assets
locales/      translations (en.default.json)
```

## Design tokens

All colors, fonts and spacing are declared as CSS variables in
`assets/theme.css` (`:root { --color-bg, --color-fg, --color-accent … }`) and
are also exposed as theme settings so the merchant can tweak brand colors from
the Shopify theme editor without touching code.

Fonts are loaded via Shopify's `font_picker` setting (defaults: Playfair
Display + Inter). To change: **Theme editor → Theme settings → Typography**.

## Products supported

Physical goods only (journals, oracle decks, snail mail packs, gift boxes,
notepads, stickers, posters). Uses native Shopify cart + checkout — no custom
payment logic needed.

## Local development (optional)

Install the Shopify CLI and preview against a dev store:

```bash
shopify theme dev --store your-store.myshopify.com
```