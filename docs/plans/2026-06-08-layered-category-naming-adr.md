# ADR: Layered Category Naming

**Status:** Accepted  
**Date:** 2026-06-08  
**Related:** [business-category-schema.md](./business-category-schema.md) · [2026-06-08-layered-category-naming-rename-inventory.md](./2026-06-08-layered-category-naming-rename-inventory.md)

---

## Context

The platform is being retrofitted from an automotive-first POC to support 18 business categories (boats, sneakers, vacation rentals, etc.). Category-specific copy, fields, and fulfillment are driven by `packages/category-schemas` and `DealershipProfile.businessCategory`.

Meanwhile, the persistence layer, OpenAPI contract, generated SDK, CLI scripts, and hundreds of symbols still use **Vehicle** naming from the original dealer-inventory model. Newer work has introduced partial alternatives:

- **asset** — operator UI labels and presentation (`InventoryAssetList`, `inventoryAssetPresentation`, `CategoryAssetLabels`)
- **listing** — consumer marketplace routes and engagement (`GenericListingDetailPage`, `listingId`, `#/{slug}/listing/{id}`)

A full rename of `Vehicle` → `Product` (or any single universal noun) would be expensive, risky, and semantically wrong for several categories (real estate uses *listing*, boats use *unit*, digital goods use *title*, etc.). The team needs a stable vocabulary contract so new code is consistent and old code is migrated incrementally without blocking category rollout.

---

## Decision

Adopt **layered naming by boundary responsibility**. Code names reflect which layer owns the concept, not which business category is active.

| Layer | Noun | Scope |
|-------|------|--------|
| Persistence / API | **Vehicle** (unchanged for now) | Prisma `Vehicle`, `/api/.../vehicles` routes, OpenAPI schemas, generated SDK |
| Operator UI & category-agnostic orchestration | **Asset** | Components, copy slots, list/detail panels, cross-category services |
| Consumer marketplace UI | **Listing** | Pages, cards, grids, images, engagement rails, hash routes |
| Automotive-specific domain logic | **Vehicle** | VIN validation, mileage/engine/efficiency, automotive lifecycle semantics |
| Type aliases (optional) | **InventoryItem** | Thin aliases over `VehiclePayload` / `VehicleListItem` where category-agnostic code needs a neutral import |

**Explicit non-decisions:**

- Do **not** use **Product** as the universal noun.
- Do **not** rename Prisma models, API paths, or generated client types until a dedicated migration ADR.
- Do **not** rename automotive-specific files merely because they contain `Vehicle` in the name.

---

## Vocabulary table

| Term | Use when | Do not use when |
|------|----------|-----------------|
| **Vehicle** | Prisma/API stable identifiers; VIN/mileage/automotive VDP sections; automotive validators and aggregate jobs | Generic marketplace card component; operator row that serves all categories |
| **Asset** | Operator inventory UI; schema-driven labels (`useCategorySchema().asset`); category-agnostic list/filter/sort orchestration | Consumer-facing pages; DB table names |
| **Listing** | Marketplace browse/detail/favorites/compare; public `listingId`; engagement and share flows | Operator console; internal inventory mutations |
| **InventoryItem** | New shared types aliasing existing vehicle payloads in category-agnostic services | Replacing `Vehicle` in OpenAPI or Prisma without migration |
| **Product** | — | Any new code (reserved for a future e-commerce SKU model if ever needed) |

---

## Examples

### Correct

```tsx
// Operator — asset + schema labels
function AssetDetailPanel({ asset }: { asset: VehicleListItem }) {
  const { asset: labels } = useCategorySchema();
  return <h2>{labels.titleLabel}: {assetTitle(asset)}</h2>;
}
```

```tsx
// Marketplace — listing presentation, vehicle API types underneath
function ListingCard({ listing }: { listing: MarketplaceVehicleCard }) {
  return <ListingImage src={listing.mediaUrls[0]} alt={listing.title} />;
}
```

```ts
// Category-agnostic service — alias at the boundary
import type { VehiclePayload as InventoryItem } from '@/lib/types';

export function filterEligibleItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter((i) => (i.priceCents ?? 0) > 0);
}
```

```ts
// Automotive-only — keep Vehicle
export function validateVinFormat(vin: string): boolean { /* ... */ }
```

### Incorrect

```tsx
// Wrong layer — Product in marketplace UI
function ProductCard({ product }: { product: MarketplaceVehicleCard }) { /* ... */ }

// Wrong layer — Vehicle in generic operator list component filename
// VehicleDetailPanel.tsx  →  use AssetDetailPanel.tsx

// Wrong abstraction — renaming Prisma without migration plan
model Product { /* was Vehicle */ }
```

---

## What to rename now

Low-risk, presentation-layer renames that align filenames with layer responsibility:

1. **Marketplace UI** — `VehicleCard` → `ListingCard`, `VehicleImage` → `ListingImage`, `VehicleGrid` → `ListingGrid`, `VehicleGallery` → `ListingGallery`, `VehicleListPage` → `ListingListPage`.
2. **Operator UI** — `VehicleDetailPanel` → `AssetDetailPanel`, `VehicleRowExpand` → `AssetRowExpand`, `inventoryVehicleOps` → `inventoryAssetOps`, `VehicleLifecycleHistory` → `AssetLifecycleHistory`.

See [rename inventory](./2026-06-08-layered-category-naming-rename-inventory.md) for the full checklist.

**URL note:** Consumer hash routes already use `/listing/{id}`. API paths remain `/api/marketplace/vehicles` until a future migration. Do not change public API routes in presentation-only rename PRs.

---

## What to defer

| Area | Reason |
|------|--------|
| Prisma `Vehicle`, `VehicleMedia`, `VehicleUpdate`, `VehicleLifecycleEvent`, `VehiclePerformanceCache` | Requires migration, downtime planning, data backfill |
| OpenAPI `MarketplaceVehicle*` / `VehicleCore` schemas | Partner contract; regenerate SDK |
| `packages/marketplace-client/generated/**` | Generated from OpenAPI — never hand-rename |
| `/api/dealers/.../vehicles/...` and `/api/marketplace/vehicles/...` | External consumers, security allowlists, contract tests |
| CLI scripts (`vehicleUpdate.ts`, dealer create flows) | Operator muscle memory; rename with CLI ADR |
| `nonVehicle*` file prefixes | Rename to `category*` in a dedicated pass after vocabulary is stable |
| `VehicleDetailPage.tsx` (marketplace) | Mixed routing shell + automotive VDP — split or rename with care |
| Shared types (`VehiclePayload`, `VehicleListItem`) | Alias to `InventoryItem` first; rename types when API migrates |

---

## PR review rule

When reviewing a PR that touches inventory or marketplace code:

1. **Check the layer.** UI in `apps/marketplace` should say **Listing** in new component/file names. UI in `apps/web` inventory should say **Asset** for category-agnostic presentation. Backend persistence may still say **Vehicle**.
2. **Reject `Product`** as a new universal noun in filenames, types, or components.
3. **Allow `Vehicle`** in automotive-specific logic (VIN, mileage, engine, efficiency, automotive lifecycle) even if the org category is not automotive — the code is domain-specific, not org-specific.
4. **Reject new `Vehicle*` names** in generic marketplace or operator presentation code. Suggest `Listing*` or `Asset*` instead.
5. **Do not require** Prisma/API/SDK renames in presentation-only PRs.
6. **Prefer aliases** (`InventoryItem = VehiclePayload`) over drive-by type renames in services that touch multiple categories.
7. **User-visible copy** must come from `useCategorySchema()` (`asset.singular`, `asset.plural`), not hard-coded "vehicle" strings in shared components.

---

## Consequences

### Positive

- New engineers learn one rule: **layer → noun**.
- Category rollout does not block on a monolithic rename.
- Automotive domain code stays precise; generic UI becomes honest about scope.
- Aligns with shipped patterns (`InventoryAssetList`, `GenericListingDetailPage`, `#/listing/:id`).

### Negative

- Temporary dual vocabulary (`Vehicle` in API, `Listing` in UI) until explicit API migration.
- Requires discipline in PR review to prevent drift.
- Some files remain in the "risky / mixed" bucket until split.

### Follow-up

- Execute [rename inventory](./2026-06-08-layered-category-naming-rename-inventory.md) in small PRs (marketplace first, then operator).
- Add `InventoryItem` type aliases in `src/lib/types.ts` and `apps/web/src/lib/types.ts` when a service needs them.
- Future ADR: `Vehicle` → `InventoryItem` at Prisma/API layer when a second category shares the same table in production.
