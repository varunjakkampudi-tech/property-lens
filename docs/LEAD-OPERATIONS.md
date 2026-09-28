# Hourly lead operations

## Operating objective

Run the existing **hourly ChatGPT discovery task** throughout the day for Vizag/Visakhapatnam, Tanuku, Palakollu, Bhimavaram and Eluru. Cover **Flats**, **Independent Houses/Villas** and **Residential Plots**. The user-facing budget is strictly **below ₹50 lakh**; a lower selected filter must not narrow discovery.

This is a research and data-maintenance process, **not** a browser scraper built into the website. The task can run while the user's computer is off, but GitHub updates, browsing and verification depend on the tools and permissions available during that run. The task cannot inspect personalized or private Instagram feeds.

## Discovery order

1. Recent publicly accessible **Instagram Reels**: local real-estate accounts, relevant location tags, English/Telugu property-sale terms, builder and agent channels. Preserve the direct public Reel URL, account, visible publication date and stated property facts.
2. Public **YouTube Shorts/videos** and local builder/agent sites.
3. Permitted property portals and official listings: OLX, Housing.com, MagicBricks, 99acres, NoBroker and other source-backed results.

Do not bypass logins, access controls, rate limits or platform restrictions. Do not guess URLs, invent prices, copy private contact details or infer current availability from a post remaining visible.

## Decision table

| Discovery | Destination | Required action |
|---|---|---|
| Price below ₹50L, consistent property identity and public source | `data/properties.js` as a **research lead** | Record source URL, `linkType`, poster, city, category, asking price, source-check date and `publicly_listed_unconfirmed` unless seller-confirmed evidence exists |
| Social-only post with uncertain identity, price or availability | `data/review-queue.json` | Keep the direct Reel/Short URL and the reason; corroborate before promotion |
| Asking price ₹50L or higher or unknown | Review queue | Exclude from main counts; retain for research if useful |
| Conflicting area, suspicious price, missing provenance or duplicate | Review queue | Explain the conflict; do not publish guessed facts |
| Reliable evidence a published property sold or closed | Data-only removal/update | Preserve source and closure evidence in the change description or review record |
| No material new evidence | No commit | Avoid churn and false “fresh” timestamps |

A search-results URL is not an exact listing URL. Preserve `linkType` accurately and let the UI label it as **Open source results**. Only publish business/agent inquiry numbers deliberately made public for property inquiries.

## Data-only update procedure

1. Inspect the current dataset and review queue; compare stable IDs, canonical source URLs, property attributes and dates.
2. Make the smallest evidence-backed changes **only** in `data/properties.js` and `data/review-queue.json`. Do not change `assets/`, `docs/`, `scripts/`, `tests/`, `package.json` or `.github/` during the hourly task.
3. Validate category/type consistency, price below ₹50L, explicit availability state, safe HTTPS source/map URLs, duplicate IDs/URLs and queue reasons.
4. Run syntax, data, unit, responsive Playwright and accessibility checks using the repository's release workflow. Do not weaken tests to accept new data.
5. Confirm the GitHub Actions run for the **exact commit** is `completed/success`. Confirm the published `deploy-version.txt` matches it and that the homepage, dataset, mobile app and shared core load.
6. Report meaningful new/retired leads and direct source URLs. If there is no material change, do not create a commit or claim a new deployment.

If the task lacks write or test tools, preserve the findings as review-needed information and report that publication is **not verified**. If CI or live deployment fails, leave the last successful release intact, capture the run link and surface the failure for a separately reviewed fix.

## Publication permissions and recovery

The GitHub Pages workflow is triggered by a **new commit to `main`**. Research findings alone do not trigger a build. A ChatGPT scheduled run can find leads but may still be denied a GitHub write by its **scheduled-execution safety gate**, even when the interactive GitHub connection can write. A GitHub Actions retry cannot repair a commit that was never created.

1. Attempt one evidence-backed data-only commit using the connected GitHub write action, or an authorized data-only PR if direct `main` writes are blocked by branch protection.
2. If the write action is denied by the scheduled-run safety gate, **do not retry repeatedly or route around the gate**. Keep the hourly research task enabled, report the exact denial and produce a reviewable data-only candidate/patch with source links. The lead is **discovered, not published**.
3. A user-approved interactive publication or separately configured, authorized repository publisher can apply the validated data patch. Once a commit reaches `main`, GitHub Actions automatically builds, tests and deploys it.
4. Track the exact commit and workflow run until the live commit verification passes. If CI fails, distinguish a deterministic validation failure from a transient Pages/CDN error. Never mark a discovery run as a successful deployment.

Unattended GitHub publication requires a write-capable identity that the **scheduled runtime itself** is authorized to use. The repository cannot grant that authority to ChatGPT or bypass its safety controls. Do not put access tokens in browser code, source files or task messages.

For market-value research, only collect independent, dated locality comparables with the same property type and area measurement basis. The UI's calculated benchmark is explicitly a median of comparable **asking listings**, not a verified sale price or appraisal. Never invent market values when comparables are insufficient.

## Code freeze and escalation

The final application release is frozen. Scheduled discovery is authorized for **data-only updates**, not opportunistic refactors. A broken user flow, security issue or required schema change is an engineering escalation and needs a separately reviewed change, full regression tests and a verified release.

## Privacy and buying safety

The website has no user accounts or runtime ingestion service. Saved properties, visited flags and personal notes stay in each browser. A source-check date means the public source was reviewed, **not** that a seller confirmed availability. Reconfirm seller identity, price, legal title, EC, approvals, plot/UDS and site condition before paying any advance.

[Architecture](ARCHITECTURE.md) · [Data dictionary](DATA-DICTIONARY.md) · [Deployment](DEPLOYMENT.md)
