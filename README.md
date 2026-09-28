# Property Lens

A static personal property-research dashboard for **Vizag, Tanuku, Palakollu, Bhimavaram and Eluru, Andhra Pradesh**.

## What is included

- Public buyer-facing property leads with listed asking prices strictly below ₹50 lakh
- Five locations × three categories: Flats, Independent Houses (including villas) and Plots
- Location → property type → listings on mobile, with selectable budgets (₹20L, ₹25L, ₹30L, ₹35L, ₹40L, ₹45L or all under ₹50L)
- Market-rate references, asking-rate comparison and negotiation targets
- Shortlist, visited tracking and personal notes using browser localStorage
- Up to four-property side-by-side comparison
- Direct listing/source links
- Responsive desktop/mobile layout
- Buying checklist and research documentation
- GitHub Pages deployment workflow
- No runtime framework or backend; development tests use Node.js and Playwright

## Main-listing policy

Only leads with a published asking price **strictly below ₹50 lakh** appear in active results. The selected price ceiling only filters what a visitor sees; it never limits the hourly discovery search. Listings priced at ₹50L or more and records without a confirmed asking price are excluded from active counts and retained in `data/review-queue.json`. An online listing remaining visible does not guarantee that the property is unsold. Instagram Reels are the first discovery priority; newly discovered posts need current availability evidence before they enter active results. The CI pipeline runs `scripts/validate-data.cjs` to enforce the price cap before deployment.

## Run locally

Open `index.html` directly, or run:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Target URL: **https://varunjakkampudi-tech.github.io/property-lens/**

## Important

Online availability is not guaranteed. Reconfirm seller availability, legal/title documents, approvals, plot/UDS, construction condition, water/drainage, maintenance and final all-in cost before paying any token advance.

## Sources and confidence

The app indexes public property advertisements; a visible post is **not confirmation that a home is unsold**. Users must confirm availability, pricing, seller identity, title and municipal/land-use approvals before paying or visiting. Direct property links are preferred; entries linking to a results page are labeled as such. Eluru includes a clearly labeled outlying layout where the advertised site is about 30 km away. Instagram/YouTube posts are discovery sources only until independently corroborated.

## Automated refresh

An hourly ChatGPT task prioritizes public Instagram Reels and YouTube Shorts, followed by property portals, across all five locations and three categories. It updates the GitHub repository only for supported material changes, runs CI and deploys on success. Personalized/private Instagram feeds and restricted platforms cannot be fully searched without permitted access; the task cannot guarantee every market listing.

## Submit missed Reels and report sold listings

Public search does not have access to each buyer's personalized Instagram feed. Submit a **public Instagram Reel / YouTube Short / portal URL** or flag a listing as sold using [the lead-review issue form](https://github.com/varunjakkampudi-tech/property-lens/issues/new?template=property-lead.yml) (GitHub sign-in required). The hourly review can use your exact links to find matching properties; all submissions are review-needed until price and availability are corroborated. Do not submit private individuals' phone numbers.

## Quality gates and release verification

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for module boundaries, data provenance, accessibility, responsive behavior and release policy.

Run `npm install`, `npx playwright install chromium`, then `npm run test:quality` with a local server at `http://127.0.0.1:4173`. GitHub Actions validates data and syntax, exercises mobile/desktop browser journeys and accessibility, then deploys Pages. The deployment workflow checks the published commit marker, homepage, lead dataset and mobile application. Pending, cancelled or failed runs are **not** successful releases.

E2E assertions derive city/category counts from the dataset rather than hard-coding inventory, so legitimate lead changes do not break tests. Empty categories are valid and shown as disabled choices rather than blocking a release.
