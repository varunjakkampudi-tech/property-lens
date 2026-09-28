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
| `market`, `askingRate`, `target` | Working locality reference, advertised/calculated rate and negotiation research |
| `highlights`, `notes` | Source-backed attributes and outstanding due-diligence questions |

### Derived comparable market estimate

The UI derives an **estimated market value** at render time; it is not stored as a seller fact. `assets/core.js` selects eligible comparables with the same city, category and normalized size unit, excludes the subject property, prefers an exact locality when at least two comparables exist, and otherwise uses the city/category pool. The estimate is `median(comparable asking price ÷ size) × subject size` and requires at least two usable comparables. When evidence is insufficient, the UI says so rather than inventing a value. The percentage shown is the asking-price difference from that estimate. This is an asking-price comparison aid, **not** a professional appraisal or verified transaction value.

`window.MARKET_DATA` supplies five-city summaries. `window.SOURCE_CONTACTS` lists deliberately published business inquiry contacts, never private numbers harvested from restricted sources.

## Review queue

`excludedFromActiveResults` holds out-of-budget or unknown-price leads with an explicit `reason` and source record. `candidatesNeedingSellerConfirmation` holds incomplete, inconsistent or uncorroborated discoveries with city, category, source URL and evidence. Queue items are **not** counted in main results.

## Data maintenance rules

Preserve IDs and provenance, deduplicate canonical URLs, use explicit uncertainty states, and update dates only when the source is actually rechecked. New public Instagram Reels are discovery evidence; do not infer an unsold property from a live post. A selected UI budget filters results only; it does not limit discovery.

[Lead operations](LEAD-OPERATIONS.md) · [Architecture](ARCHITECTURE.md)
