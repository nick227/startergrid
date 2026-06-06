# Marketplace Vehicle Detail Page (VDP) — Design Proposal

**Created:** 2026-06-06  
**Updated:** 2026-06-06  
**Status:** Proposal — design approval before implementation  
**Route:** `#/vehicle/{listingId}` · `apps/marketplace/src/pages/VehicleDetailPage.tsx`  
**References:** CarMax-style VDP layout; CarMax-style field richness (example JSON below — illustrative, not exhaustive)

Related: [2026-06-06-ui-design-system-design.md](./2026-06-06-ui-design-system-design.md)

---

## Purpose

Define the **content model**, **media system**, and **page layout** for the marketplace vehicle detail page.

Priorities:

1. **Structured vehicle data by category** — not a flat blob; each section maps to UI blocks  
2. **Deterministic media placement** — same angle → same gallery slot on every listing  
3. **Rich gallery** — photos, video, 360° spin, doors-open views, pinch/zoom, optional **guided tour** (click Next)  
4. **Photo-forward layout** with improved CTA placement (sticky purchase panel + mobile bar)  
5. **Company palette** — bright showroom, blue primary CTAs  

---

## Content fields by category

Fields are grouped for API schema, operator ingest, and VDP section rendering.  
**Legend:** ✅ in API today · 🔶 partial · ⬜ proposed  

### 1. Identity

Core listing identity — always shown in purchase panel header.

| Field | Type | Status | VDP use |
|-------|------|--------|---------|
| `listingId` | string | ✅ | Route key (opaque; not VIN) |
| `stockNumber` | string | ✅ | Purchase panel meta (mono) |
| `year` | integer | ✅ | Title |
| `make` | string | ✅ | Title, breadcrumbs |
| `model` | string | ✅ | Title |
| `trim` | string \| null | ✅ | Subtitle |
| `condition` | `NEW` \| `USED` \| `CPO` | ✅ | Badge |
| `vin` | string | ⬜ | **Policy decision:** marketplace is consumer-safe today (no VIN). If added: last-6 mask only or dealer-only toggle |

**Example (CarMax):** `year`, `make`, `model`, `trim`, `stockNumber`, `vin`

---

### 2. Pricing & commerce

| Field | Type | Status | VDP use |
|-------|------|--------|---------|
| `priceCents` | integer | ✅ | Hero price |
| `listedAt` | datetime | ✅ | “Listed” meta |
| `listingUrl` | string | ✅ | Canonical share (future) |
| `shippingPriceCents` | integer \| null | ⬜ | Availability card |
| `estimatedArrival` | string \| null | ⬜ | e.g. `"6/13–6/20"` — availability card |
| `priorUse` | string \| null | ⬜ | e.g. `"None"`, `"Rental"`, `"Fleet"` — specs row |

**Example:** `price`, `availability.shippingPrice`, `availability.estimatedArrival`, `priorUse`

---

### 3. Location & dealer

| Field | Type | Status | VDP use |
|-------|------|--------|---------|
| `dealerId` | string | ✅ | Links |
| `dealerName` | string | ✅ | Panel + dealer block |
| `dealerCity` | string \| null | ✅ | Location line |
| `dealerState` | string \| null | ✅ | Location line |
| `dealerStoreName` | string \| null | ⬜ | e.g. `"CarMax Texas Stadium"` — subtitle under city/state |
| `websiteUrl` | string \| null | 🔶 | Dealer block (dealer index) |

**Example:** `location.city`, `location.state`, `location.store`

---

### 4. Classification & body

| Field | Type | Status | VDP use |
|-------|------|--------|---------|
| `bodyStyle` | string \| null | ⬜ | e.g. `"4D Sport Utility"` — quick specs |
| `vehicleSize` | string \| null | ⬜ | e.g. `"Midsize"` |
| `vehicleType` | string \| null | ⬜ | e.g. `"SUVs"` — breadcrumb / filters alignment |
| `mileage` | integer | ✅ | Quick specs + panel |

**Example:** `body`, `vehicleSize`, `vehicleType`

---

### 5. Colors

| Field | Type | Status | VDP use |
|-------|------|--------|---------|
| `exteriorColor` | string \| null | ✅ | Quick specs + overview grid |
| `interiorColor` | string \| null | ⬜ | Overview grid |

**Example:** `colors.exterior`, `colors.interior`

---

### 6. Engine & drivetrain

Nested object — overview grid + optional “Engine” section.

| Field | Type | Status | VDP use |
|-------|------|--------|---------|
| `engine.size` | string \| null | ⬜ | e.g. `"2.0L"` |
| `engine.type` | string \| null | ⬜ | e.g. `"Plug-In Hybrid"` |
| `engine.cylinders` | integer \| null | ⬜ | |
| `engine.horsepower` | string \| null | ⬜ | e.g. `"375/5,250 RPM"` |
| `engine.torque` | string \| null | ⬜ | |
| `engine.transmission` | string \| null | ⬜ | |
| `engine.drivetrain` | string \| null | ⬜ | e.g. `"Four Wheel Drive"` |

**Example:** full `engine` object from CarMax sample

---

### 7. Features

Three tiers — different UI treatment.

| Field | Type | Status | VDP use |
|-------|------|--------|---------|
| `keyFeatures` | string[] | ⬜ | **Highlights row** — chips above fold (max 6–8) |
| `highlights` | string[] | ⬜ | **Marketing tags** — e.g. `"Advanced Features"` badge strip |
| `allFeatures` | string[] | ⬜ | **Features section** — searchable checklist / grouped list |
| `fullDescription` | string \| null | ✅ | Description prose block |

**Example:** `keyFeatures`, `highlights`, `allFeatures`

---

### 8. Ratings & reviews

| Field | Type | Status | VDP use |
|-------|------|--------|---------|
| `ratings.averageRating` | number \| null | ⬜ | Stars + score |
| `ratings.reviewCount` | integer | ⬜ | `"4 reviews"` |
| `reviews[]` | object[] | ⬜ | **Future phase** — individual review cards |

**Example:** `ratings.averageRating`, `ratings.reviewCount`

---

### 9. Media (gallery system)

**Most important category for this proposal.**  
Today: flat `mediaUrls[]` + `additionalMediaUrls[]` + `mediaItems[]` with `kind: IMAGE | VIDEO` only.

#### 9.1 Design principles

| Principle | Rule |
|-----------|------|
| **Order matters** | `sortOrder` is authoritative; UI never re-sorts by URL or upload time |
| **Slot placement** | Each exterior/interior **angle** maps to a **fixed mosaic slot** on desktop |
| **Missing angle** | Slot shows branded placeholder or collapses — never shift other photos |
| **Mixed media types** | Image, video, 360°, doors-open, AR share one ordered `media[]` array |
| **Guided tour** | Subset of `media[]` with `tourLabel` — same order as gallery unless `tourOnly` |

#### 9.2 Proposed `MarketplaceMediaItem` (extended)

```yaml
MarketplaceMediaItem:
  required: [id, kind, url, sortOrder]
  properties:
    id:           string          # stable within listing
    kind:         enum            # see below
    url:          string          # image, video, 360 manifest, or AR scene URL
    sortOrder:    integer         # global gallery order (0 = hero)
    slot:         enum | null     # fixed mosaic slot — see slot table
    angle:        enum | null     # semantic angle — drives slot + alt text + tour
    tourLabel:    string | null   # guided tour step title, e.g. "Dashboard & tech"
    tourOrder:    integer | null  # order within guided tour (may differ from sortOrder)
    caption:      string | null   # accessibility + tour narration hook
    posterUrl:    string | null   # video / 360 poster
    mimeType:     string | null
    width:        integer | null
    height:       integer | null
    # 360-specific
    spinFrames:   string[] | null # ordered frame URLs, or null if url is embed
    spinFrameCount: integer | null
    # Video-specific
    durationSec:  number | null
    # AR-specific (phase 2)
    arModelUrl:   string | null
    arUsdzUrl:    string | null   # iOS Quick Look
```

**`kind` enum (proposed):**

| Kind | Description | Gallery behavior |
|------|-------------|------------------|
| `IMAGE` | Standard photo | Mosaic slot + lightbox + zoom |
| `VIDEO` | MP4 / HLS walkaround | Slot shows poster + play; lightbox inline player |
| `SPIN_360` | Exterior 360° | Slot shows spin icon; lightbox drag-to-rotate or frame scrubber |
| `DOORS_OPEN` | Doors-open exterior (tagged image or short clip) | **Dedicated slot** — never reuse closed profile slot |
| `AR` | AR placement / interior preview | Slot badge “View in AR”; launches AR viewer (WebXR / Quick Look) |
| `DETAIL` | Condition / wear close-up | Detail strip or overflow grid, not hero slots |

**`angle` enum (proposed — drives consistency):**

| Angle | Default slot | Tour label (default) |
|-------|--------------|----------------------|
| `EXTERIOR_FRONT_34` | HERO | Exterior — front angle |
| `EXTERIOR_FRONT` | SLOT_2 | Front view |
| `EXTERIOR_REAR_34` | SLOT_3 | Rear angle |
| `EXTERIOR_REAR` | SLOT_4 | Rear view |
| `EXTERIOR_SIDE` | SLOT_5 | Side profile |
| `EXTERIOR_DOORS_OPEN` | SLOT_6 | Doors open |
| `INTERIOR_FRONT` | SLOT_7 | Front seats |
| `INTERIOR_REAR` | SLOT_8 | Rear seats |
| `INTERIOR_DASH` | SLOT_9 | Dashboard & controls |
| `INTERIOR_CARGO` | SLOT_10 | Cargo area |
| `WHEEL_DETAIL` | OVERFLOW | Wheels & tires |
| `CONDITION_DETAIL` | OVERFLOW | Condition details |

Operator ingest / DMS mapping must assign `angle` + `sortOrder`. UI renders by **slot first**, then **sortOrder** within overflow.

#### 9.3 Desktop mosaic slot map

Fixed layout — CarMax-inspired hero + 2×2 grid:

```
┌─────────────────────┬────────┬────────┐
│                     │ SLOT_2 │ SLOT_3 │
│  HERO               │ front  │ rear   │
│  EXTERIOR_FRONT_34  ├────────┼────────┤
│  (image/video/360)  │ SLOT_4 │ SLOT_5 │
│                     │ rear   │ side   │
└─────────────────────┴────────┴────────┘
  [360°] [Video] [Doors open] [View all · Guided tour]
```

- **HERO** accepts `IMAGE`, `VIDEO` (autoplay muted poster), or `SPIN_360` preview  
- **SLOT_6 (doors open)** reserved — if missing, show placeholder “Doors open photo not available”  
- **360 / video entry chips** below mosaic when `kind` present anywhere in `media[]`  
- **Overflow** (`sortOrder` > hero grid): horizontal strip or “+N more” → lightbox  

#### 9.4 Gallery interactions

| Capability | Behavior |
|------------|----------|
| **Lightbox** | Full-screen viewer for all kinds; unified Next/Previous |
| **Zoom** | Pinch + double-tap on images; scroll-wheel on desktop; max 3×; pan when zoomed |
| **360° spin** | Drag horizontal to rotate; optional frame dots; respects `prefers-reduced-motion` → static front frame |
| **Video** | Native `<video controls>` in lightbox; poster in grid; no autoplay with sound |
| **Doors open** | Always labeled; tour step when present |
| **AR** | Launch from badge; fallback link if device unsupported |
| **Guided tour** | Button **“Start tour”** → lightbox tour mode: labeled steps, **Next / Back / Exit tour**, progress `2 / 8` |

**Guided tour rules:**

- Steps = `media.filter(m => m.tourOrder != null).sort(tourOrder)`  
- If no `tourOrder` on any item, auto-generate from first N angles in canonical angle order  
- Each step shows `tourLabel` + optional one-line `caption`  
- **Next** advances step; at end, **Send inquiry** CTA inline in lightbox footer  
- Keyboard: `ArrowRight` = next, `ArrowLeft` = back, `Escape` = exit tour  

#### 9.5 API surface (detail response)

Proposed `MarketplaceVehicleDetailResponse` shape:

```yaml
vehicle: MarketplaceVehicleCard        # extended with new spec fields
media: MarketplaceMediaItem[]        # full ordered list — replaces mediaUrls/additional split
guidedTour:
  enabled: boolean
  stepCount: integer
fullDescription: string | null
keyFeatures: string[]
highlights: string[]
allFeatures: string[]
engine: EngineSpec | null
colors: { exterior, interior } | null
classification: { bodyStyle, vehicleSize, vehicleType, priorUse } | null
availability: { shippingPriceCents, estimatedArrival } | null
ratings: { averageRating, reviewCount } | null
```

**Migration:** deprecate `mediaUrls` / `additionalMediaUrls` on detail endpoint once `media[]` ships; keep on list cards for backward compatibility during transition.

**Today (gap):** `mediaItems[]` has `IMAGE | VIDEO` only, no `angle`, `slot`, or tour fields. Detail page ignores `mediaItems` and concatenates URL arrays.

---

### 10. Narrative & legal

| Field | Type | Status | VDP use |
|-------|------|--------|---------|
| `fullDescription` | string \| null | ✅ | Description section |
| `disclaimer` | string \| null | ⬜ | Footer fine print |
| `notice` | feed notice | 🔶 | Banner if active promo |

---

## Page layout (summary)

Layout unchanged in intent; **content sections bind to categories above.**

### Above fold

| UI block | Data categories |
|----------|-----------------|
| Media mosaic + tour entry | **§9 Media** |
| Sticky purchase panel | **§1 Identity**, **§2 Pricing**, **§3 Location**, CTAs |

### Below fold (recommended order)

| # | Section | Categories |
|---|---------|------------|
| 1 | Quick specs icon row | §4 Classification, §5 Colors, §2 mileage/condition |
| 2 | Key features chips | §7 `keyFeatures` |
| 3 | Highlights badges | §7 `highlights` |
| 4 | Engine & drivetrain grid | §6 `engine` |
| 5 | Full features list | §7 `allFeatures` |
| 6 | Description | §10 `fullDescription` |
| 7 | Ratings summary | §8 (when present) |
| 8 | Dealer card | §3 |
| 9 | Inquiry form `#inquiry` | Lead API |

### CTA placement

| Placement | Action |
|-----------|--------|
| Desktop sticky panel | **Send inquiry** (primary `mp-btn-primary`) |
| Mobile sticky bottom bar | Price + **Send inquiry** |
| Guided tour final step | **Send inquiry** secondary prompt |
| Scroll target | Single `#inquiry` form — no duplicate forms |

---

## Visual design

Marketplace tokens from company palette — see design system doc.

| Element | Token |
|---------|--------|
| Page | `bg-surface-page-bright` |
| Cards | `surface-card-marketplace` |
| Price | `text-ink text-3xl font-bold tabular-nums` |
| Primary CTA | `mp-btn-primary` (`bg-cta`) |
| Gallery active border | `border-cta` |
| Tour progress | `bg-cta-light` bar, `text-navy-700` labels |
| 360 / video badges | `bg-navy-900/80 text-white` pills on thumbnails |

---

## Field coverage matrix (today vs target)

| Category | Today | Target VDP |
|----------|-------|------------|
| Identity | ✅ core | + optional masked VIN policy |
| Pricing | ✅ price | + shipping/arrival |
| Location | ✅ city/state | + store name |
| Classification | 🔶 mileage/condition | + body/size/type/priorUse |
| Colors | 🔶 exterior only | + interior |
| Engine | ⬜ | full grid |
| Features | ⬜ | key + highlights + all |
| Ratings | ⬜ | summary block |
| Media | 🔶 flat URLs, IMAGE/VIDEO | slots, angles, 360, doors, zoom, tour |
| Description | ✅ | unchanged |

---

## Implementation phases

### Phase 1 — API & ingest model (backend + OpenAPI)

- Extend `MarketplaceMediaItem` (`angle`, `slot`, `sortOrder`, `kind` expansions)  
- Add spec objects: `engine`, `colors`, `classification`, `features`, `availability`, `ratings`  
- Detail endpoint returns unified `media[]` + `guidedTour` metadata  
- Operator ingest: document angle/slot mapping for photo vendors  

### Phase 2 — Gallery core (frontend)

- Slot-based mosaic renderer (fixed positions, placeholders)  
- `PhotoLightbox` with zoom, video player, 360 scrubber  
- Migrate off `mediaUrls` concatenation → `mediaItems`  

### Phase 3 — Guided tour + rich kinds

- Tour mode in lightbox (Next/Back, labels, progress)  
- `DOORS_OPEN`, `SPIN_360` UX polish  
- Tour completion → inquiry CTA  

### Phase 4 — Page layout + content sections

- Purchase panel, sticky mobile bar  
- Render all content categories below fold  
- Token cleanup  

### Phase 5 — AR (optional)

- `AR` kind + WebXR / USDZ Quick Look  
- Device capability detection + graceful fallback  

---

## Accessibility

- Alt text template: `{year} {make} {model} — {tourLabel or angle label}`  
- 360: keyboard alternative (frame slider + left/right arrows)  
- Video: captions track when `captionUrl` provided (future field)  
- Tour: announce step changes via `aria-live="polite"`  
- Zoom: does not trap focus; reset zoom on lightbox close  
- Reduced motion: disable spin auto-rotate and smooth zoom  

---

## Success criteria

- [ ] Same `angle` always renders in same mosaic slot across listings  
- [ ] Missing angle shows placeholder — no slot shifting  
- [ ] 360°, video, doors-open, and images share one ordered gallery + lightbox  
- [ ] Pinch/zoom on photos in lightbox  
- [ ] Guided tour: click Next through labeled steps; ends with inquiry path  
- [ ] VDP sections render from categorized fields (not hard-coded flat props)  
- [ ] Consumer-safe: no raw VIN unless explicit product approval  

---

## Open decisions

1. **VIN on marketplace** — exclude (current policy) vs last-6 vs full?  
2. **360 delivery** — image sequence vs third-party embed URL?  
3. **AR scope** — WebXR only vs iOS Quick Look vs both?  
4. **Auto tour** — when dealer omits `tourOrder`, use canonical angle sequence (recommended: yes)  
5. **Reviews** — aggregate rating only in v1, or block until moderation pipeline exists?  

---

## Appendix — CarMax example (illustrative field reference)

Not exhaustive. Used to stress-test categories above.

```json
{
  "year": 2022,
  "make": "Jeep",
  "model": "Wrangler 4XE",
  "trim": "PHEV Unlimited Sahara",
  "price": 28998,
  "mileage": 43705,
  "stockNumber": "28702505",
  "vin": "1C4JJXP65NW193240",
  "location": { "city": "Irving", "state": "Texas", "store": "CarMax Texas Stadium" },
  "availability": { "shippingPrice": 449, "estimatedArrival": "6/13-6/20" },
  "body": "4D Sport Utility",
  "vehicleSize": "Midsize",
  "vehicleType": "SUVs",
  "priorUse": "None",
  "colors": { "exterior": "Red", "interior": "Black" },
  "engine": {
    "size": "2.0L",
    "type": "Plug-In Hybrid",
    "torque": "470/3,000 RPM",
    "horsepower": "375/5,250 RPM",
    "cylinders": 4,
    "drivetrain": "Four Wheel Drive",
    "transmission": "Automatic"
  },
  "keyFeatures": ["4WD/AWD", "Turbo Charged Engine", "Leather Seats", "..."],
  "highlights": ["Advanced Features"],
  "allFeatures": ["Hard Top", "Apple CarPlay", "..."],
  "ratings": { "averageRating": 1.25, "reviewCount": 4 }
}
```

**Media not in example but required by this proposal:** ordered `media[]` with `angle`, `slot`, `kind` (`IMAGE`, `VIDEO`, `SPIN_360`, `DOORS_OPEN`, `AR`), plus optional `tourLabel` / `tourOrder` for guided tour.

---

## Next step

Review category completeness and media slot/tour model. After approval:

1. OpenAPI + ingest spec (Phase 1)  
2. Gallery + lightbox (Phase 2) before long-form spec sections (Phase 4)  
