# Property Lens

A static personal property-research dashboard for **Vizag, Tanuku, Palakollu and Bhimavaram, Andhra Pradesh**.

## What is included

- Active buyer-facing property leads with confirmed asking prices strictly below ₹50 lakh
- Four locations × three categories: Flats, Independent Houses (including villas) and Plots
- Location → property type → listings on mobile, with selectable budgets (₹20L, ₹25L, ₹30L, ₹35L, ₹40L, ₹45L or all under ₹50L)
- Market-rate references, asking-rate comparison and negotiation targets
- Shortlist, visited tracking and personal notes using browser localStorage
- Up to four-property side-by-side comparison
- Direct listing/source links
- Responsive desktop/mobile layout
- Buying checklist and research documentation
- GitHub Pages deployment workflow
- No framework, backend, npm install or build step

## Active-listing policy

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
