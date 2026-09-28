# Property Lens data dictionary

The source of truth is `data/properties.js` (public research leads and market metadata) and `data/review-queue.json` (excluded or evidence-pending discoveries). Both are versioned and validated before deployment.

## Geographic and category enums

- `city`: `Vizag`, `Tanuku`, `Palakollu`, `Bhimavaram`, `Eluru`.
- `category`: `Flats`, `Independent Houses`, `Plots`.
- `type`: `Flat` → Flats; `Independent House` or `Villa` → Independent Houses; `Plot` → Plots.

## Main lead fields

| Field | Meaning / invariant |
|---|---|
| `id` | Stable unique slug, never derived from a mutable display title |
| `city`, `category`, `type` | Valid geographic and type/category combination |
| `name`, `locality` | Human-readable advertised project/lead and location |
| `price` | Public asking price in **lakh INR**, finite and **0 ≤ price < 50**; unknown/₹50L+ belongs in the queue |
| `size`, `sizeUnit`, `bhk` | Advertised dimensions and property class; do not infer missing measurements |
| `age`, `ageGroup` | Advertised condition/age and `new`, `resale` or `unknown` filter value |
| `gated` | `yes`, `partial` or `no`; `partial` means verify |
| `status` | Human-readable public listing/availability disclaimer |
| `availabilityStatus` | `publicly_listed_unconfirmed` or `seller_confirmed`; seller confirmation requires dated evidence |
| `verifiedOn` | ISO `YYYY-MM-DD` date the public source was checked; **not** proof of seller availability |
| `lastSeen` | Source's visible posting/update text, kept distinct from `verifiedOn` |
| `source`, `platform`, `poster`, `posterType` | Source platform and publicly visible poster provenance |
| `url` | Public HTTPS source URL; preserve the exact available source |
| `linkType` | `Direct listing` or a clearly identified results/search page; never label the latter exact |
| `mapUrl` | HTTPS Google Maps search URL; not a verified parcel boundary |
| `publicPhone`, `phoneLabel` | Optional deliberately advertised business/agent inquiry contact and its context |
| `deal`, `score` | Research heuristics for display/sorting, **not** professional valuations |
| `market`, `askingRate`, `target` | **`market` is a reference locality, not a property valuation.** `askingRate` is the listing's reported/calculated asking rate; `target` is negotiation research, not an independently verified market price. |

### Indicative market value shown on cards

`assets/core.js` calculates a conservative **comparable asking-value benchmark** at render time, not a seller-verified valuation. It requires at least three *other* eligible direct listings with the same city, locality reference (`market`), category, property type and exact size unit, within ±30% of the subject's size, whose public sources were checked within 90 days. The median peer asking price per unit × the subject's stated size yields an approximate value in lakh INR. Flats and plots are eligible only when comparable evidence exists; houses are excluded because land and built-up-area pricing cannot safely be inferred from the current fields. The card shows the estimate, asking-price difference, sample count, basis and latest peer source-check date. A missing or stale benchmark is displayed as **Not available**.

**Important:** All input leads are restricted to asking prices below ₹50L, so this is a narrow, potentially biased listing comparison, not a full-market estimate, registered-sale price, bank valuation or independent appraisal. The source-check date is not proof the property remains available. Never fabricate a value to fill a card.
| `highlights`, `notes` | Source-backed attributes and outstanding due-diligence questions |

`window.MARKET_DATA` supplies five-city summaries. `window.SOURCE_CONTACTS` lists deliberately published business inquiry contacts, never private numbers harvested from restricted sources.

## Review queue

`excludedFromActiveResults` holds out-of-budget or unknown-price leads with an explicit `reason` and source record. `candidatesNeedingSellerConfirmation` holds incomplete, inconsistent or uncorroborated discoveries with city, category, source URL and evidence. Queue items are **not** counted in main results.

## Data maintenance rules

Preserve IDs and provenance, deduplicate canonical URLs, use explicit uncertainty states, and update dates only when the source is actually rechecked. New public Instagram Reels are discovery evidence; do not infer an unsold property from a live post. A selected UI budget filters results only; it does not limit discovery.

[Lead operations](LEAD-OPERATIONS.md) · [Architecture](ARCHITECTURE.md)
