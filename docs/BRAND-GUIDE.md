# Property Lens brand and UI system

## Brand mark

The roof-and-lens mark in [assets/favicon.svg](../assets/favicon.svg) combines the home-search metaphor with a search lens. It is a standalone, scalable SVG used as the favicon, desktop wordmark symbol and mobile header mark. Do not replace it with Unicode house characters, emoji or a raster screenshot.

## Typography

**Primary family:** Manrope (400, 500, 600, 700 and 800), loaded with `display=swap`. **Fallbacks:** Inter, Segoe UI, system UI and sans-serif. The site remains functional when Google Fonts is unavailable. Keep typography consistent across desktop and mobile.

| Element | Desktop | Mobile |
|---|---|---|
| Hero / chooser heading | 29–41px, 800, tight tracking | 27–28px, 800 |
| Section heading | 25px, 800 | 18–20px, 800 |
| Card title | 16–17px, 800 | 14–15px, 800 |
| Asking price | 22px, 800 | 19–20px, 800 |
| Main text and form controls | 13–14px | 12–14px |
| Secondary metadata | 11–12px | 11–12px |

Small badges are secondary, never the sole way to understand price, availability or category. Prefer normal case over all caps except short eyebrow labels.

## Colors and tokens

The authoritative variables are in `assets/design-refresh.css`: navy `#12336d`, blue `#2259d5`, light background `#f6f8fc`, primary text `#172b4d` and subtle borders `#e1e8f2`. Use white cards, blue focus rings and a restrained green for source-backed counts. Do not use urgency colors to imply an unverified listing is available.

## Icon system

`assets/icons.svg` contains same-origin, dependency-free 24×24 line icons. Both UIs use `PropertyLensCore.icon(name)`, which allowlists symbol names and CSS classes. Icons in buttons are decorative (`aria-hidden`); the button's text or `aria-label` provides its accessible name. Keep touch targets at least 44×44px where feasible.

## Responsive interaction

**Desktop:** compact horizontal navigation, a location chooser, a contextual property-type chooser and listings. Search, location/type/budget and sort stay visible; age/community/deal filters are progressively disclosed. Market highlights and public contacts remain available in a separate expandable section. Saved, visited, compare and buyer checklist remain reachable.

**Mobile:** preserve the approved location → category → listings layout and bottom navigation. Apply the same brand, type and icon system without changing the mobile information architecture.

**Release policy:** After this one-time reviewed design release, the hourly lead task changes only `data/properties.js` and `data/review-queue.json`. A new UI change requires a separate reviewed engineering release.

[UI reference](UI-REFERENCE.md) · [Architecture](ARCHITECTURE.md)
