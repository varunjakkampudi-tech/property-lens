# Property Lens architecture and quality contract

## Runtime and module boundaries

Property Lens is a static GitHub Pages application: no runtime framework, backend, database, account system or privileged API keys. It loads versioned public listing data and filters locally. Personal shortlist, visited flags and notes remain in the user's browser.

- \`data/properties.js\`: public listings, five-city market metadata and deliberately published business contacts.
- \`data/review-queue.json\`: price-unknown, out-of-budget, conflicting or unconfirmed discoveries, excluded from the main inventory.
- \`assets/app.js\`: desktop filtering, cards, shortlist, visited flags, notes and comparison.
- \`assets/enrichment.js\`: desktop source cards and source details; stable property IDs identify dialogs. The observer watches direct dialog replacements to avoid a recursive enrichment loop.
- \`assets/mobile-location.js\`: mobile location → category → listings flow, filtering, details, shortlist and comparison. It initializes at every viewport but is displayed only at the mobile breakpoint, supporting live viewport changes.
- \`assets/styles.css\`: visual design, responsive rules, focus indicators and touch-target sizes.
- \`scripts/validate-data.cjs\`: release-blocking data, category, budget, URL and review-queue validation.
- \`tests/e2e.spec.js\`: data-driven Playwright journeys at 375/390/430px and desktop, with axe serious/critical accessibility checks.

## Data integrity and trust

Only listings with a supported asking price strictly below ₹50 lakh belong in the main dataset. A visible advertisement is not proof that a property is still unsold. UI copy and record status must distinguish publicly discoverable leads from confirmed availability. Preserve the exact public source link, poster provenance, source-check date and property identity; do not invent listings or private phone numbers. Deduplicate cross-platform records and keep disputed price, size or availability in the review queue.

The selected budget is a **view filter**, not a discovery limit. A city or category may legitimately have zero properties; the interface shows an honest count and disables empty category choices.

## Accessibility, responsive design and security

Maintain location → category → listings navigation and usable keyboard focus. Typing should update results without destroying the search input; changing budget must preserve the open filter panel. Removing an item from comparison must preserve the comparison view. Quick filters are toggle buttons with \`aria-pressed\`, not incomplete ARIA tabs. The skip link targets the visible main landmark at the current breakpoint. Dialogs have accessible names and close controls. Escape untrusted listing text before HTML insertion, and restrict external listing/map URLs to HTTPS.

## Release gates

1. Review affected code, data provenance, architecture, security, responsive layout, accessibility and UX.
2. Run \`npm run test:syntax\` and \`npm run test:data\`; reject malformed URLs, duplicate identities, inconsistent types/categories and out-of-budget main records.
3. Run Playwright mobile (375/390/430px) and desktop journeys. Serious/critical axe findings block release.
4. Deploy only after tests pass. Require the GitHub Actions run for the **exact commit** to be completed with conclusion \`success\`.
5. Verify the published \`deploy-version.txt\` matches the commit, and the public homepage, data and mobile script load. Do not report pending, cancelled or failed releases as successful.
6. Keep failure evidence and fix the underlying regression rather than weakening tests to accept broken behavior.

## Growth boundary

Public Instagram/YouTube discovery cannot cover private or personalized feeds. A future authenticated feed, seller submission system or automated seller-contact workflow requires a permissioned backend, source review, rate limiting and secret management. Never put credentials in static client code.
