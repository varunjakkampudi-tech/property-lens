# UI and frontend system design

Property Lens uses a consistent, responsive static design system for Vizag, Tanuku, Palakollu, Bhimavaram and Eluru. It deliberately maintains distinct desktop and mobile compositions while sharing data, safety primitives and the same property IDs.

## Primary journeys

- **Mobile (≤850px):** Location → Flats / Independent Houses / Plots → filtered listings → details/source/map → save or compare. Empty categories show a truthful zero count and cannot be opened. Bottom navigation exposes locations, browse, saved and compare.
- **Desktop (>850px):** City summaries and source directory → filter/search/sort results → details, shortlist, visited tracking, personal notes and four-property comparison.
- **Responsive transition:** Both UIs initialize, but only the appropriate composition is displayed. The skip link points to the visible `main` landmark as the viewport changes.

## Visual and interaction principles

Use navy/blue emphasis, white cards, subtle elevation, consistent spacing and concise provenance labels. Avoid relying on color alone for selected or saved state. Keep source results distinguishable from direct listing links. Prefer honest availability wording over urgency or unverified “active” claims.

All interactive controls must be keyboard operable, have accessible names, visible focus and adequate touch targets. Toggle buttons use `aria-pressed`; filters use native labels/selects; dialogs use native `<dialog>` with close controls and Escape support. Search updates cards without destroying the focused input; changing budget preserves the filter panel.

## Breakpoints and regression evidence

The mobile breakpoint is **850px**. Playwright tests 375px, 390px, 430px and 1440px plus a live 1440 → 390 → 1440 transition. Regression checks include horizontal overflow, location/category counts, details, compare, shortlist, search focus and serious/critical axe accessibility findings.

![System architecture](diagrams/system-architecture.svg)

[Architecture](ARCHITECTURE.md) · [Data dictionary](DATA-DICTIONARY.md)
