# Business Category Schema

**Created:** 2026-06-06  
**Updated:** 2026-06-07  
**Status:** Phase 1–2 shipped; all 18 categories have rich operator schemas; platform readiness layer green; marketplace fulfillment wired  
**Related:** [2026-06-06-business-category-schema-design.md](./2026-06-06-business-category-schema-design.md) · [channel console architecture](./2026-06-06-operator-channel-console-architecture.md)

---

## Rule

**Business category belongs to the organization (`DealershipProfile`), not the operator user.**

One category per organization (Option A for v1). Operator inherits category from the selected org after pick.

---

## Prisma

```prisma
enum BusinessCategory {
  AUTOMOTIVE
  SONGS
  EBOOKS
  WATCHES
  SNEAKERS
  COLLECTIBLES
  APPAREL
  VACATION_RENTALS
  APARTMENTS
  HOMES
  COMMERCIAL_PROPERTY
  BOATS
  TRAILERS_POWERSPORTS_RV
  PAWN
  DIGITAL_ART
  HEAVY_EQUIPMENT
  FURNITURE
  VIDEO_DISTRIBUTION
}

model DealershipProfile {
  businessCategory BusinessCategory @default(AUTOMOTIVE)
  // ...
}
```

Existing orgs default to `AUTOMOTIVE`. Additive schema change via `prisma db push`.

---

## API

`GET /api/dealers` → `DealerSummary.businessCategory` (OpenAPI `BusinessCategory` enum).

Consumed by `CategoryProvider` in `apps/web` after org pick.

---

## Package: `packages/category-schemas`

```txt
Registry → resolveCategorySchema(category) → CategorySchema
```

| Path | Role |
|------|------|
| `src/types.ts` | `CategorySchema`, `BusinessCategoryId`, `FulfillmentPolicy`, field/copy types |
| `src/registry.ts` | All **18** categories registered |
| `src/resolveCategorySchema.ts` | Known enum → schema; unknown → generic fallback |
| `src/generic/` | Generic asset/channel labels + placeholder factory |
| `src/fulfillment/` | `getFulfillmentPolicy`, `getFulfillmentSummary` |
| `src/automotive/` | **Active** — vehicle copy, fields, formatters |
| `src/boats/` · `src/trailers_powersports_rv/` | **Active** — unit/boat copy, fields, formatters |
| `src/{category}/` | **Rich placeholder** — category-specific copy, fields, formatters |

### Category maturity (18 total)

| Tier | Categories | Operator UI |
|------|------------|-------------|
| **Active** | `AUTOMOTIVE`, `BOATS`, `TRAILERS_POWERSPORTS_RV` | Full fields, lifecycle copy, consumer marketplace |
| **Rich placeholder** | All other 15 categories | Category-specific columns and labels; `status: 'placeholder'`; `consumerEnabled: false` |

No registered category still uses the generic `asset` / `Ref #` shell.

### CategorySchema shape

`id` · `label` · `status` · `lifecycleMode` · `copy` · `asset` · `channel` · `fields` · `lifecycle` · `readiness` · `performance` · `formatters` · `marketplace` · `fulfillmentPolicy`

- `lifecycleMode`: `physical_inventory` or `digital_distribution`
- `fulfillmentPolicy`: allowed fulfillment modes + marketplace-safe buyer copy (all 18 categories)
- `marketplace.consumerEnabled`: `true` only for AUTOMOTIVE, BOATS, TRAILERS_POWERSPORTS_RV

---

## Operator UI (`apps/web`)

- [x] `CategoryProvider` after org pick (`App.tsx`)
- [x] Resolved schema context via `activeCategoryCopy.ts` (replaces `activeVertical`)
- [x] Inventory, import mapping, detail panel, walkthrough use `useCategorySchema()`
- [x] `PlatformsPage` filters channels by `supportedCategories.includes(categorySchema.id)`
- [ ] Move `inventoryConfig` column defs → `automotive/fields` (backlog)

---

## Platform readiness layer (`src/`)

Stub profiles and fixtures exist for every non-vehicle category. Registry size: **69** platforms (27 vehicle base + 42 non-vehicle stubs).

| Area | Key paths |
|------|-----------|
| Stub registry | `src/data/nonVehiclePlatformStubs.ts`, `nonVehiclePlatformStubDefinitions*.ts` |
| Fixtures | `src/fixtures/scenarios/nonVehicle*.ts`, `src/lib/platformFixtureRegistry.ts` |
| Payload shapes | `src/lib/nonVehicleCategoryPayload.ts` (`NON_VEHICLE_PAYLOAD_KEYS`) |
| Price policy | `src/lib/categoryPricePolicy.ts` — per-category `PRICE_SUSPICIOUS` floors |
| Readiness | `src/validators/platform/platformReadinessValidator.ts` |

Run: `npm run test:platforms` (readiness, feed artifacts, price policy, non-vehicle contract, partner portal, feed generator, consumer marketplace).

### Known platform-layer debt

- Identifier validation still uses the automotive VIN regex on the `vin` column for all categories (fixtures use alphanumeric IDs without I/O/Q).
- Feed contract tests cover the generic JSON catalog path only — not per-platform `outputFormat` artifacts.

---

## Marketplace (`apps/marketplace`)

In scope and partially shipped:

- [x] Category-driven fulfillment policy on detail views
- [x] Fail-closed availability helpers for detail and favorites
- [ ] Consumer enablement for non-vehicle categories (all 15 remain `consumerEnabled: false`)

---

## Phase 1 — done

- [x] `BusinessCategory` enum + `DealershipProfile.businessCategory` (default `AUTOMOTIVE`)
- [x] `GET /api/dealers` exposes `businessCategory`
- [x] OpenAPI + operator SDK regenerated
- [x] `packages/category-schemas` registry
- [x] Tests: enum/registry parity, resolution, API field, defaults

## Phase 2 — done

- [x] `CategoryProvider` in `apps/web` after org pick
- [x] Replace `activeVertical` with resolved schema context
- [x] Rich placeholder schemas for all 15 non-vehicle categories
- [x] Fulfillment policy on all 18 categories + `fulfillmentPolicy.test.ts`
- [x] Platform readiness contract across 69 platforms
- [ ] Move `inventoryConfig` columns → `automotive/fields` (backlog)

## Backlog

- Promote rich placeholders → `status: 'active'` per vertical rollout
- Per-platform feed generators beyond generic JSON
- Category-specific identifier validators (HIN, ISBN, MLS, etc.)
- Enable consumer marketplace per category as listings go live

## Explicitly out of scope

- Generic `Asset` model / vehicle API rename
- Multiple categories per org
