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
| `market`, `askingRate`, `target` | `market` is a **reference locality**, not a property valuation; `askingRate` is a listed/calculated asking rate, and `target` is negotiation research. |
| `highlights`, `notes` | Source-backed attributes and outstanding due-diligence questions |

### Derived comparable market estimate

The UI derives an **indicative asking-value comparison** at render time; it is not stored as a seller fact. `assets/core.js` excludes the subject and requires at least three other eligible **direct listings** with the same city, category, property type, exact measurement unit and compatible age, within ±30% of the subject's size and with public sources checked in the last 90 days. The preferred benchmark uses the same locality reference (`market`). For flats only, a clearly identified city-wide fallback requires at least five comparable listings. Independent houses are excluded because built-up area alone cannot establish combined land/building value. The estimate is `median(comparable asking price ÷ size) × subject size`; the card also shows the asking-price difference, sample size, geographic scope and latest peer source-check date. Insufficient or stale evidence displays **Not available**. The dataset only contains sub-₹50L listings, so the estimate is subject to selection bias and is **not** a professional appraisal, verified sale value or representative full-market price.

`window.MARKET_DATA` supplies five-city summaries. `window.SOURCE_CONTACTS` lists deliberately published business inquiry contacts, never private numbers harvested from restricted sources.

## Review queue

`excludedFromActiveResults` holds out-of-budget or unknown-price leads with an explicit `reason` and source record. `candidatesNeedingSellerConfirmation` holds incomplete, inconsistent or uncorroborated discoveries with city, category, source URL and evidence. Queue items are **not** counted in main results.

## Data maintenance rules

Preserve IDs and provenance, deduplicate canonical URLs, use explicit uncertainty states, and update dates only when the source is actually rechecked. New public Instagram Reels are discovery evidence; do not infer an unsold property from a live post. A selected UI budget filters results only; it does not limit discovery.

[Lead operations](LEAD-OPERATIONS.md) · [Architecture](ARCHITECTURE.md)
