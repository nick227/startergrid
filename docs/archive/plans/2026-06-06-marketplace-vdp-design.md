# Marketplace Vehicle Detail Page (VDP) — Design Proposal

**Created:** 2026-06-06  
**Updated:** 2026-06-06  
**Status:** Approved direction — Phase 1 OpenAPI next  
**Route:** `#/vehicle/{listingId}` · `apps/marketplace/src/pages/VehicleDetailPage.tsx`

Related: [2026-06-06-ui-design-system-design.md](./2026-06-06-ui-design-system-design.md)

---

## Agreement summary

**Yes — this direction is correct.** The nested `vehicle.*` category model, promotion-platform sourcing, full VIN, embed-first 360, no AR/reviews in v1, and tour-as-curated-walkthrough are the right Phase 1 contract.

Small alignments baked into this doc:

| Your note | Resolution |
|-----------|------------|
| `vehicle.legal` vs Phase 1 `content` | API block named **`vehicle.content`** (description + notes + legal copy). UI section label can still say “Legal”. |
| Phase 1 lists `ratings` | **Removed from v1** per decision to cut reviews. |
| `pricing` + `availability` as sibling keys | Merged under **`vehicle.commerce`** (one section component, one TypeScript type). |
| `powertrain` in Phase 1 list | Maps to **`vehicle.engine`** (same fields; name matches ingest). |
| `dealer` in Phase 1 list | Maps to **`vehicle.location`**. |

---

## Data source

VDP content is **not scraped third-party inventory**. Each listing is populated from the **online auto promotion platform** — the same system that prepares, validates, and syndicates dealer stock.

Implications:

- Fields are **authoritative** (dealer-entered or DMS-ingested, then platform-normalized)  
- Every listing carries **promotion metadata** — where and how it is marketed  
- Media angles, tour steps, and feature groups are **operator-configurable**, not inferred at render time  
- Consumer API stays **public-safe** but includes **full VIN** by policy (see decisions)

---

## Response shape (not a flat blob)

Phase 1 detail response is three top-level objects. The frontend imports **one type per block** — each VDP section consumes exactly one category.

```yaml
MarketplaceVehicleDetailResponse:
  required: [vehicle, promotion, ctas]
  properties:
    vehicle:
      $ref: '#/components/schemas/MarketplaceVehicleDetail'
    promotion:
      $ref: '#/components/schemas/MarketplaceListingPromotion'
    ctas:
      $ref: '#/components/schemas/MarketplaceVehicleCtas'
```

```yaml
MarketplaceVehicleDetail:
  required:
    - core
    - commerce
    - location
    - classification
    - colors
    - engine
    - efficiency
    - conditionHistory
    - features
    - warranty
    - media
    - content
  properties:
    core:              { $ref: '#/components/schemas/VehicleCore' }
    commerce:          { $ref: '#/components/schemas/VehicleCommerce' }
    location:          { $ref: '#/components/schemas/VehicleLocation' }
    classification:    { $ref: '#/components/schemas/VehicleClassification' }
    colors:            { $ref: '#/components/schemas/VehicleColors' }
    engine:            { $ref: '#/components/schemas/VehicleEngine' }
    efficiency:        { $ref: '#/components/schemas/VehicleEfficiency' }
    conditionHistory:  { $ref: '#/components/schemas/VehicleConditionHistory' }
    features:          { $ref: '#/components/schemas/VehicleFeatures' }
    warranty:          { $ref: '#/components/schemas/VehicleWarranty' }
    media:             { $ref: '#/components/schemas/VehicleMedia' }
    content:           { $ref: '#/components/schemas/VehicleContent' }
```

**Frontend mapping (DRY):**

| VDP section | Consumes |
|-------------|----------|
| Purchase panel header | `vehicle.core`, `vehicle.commerce` (price slice) |
| Price & availability card | `vehicle.commerce` |
| Dealer block | `vehicle.location` |
| Quick specs / overview | `vehicle.classification`, `vehicle.colors`, `vehicle.engine`, `vehicle.efficiency` |
| Condition & history | `vehicle.conditionHistory` |
| Features | `vehicle.features` |
| Warranty | `vehicle.warranty` |
| Gallery + tour | `vehicle.media` |
| Description & legal | `vehicle.content` |
| Action buttons | `ctas` |

Page story order: **vehicle → price → dealer → specs → trust → features → media → description → action**.

---

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Full VIN** shown by default on public dealer inventory VDP |
| 2 | **360°:** embed URL first; frame sequence support deferred |
| 3 | **AR:** not in v1 schema (no WebXR, no Quick Look) |
| 4 | **Tour:** curated walkthrough of highlights **and** disclosed issues (nicks, blemishes, wear) |
| 5 | **Reviews:** cut from v1 (no ratings block, no review UI) |
| 6 | **Media kinds v1:** `IMAGE`, `VIDEO`, `SPIN_360` (embed), `DOORS_OPEN` only |

---

## Category field definitions

Legend: ✅ on card/detail today · ⬜ Phase 1 add

### `vehicle.core` — identity

| Field | Type | Notes |
|-------|------|-------|
| `listingId` | string | Opaque route id |
| `stockNumber` | string | Dealer stock # |
| `vin` | string | **Full VIN, public** |
| `year` | integer | |
| `make` | string | |
| `model` | string | |
| `trim` | string \| null | |
| `condition` | `NEW` \| `USED` \| `CPO` | |
| `title` | string | Platform-computed display title (fallback: `{year} {make} {model}`) |

---

### `vehicle.commerce` — price & availability

| Field | Type | Notes |
|-------|------|-------|
| `priceCents` | integer | Current ask |
| `originalPriceCents` | integer \| null | Was-price for promos |
| `priceLastChangedAt` | datetime \| null | |
| `estimatedMonthlyPaymentCents` | integer \| null | Estimate only; disclaimer in `content` |
| `availabilityStatus` | enum | e.g. `AVAILABLE`, `PENDING`, `SOLD` — platform-sourced |
| `shippingPriceCents` | integer \| null | |
| `estimatedArrival` | string \| null | Human range, e.g. `"6/13–6/20"` |
| `listedAt` | datetime | First published to marketplace |

---

### `vehicle.location` — dealer / storefront

| Field | Type | Notes |
|-------|------|-------|
| `dealerId` | string | |
| `dealerName` | string | DBA or legal |
| `dealerStoreName` | string \| null | Rooftop / store label |
| `dealerCity` | string \| null | |
| `dealerState` | string \| null | |
| `dealerZip` | string \| null | |
| `dealerPhone` | string \| null | Click-to-call on mobile |
| `dealerWebsiteUrl` | string \| null | Validated external URL |

---

### `vehicle.classification`

| Field | Type | Notes |
|-------|------|-------|
| `mileage` | integer | Odometer |
| `bodyStyle` | string \| null | e.g. `"4D Sport Utility"` |
| `vehicleType` | string \| null | e.g. `"SUVs"` — aligns with browse filters |
| `vehicleSize` | string \| null | e.g. `"Midsize"` |
| `doorCount` | integer \| null | |
| `seatCount` | integer \| null | |
| `priorUse` | string \| null | e.g. `"None"`, `"Rental"`, `"Fleet"` |

---

### `vehicle.colors` — exterior / interior

| Field | Type | Notes |
|-------|------|-------|
| `exteriorColor` | string \| null | |
| `interiorColor` | string \| null | |
| `upholsteryMaterial` | string \| null | e.g. `"Leather"`, `"Cloth"` |

---

### `vehicle.engine` — powertrain

| Field | Type | Notes |
|-------|------|-------|
| `engineSize` | string \| null | e.g. `"2.0L"` |
| `engineType` | string \| null | e.g. `"Plug-In Hybrid"` |
| `fuelType` | string \| null | Gas, diesel, electric, PHEV, etc. |
| `cylinders` | integer \| null | |
| `horsepower` | string \| null | Display string ok (`"375/5,250 RPM"`) |
| `torque` | string \| null | |
| `transmission` | string \| null | |
| `drivetrain` | string \| null | |

---

### `vehicle.efficiency`

| Field | Type | Notes |
|-------|------|-------|
| `cityMpg` | number \| null | |
| `highwayMpg` | number \| null | |
| `combinedMpg` | number \| null | |
| `mpge` | number \| null | PHEV/EV |
| `electricRangeMiles` | integer \| null | |
| `batteryCapacityKwh` | number \| null | |
| `chargingType` | string \| null | L1/L2/DCFC labels |

---

### `vehicle.conditionHistory` — trust

| Field | Type | Notes |
|-------|------|-------|
| `titleStatus` | string \| null | Clean, salvage, etc. |
| `accidentHistory` | string \| null | Platform-normalized disclosure |
| `ownersCount` | integer \| null | |
| `serviceRecordsCount` | integer \| null | |
| `openRecalls` | integer \| null | Count only in v1 |
| `inspectionCompleted` | boolean | |
| `inspectionSummaryUrl` | string \| null | Link to PDF/report |
| `frameDamageReported` | boolean | |

---

### `vehicle.features`

Grouped features — **not** three loose arrays.

```yaml
VehicleFeatures:
  required: [highlights, categories]
  properties:
    highlights:
      type: array
      items: { type: string }
      description: Top chips above fold (max ~8)
    categories:
      type: object
      required: [comfort, technology, safety, exterior, performance, utility, entertainment, other]
      properties:
        comfort:       { type: array, items: { type: string } }
        technology:    { type: array, items: { type: string } }
        safety:        { type: array, items: { type: string } }
        exterior:      { type: array, items: { type: string } }
        performance:   { type: array, items: { type: string } }
        utility:       { type: array, items: { type: string } }
        entertainment: { type: array, items: { type: string } }
        other:         { type: array, items: { type: string } }
```

Empty category arrays omitted or `[]` — UI hides empty groups.

---

### `vehicle.warranty` — protection

| Field | Type | Notes |
|-------|------|-------|
| `factoryWarrantyRemaining` | string \| null | e.g. `"3 yr / 36,000 mi"` |
| `warrantyDescription` | string \| null | |
| `certifiedProgramName` | string \| null | CPO program label when `condition=CPO` |
| `returnPolicyDays` | integer \| null | |
| `protectionPlansAvailable` | boolean | |

---

### `vehicle.media`

Media is ordered, slot-aware, and tour-capable.

#### `VehicleMedia` object

```yaml
VehicleMedia:
  required: [items]
  properties:
    items:
      type: array
      items: { $ref: '#/components/schemas/MarketplaceMediaItem' }
    tour:
      $ref: '#/components/schemas/VehicleMediaTour'
      nullable: true
```

#### `MarketplaceMediaItem` (v1)

```yaml
MarketplaceMediaItem:
  required: [id, kind, sortOrder]
  properties:
    id:          string
    kind:        enum [IMAGE, VIDEO, SPIN_360, DOORS_OPEN]
    url:         string          # image, video, or 360 embed URL
    sortOrder:   integer         # authoritative gallery order
    slot:        enum | null     # fixed mosaic slot — see slot table
    angle:       enum | null     # semantic angle for placement + alt text
    caption:     string | null
    posterUrl:   string | null   # video / 360 poster
    mimeType:    string | null
    width:       integer | null
    height:      integer | null
    durationSec: number | null   # video only
    embedUrl:    string | null   # SPIN_360 — preferred v1 delivery
```

**Not in v1:** `AR`, `spinFrames[]`, WebXR, Quick Look.

#### Fixed slots (consistent placement)

| Slot | Angle | Content |
|------|-------|---------|
| `HERO` | `EXTERIOR_FRONT_34` | Primary exterior |
| `SLOT_2` | `EXTERIOR_FRONT` | Head-on |
| `SLOT_3` | `EXTERIOR_REAR_34` | Rear angle |
| `SLOT_4` | `EXTERIOR_REAR` | Rear |
| `SLOT_5` | `EXTERIOR_SIDE` | Profile |
| `SLOT_6` | `EXTERIOR_DOORS_OPEN` | **Doors open** — reserved slot |
| `SLOT_7` | `INTERIOR_FRONT` | Front seats |
| `SLOT_8` | `INTERIOR_REAR` | Rear seats |
| `SLOT_9` | `INTERIOR_DASH` | Dashboard / tech |
| `SLOT_10` | `INTERIOR_CARGO` | Cargo |
| `OVERFLOW` | `DETAIL`, `CONDITION` | Extra photos |

Missing slot → placeholder (no reflow).

#### Gallery UX (v1)

- Mosaic grid + lightbox  
- **Zoom** on images (pinch / double-tap / wheel)  
- **Video** inline in lightbox  
- **360** via `embedUrl` in iframe or vendor widget  
- **Doors open** always in `SLOT_6` when provided  

#### `VehicleMediaTour` — guided tour

Tour is **optional**. It is a dealer-curated sequence — not just “all photos in order.”

```yaml
VehicleMediaTour:
  required: [enabled, steps]
  properties:
    enabled:  boolean
    title:    string | null    # e.g. "Walkthrough"
    steps:
      type: array
      items: { $ref: '#/components/schemas/VehicleTourStep' }

VehicleTourStep:
  required: [mediaId, label, stepType]
  properties:
    mediaId:   string              # references items[].id
    label:     string              # UI step title
    stepType:  enum [HIGHLIGHT, ISSUE, NEUTRAL]
    note:      string | null       # e.g. "Small nick on rear bumper"
    sortOrder: integer
```

| `stepType` | Use |
|------------|-----|
| `HIGHLIGHT` | Features dealer wants to emphasize (panoroof, wheels, tech) |
| `ISSUE` | Transparent disclosure — nicks, blemishes, tire wear, interior marks |
| `NEUTRAL` | Standard angle progression |

UI: **Start tour** → lightbox tour mode → **Next / Back** → progress `3 / 12` → final step CTA to inquiry.

Issues use `status-warning` styling in tour chrome — honest but not alarmist.

---

### `vehicle.content` — description, notes, legal

| Field | Type | Notes |
|-------|------|-------|
| `fullDescription` | string \| null | Main prose |
| `dealerNotes` | string \| null | Short dealer voice — optional block |
| `disclaimer` | string \| null | Price/payment disclaimers |
| `legalDisclosure` | string \| null | Statutory / marketplace legal copy |

---

### `promotion` — platform syndication context

Required on every detail API response. Treat as **operator/context data first** — not default consumer-visible VDP content. Avoid cluttering the page with “also listed on…” unless that becomes an explicit buyer feature.

Every promoted listing knows **where** and **how** it is marketed.

```yaml
MarketplaceListingPromotion:
  required: [platformListingId, channels, syndicationStatus]
  properties:
    platformListingId:
      type: string
      description: Internal promotion record id (not VIN)
    channels:
      type: array
      items: { $ref: '#/components/schemas/PromotionChannel' }
    syndicationStatus:
      type: string
      enum: [DRAFT, LIVE, PAUSED, ERROR]
    lastSyncedAt:
      type: string
      format: date-time
      nullable: true
    primaryChannelSlug:
      type: string
      nullable: true
      description: Main marketplace surface, e.g. consumer index

PromotionChannel:
  required: [slug, label, status]
  properties:
    slug:     string    # e.g. marketplace_web, facebook, cars_com
    label:    string    # Human name
    status:   enum [ACTIVE, PENDING, BLOCKED, OFF]
    liveUrl:  string | null   # Public listing URL on that channel when applicable
```

Frontend default: **do not render** `promotion.channels` on the shopper VDP. Keep typed in the client for operator tooling, analytics hooks, or future buyer-facing badges.

---

### `ctas` — actions

Keeps inquiry logic out of `vehicle.*`.

```yaml
MarketplaceVehicleCtas:
  required: [primary]
  properties:
    primary:
      type: object
      required: [action, label]
      properties:
        action:  enum [INQUIRY, PHONE, EXTERNAL_URL]
        label:   string
    secondary:
      type: array
      items:
        type: object
        properties:
          action: enum [DEALER_PAGE, DEALER_INVENTORY, EXTERNAL_URL]
          label:  string
          href:   string | null
```

Default primary: `{ action: INQUIRY, label: "Send inquiry" }`.

---

## VDP layout (unchanged intent)

- **Above fold:** `vehicle.media` mosaic + sticky panel (`vehicle.core`, `vehicle.commerce`, `vehicle.location`, `ctas.primary`)  
- **Below fold:** classification → colors → engine → efficiency → condition → features → warranty → content → `#inquiry` form  
- **Mobile:** sticky bottom bar (price + primary CTA)  
- **Tokens:** marketplace palette from design system  

---

## Migration from current API

| Today | Phase 1 |
|-------|---------|
| Flat `MarketplaceVehicleCard` on detail | Nested `MarketplaceVehicleDetail` |
| `mediaUrls` + `additionalMediaUrls` | `vehicle.media.items[]` |
| `mediaItems` with `IMAGE \| VIDEO` only | Extended kinds + slots + tour |
| No VIN on card | Full VIN in `vehicle.core` |
| No promotion block | `promotion` required |
| `fullDescription` top-level | `vehicle.content.fullDescription` |

List/card endpoint can stay lean; detail endpoint returns full nested shape.

---

## Phase 1 implementation order

1. **OpenAPI** — schemas above + `MarketplaceVehicleDetailResponse`  
2. **Promotion platform mapper** — DB/feed → nested categories + `promotion`  
3. **Marketplace query service** — assemble detail DTO  
4. **Generated client** — typed section props for React  
5. **Frontend** — one component per `vehicle.*` block; gallery v1 (slots, lightbox, zoom, embed 360, tour)  

**Explicitly not Phase 1:** AR, frame-sequence 360, reviews/ratings, scraped enrichment.

---

## Success criteria

- [ ] Detail response validates against nested schema — no wide flat vehicle object  
- [ ] Each VDP React section imports one category type only  
- [ ] Full VIN visible on VDP  
- [ ] `promotion.channels` populated for every live listing  
- [ ] Gallery slots stable by `angle`; doors-open uses `SLOT_6`  
- [ ] Tour supports `HIGHLIGHT` and `ISSUE` step types  
- [ ] 360 renders via `embedUrl`  
- [ ] No ratings/reviews UI or schema in v1  

---

## Appendix — illustrative CarMax-style fields

Reference only — our schema is promotion-platform-native and strictly categorized above.

```json
{
  "year": 2022,
  "make": "Jeep",
  "model": "Wrangler 4XE",
  "trim": "PHEV Unlimited Sahara",
  "stockNumber": "28702505",
  "vin": "1C4JJXP65NW193240",
  "price": 28998,
  "mileage": 43705
}
```

Maps to: `vehicle.core`, `vehicle.commerce`, `vehicle.classification` — not pasted flat into the API root.

---

## Next step

**Phase 1 OpenAPI PR** — add nested schemas to `openapi/openapi-marketplace.yaml`, migrate `MarketplaceVehicleDetailResponse`, regenerate `packages/marketplace-client`.
