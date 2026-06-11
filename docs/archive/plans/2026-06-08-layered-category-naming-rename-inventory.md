# Layered Category Naming — Rename Inventory

**Status:** Planning (no renames executed)  
**Date:** 2026-06-08  
**ADR:** [2026-06-08-layered-category-naming-adr.md](./2026-06-08-layered-category-naming-adr.md)

Checklist of files grouped by rename safety. Target names are recommendations only — do not rename until a dedicated PR executes a group.

---

## 1. Safe now — Marketplace UI (`Vehicle` → `Listing`)

Presentation components and pages in `apps/marketplace`. API types (`MarketplaceVehicleCard`, etc.) stay until SDK migration.

| Current path | Target name | Notes |
|--------------|-------------|-------|
| [ ] `apps/marketplace/src/components/VehicleCard.tsx` | `ListingCard.tsx` | Export `ListingCard`; update importers in feed, rails, favorites |
| [ ] `apps/marketplace/src/components/ui/VehicleGrid.tsx` | `ListingGrid.tsx` | Grid wrapper for listing cards |
| [ ] `apps/marketplace/src/components/ui/VehicleImage.tsx` | `ListingImage.tsx` | Shared image + fallback component |
| [ ] `apps/marketplace/src/components/ui/VehicleGallery.tsx` | `ListingGallery.tsx` | Detail media gallery |
| [ ] `apps/marketplace/src/pages/VehicleListPage.tsx` | `ListingListPage.tsx` | Category feed / browse page |

### Importers to update (same PR as above)

| File | Change |
|------|--------|
| [ ] `apps/marketplace/src/App.tsx` | Lazy import `ListingListPage`; route handler symbol |
| [ ] `apps/marketplace/src/pages/FavoritesPage.tsx` | Import `ListingCard` |
| [ ] `apps/marketplace/src/pages/SellerDetailPage.tsx` | Import `ListingCard`, `ListingGrid` |
| [ ] `apps/marketplace/src/components/feed/FeedCards.tsx` | Import `ListingCard` |
| [ ] `apps/marketplace/src/components/listings/NewArrivalsRail.tsx` | Import `ListingCard` |
| [ ] `apps/marketplace/src/components/listings/RecentlyViewedRail.tsx` | Import `ListingCard` |
| [ ] `apps/marketplace/src/components/listings/SimilarListingsRail.tsx` | Import `ListingCard` |
| [ ] `apps/marketplace/src/components/listings/QuickDetailDrawer.tsx` | Import `ListingImage` if used |
| [ ] `apps/marketplace/src/components/vdp/gallery/VdpGalleryMosaic.tsx` | Import `ListingGallery` / `ListingImage` |
| [ ] `apps/marketplace/src/components/vdp/gallery/VdpMediaGallery.tsx` | Import `ListingGallery` |
| [ ] `apps/marketplace/src/components/vdp/gallery/VdpTourMode.tsx` | Import `ListingImage` |
| [ ] `apps/marketplace/src/components/feed/FeedCards.test.tsx` | Update imports |

---

## 2. Safe now — Operator presentation (`Vehicle` → `Asset`)

Operator inventory UI in `apps/web`. Types (`VehicleListItem`) unchanged in this pass.

| Current path | Target name | Notes |
|--------------|-------------|-------|
| [ ] `apps/web/src/components/inventory/VehicleDetailPanel.tsx` | `AssetDetailPanel.tsx` | Already uses `assetTitle`, `useCategorySchema` |
| [ ] `apps/web/src/components/inventory/VehicleRowExpand.tsx` | `AssetRowExpand.tsx` | Expandable row detail |
| [ ] `apps/web/src/components/inventory/VehicleLifecycleHistory.tsx` | `AssetLifecycleHistory.tsx` | Lifecycle applies to all physical-inventory categories |
| [ ] `apps/web/src/lib/inventoryVehicleOps.ts` | `inventoryAssetOps.ts` | Search/sort/filter orchestration |
| [ ] `apps/web/src/lib/inventoryVehicleOps.test.ts` | `inventoryAssetOps.test.ts` | Mirror source rename |

### Importers to update (same PR as above)

| File | Change |
|------|--------|
| [ ] `apps/web/src/components/inventory/InventoryAssetList.tsx` | Import `AssetDetailPanel`, `AssetRowExpand` |
| [ ] `apps/web/src/components/inventory/index.ts` | Re-export `AssetDetailPanel`, `AssetRowExpand`, `AssetLifecycleHistory` |
| [ ] `apps/web/src/pages/InventoryPage.tsx` | Import `inventoryAssetOps` symbols |
| [ ] `apps/web/src/components/inventory/InventorySortBar.tsx` | Import sort types from `inventoryAssetOps` |
| [ ] `apps/web/src/components/inventory/MovementFilterBar.tsx` | Import filter types from `inventoryAssetOps` |

---

## 3. Keep — Automotive-specific `Vehicle` files

Do not rename. Names correctly encode automotive domain logic.

### Services & validators

| Path | Reason to keep |
|------|----------------|
| `src/services/inventory/vehicleLifecycle.ts` | Automotive/physical lifecycle state machine |
| `src/services/inventory/vehicleUpdateService.ts` | Stock-level vehicle mutations |
| `src/validators/vehicle/vehiclePayloadValidator.ts` | VIN and automotive payload rules |
| `src/services/performance/vehicleAggregateJob.ts` | Per-vehicle performance aggregation |

### Tests

| Path | Reason to keep |
|------|----------------|
| `src/tests/vehicleValidator.test.ts` | Tests automotive validator |
| `src/tests/vehicleLifecycle.test.ts` | Tests lifecycle state machine |
| `src/tests/vehicleUpdateService.test.ts` | Tests vehicle update service |

### Fixtures

| Path | Reason to keep |
|------|----------------|
| `src/fixtures/vehicles/vehicles.fixture.ts` | Automotive seed data |
| `src/fixtures/vehicles/negativeVehicles.fixture.ts` | Automotive negative cases |

### Marketplace — automotive VDP sections (no `Vehicle` in filename; keep as-is)

| Path | Reason to keep |
|------|----------------|
| `apps/marketplace/src/components/vdp/EngineSection.tsx` | Automotive-only spec block |
| `apps/marketplace/src/components/vdp/EfficiencySection.tsx` | MPG / efficiency |
| `apps/marketplace/src/components/vdp/ColorsSection.tsx` | Exterior/interior automotive |
| `apps/marketplace/src/components/vdp/ClassificationSection.tsx` | Body style / drivetrain |
| `apps/marketplace/src/components/vdp/ConditionHistorySection.tsx` | Automotive condition history |
| `apps/marketplace/src/components/vdp/WarrantySection.tsx` | Automotive warranty copy |

---

## 4. Defer — Prisma, generated SDK, API routes, scripts

Do not rename without a dedicated migration ADR and contract version bump.

### Prisma schema

| Path | Notes |
|------|-------|
| `prisma/schema.prisma` | Models: `Vehicle`, `VehicleMedia`, `VehicleUpdate`, `VehicleLifecycleEvent`, `VehiclePerformanceCache` |

### OpenAPI & generated client

| Path | Notes |
|------|-------|
| `openapi/openapi.yaml` | All `Vehicle*` / `MarketplaceVehicle*` schemas and `/vehicles` paths |
| `packages/marketplace-client/generated/index.ts` | Barrel — regenerate only |
| `packages/marketplace-client/generated/services/MarketplaceService.ts` | `listVehicles`, `getVehicle`, etc. |
| `packages/marketplace-client/generated/models/MarketplaceVehicleCard.ts` | Generated |
| `packages/marketplace-client/generated/models/MarketplaceVehicleDetail.ts` | Generated |
| `packages/marketplace-client/generated/models/MarketplaceVehicleDetailResponse.ts` | Generated |
| `packages/marketplace-client/generated/models/MarketplaceVehicleListResponse.ts` | Generated |
| `packages/marketplace-client/generated/models/MarketplaceVehicleFeedItem.ts` | Generated |
| `packages/marketplace-client/generated/models/MarketplaceVehicleCtas.ts` | Generated |
| `packages/marketplace-client/generated/models/MarketplaceVehicleCtaPrimary.ts` | Generated |
| `packages/marketplace-client/generated/models/MarketplaceVehicleCtaSecondary.ts` | Generated |
| `packages/marketplace-client/generated/models/MarketplaceFavoritesResponse.ts` | References vehicle types |
| `packages/marketplace-client/generated/models/MarketplaceDealerIndexResponse.ts` | References vehicle types |
| `packages/marketplace-client/generated/models/MarketplaceFeedItem.ts` | References vehicle types |
| `packages/marketplace-client/generated/models/VehicleCore.ts` | Generated detail subsection |
| `packages/marketplace-client/generated/models/VehicleCommerce.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleLocation.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleClassification.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleColors.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleEngine.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleEfficiency.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleConditionHistory.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleFeatures.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleFeatureCategories.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleWarranty.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleMedia.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleMediaTour.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleTourStep.ts` | Generated |
| `packages/marketplace-client/generated/models/VehicleContent.ts` | Generated |

### API route handlers

| Path | Routes to keep |
|------|----------------|
| `src/server/routes/marketplace.ts` | `GET/POST /api/marketplace/vehicles`, `.../vehicles/:listingId` |
| `src/server/routes/inventory.ts` | `.../vehicles/:stockNumber/*` lifecycle mutations |
| `src/server/routes/performance.ts` | `.../performance/vehicles`, `.../performance/vehicles/:stockNumber` |
| `src/server/routes/storefront.ts` | Storefront vehicle read paths |
| `src/server/security.ts` | Allowlist entries for `/vehicles` paths |
| `src/server/requestValidation.ts` | Request schemas tied to vehicle routes |

### CLI & dev scripts

| Path | Notes |
|------|-------|
| `src/scripts/dealer/vehicleUpdate.ts` | Dealer CLI — rename with CLI ADR |
| `src/scripts/dealer/dealerCreate.ts` | References vehicle fixtures |
| `src/scripts/dealer/dealerExport.ts` | Vehicle export |
| `src/scripts/dev/demoReset.ts` | Vehicle seed references |
| `src/scripts/dev/fakeSubmitAll.ts` | Vehicle fixture imports |
| `src/scripts/dev/fakeOnboard.ts` | Vehicle fixture imports |
| `src/scripts/dev/validatePristine.ts` | Vehicle validation |
| `src/scripts/poc/pocPortalLifecycle.ts` | Vehicle fixture imports |
| `src/scripts/inventory/ingestJsonFixture.ts` | Vehicle ingest |
| `src/scripts/inventory/checkSource.ts` | Vehicle source check |
| `src/scripts/performance/computePerformance.ts` | Vehicle performance |

### `nonVehicle*` → `category*` (defer separate pass)

| Current path | Future target |
|--------------|---------------|
| `src/data/nonVehiclePlatformStubs.ts` | `categoryPlatformStubs.ts` |
| `src/data/nonVehiclePlatformStubDefinitions.ts` | `categoryPlatformStubDefinitions.ts` |
| `src/data/nonVehiclePlatformStubDefinitionsExtended.ts` | `categoryPlatformStubDefinitionsExtended.ts` |
| `src/data/nonVehiclePlatformStubDefinitionsProperty.ts` | `categoryPlatformStubDefinitionsProperty.ts` |
| `src/data/nonVehiclePlatformStubTypes.ts` | `categoryPlatformStubTypes.ts` |
| `src/lib/nonVehicleCategoryPayload.ts` | `categoryPayloadKeys.ts` |
| `src/fixtures/scenarios/nonVehicleFixtures.ts` | `categoryFixtures.ts` |
| `src/fixtures/scenarios/nonVehicleExtendedFixtures.ts` | `categoryExtendedFixtures.ts` |
| `src/fixtures/scenarios/nonVehiclePropertyFixtures.ts` | `categoryPropertyFixtures.ts` |
| `src/tests/nonVehiclePlatformContract.test.ts` | `categoryPlatformContract.test.ts` |

### Contract & boundary tests (defer with API)

| Path | Notes |
|------|-------|
| `src/tests/marketplaceContract.test.ts` | Asserts `MarketplaceVehicle*` response shapes |
| `src/tests/marketplaceRouteContract.test.ts` | Asserts `/api/marketplace/vehicles` paths |
| `src/tests/dataSafetyBoundary.test.ts` | Vehicle route security cases |
| `apps/marketplace/src/lib/marketplace-boundary.check.ts` | SDK type boundary checks |

---

## 5. Risky — Mixed generic + automotive behavior

Split or rename only with explicit design for each concern. Do not batch with group 1/2.

| Path | Issue | Recommended approach |
|------|-------|---------------------|
| `apps/marketplace/src/pages/VehicleDetailPage.tsx` | Routes non-automotive to `GenericListingDetailPage`; automotive VDP shell for cars | Split: `ListingDetailRouter.tsx` (routing) + keep automotive sections in `AutomotiveListingDetailPage.tsx` OR rename to `AutomotiveListingDetailPage.tsx` only |
| `apps/marketplace/src/lib/api.ts` | `fetchVehicle`, re-exports `MarketplaceVehicle*` + `VehicleCore` | Add `fetchListing` alias; keep SDK types until OpenAPI migration |
| `apps/marketplace/src/lib/display.ts` | `formatMileage` + generic formatters | Keep automotive formatters; extract `listingDisplay.ts` for shared |
| `apps/marketplace/src/pages/GenericListingDetailPage.tsx` | Already correct name; imports vehicle API types | No filename change; alias types internally |
| `src/services/marketplace/marketplaceQueryService.ts` | Category-aware query; Prisma `vehicle`; `VEHICLE_*_SELECT` constants | Introduce `INVENTORY_ITEM_*_SELECT` aliases; defer DB rename |
| `src/services/marketplace/marketplaceDetailMapper.ts` | Maps DB vehicle → `MarketplaceVehicleDetailResponse` | Alias `DbInventoryItemRow`; keep mapper name until API migration |
| `src/services/marketplace/marketplaceFavoriteService.ts` | Favorites over vehicle IDs | Facade rename after API |
| `src/services/marketplace/marketplaceSitesService.ts` | Multi-category sites | Low priority |
| `src/services/inventory/inventoryUpdateService.ts` | Generic updates; `VehiclePayload` throughout | `InventoryItem` alias first |
| `src/services/inventory/inventoryListService.ts` | List for all categories | `InventoryItem` alias first |
| `src/services/inventory/inventorySnapshotService.ts` | Snapshots all inventory | `InventoryItem` alias first |
| `src/services/inventory/importService.ts` | Category-aware ingest | Split automotive vs generic paths |
| `src/services/inventory/lifecycleEventService.ts` | Events for all physical inventory | Consider `inventoryLifecycleEventService` |
| `src/services/inventory/mediaValidationService.ts` | Builds `/vehicles/{stock}` URLs | URL defer; rename internal helpers |
| `src/services/inventory/salesStatusReconcileService.ts` | Cross-category reconcile | `InventoryItem` alias |
| `src/services/publishing/feedGeneratorService.ts` | `generateMarketplaceListingJson(vehicles)` | Rename param to `items`; keep function |
| `src/services/publishing/prepareAndPublishService.ts` | `VehicleReadiness`, `classifyVehicleReadiness` | `AssetReadiness` for generic readiness |
| `src/services/publishing/lifecyclePersistenceService.ts` | Mixed lifecycle | Review with lifecycle ADR |
| `src/services/storefront/storefrontQueryService.ts` | Public listing projection | `StorefrontListing` already used — align internals |
| `src/services/performance/performanceQueryService.ts` | `VehiclePerformanceItem` types | Defer with performance API |
| `src/services/performance/performanceAggregator.ts` | Vehicle counts in aggregates | Defer |
| `src/lib/types.ts` | `VehiclePayload`, `VehicleListItem`, `VehiclePerformanceItem` | Add `InventoryItem` aliases; defer type renames |
| `apps/web/src/lib/types.ts` | `VehicleListItem`, `VehicleIssue`, etc. | Add `AssetListItem` alias optional; prefer `InventoryItem` |
| `apps/web/src/components/inventory/inventoryConfig.tsx` | `vehicleReadinessRowBg`, mixed column defs | Extract schema-driven columns; rename symbols incrementally |
| `apps/web/src/lib/lifecycleDisplay.ts` | Generic lifecycle copy | Already category-agnostic — no filename change |
| `apps/web/src/lib/movementBenchmark.ts` | References `VehicleListItem` | Alias type import |
| `apps/web/src/lib/reportPresentation.ts` | Report rows for all assets | Uses vehicle types — alias first |
| `apps/web/src/lib/reportRowPresentation.ts` | Same | Alias first |
| `apps/web/src/lib/marketplacePreview.ts` | Preview card for operator | `AssetPreview` naming |
| `apps/web/src/lib/api/sdk.ts` | Generated operator SDK vehicle endpoints | Defer with OpenAPI |
| `apps/web/src/lib/statusRegistry.ts` | Mixed readiness/movement labels | Symbol audit |
| `src/validators/platform/platformReadinessValidator.ts` | Validates all categories via `VehiclePayload` | `InventoryItem` param alias |
| `src/validators/platform/platformValidator.ts` | Same | Alias first |
| `src/data/platformProfiles.ts` | `vehiclesListed` metrics | Defer with performance naming |
| `src/data/mockPortalResponses.ts` | Mock vehicle responses | Fixture scope |

### Optional alias files to add (no renames)

| New path | Purpose |
|----------|---------|
| `src/lib/inventoryTypes.ts` | `export type InventoryItem = VehiclePayload` |
| `apps/web/src/lib/inventoryTypes.ts` | `export type InventoryItem = VehicleListItem` |

---

## Suggested PR sequence

1. **PR-A** — Group 1 marketplace component renames + importer updates (5 files + tests).
2. **PR-B** — Group 2 operator presentation renames (5 files + importers).
3. **PR-C** — Add `InventoryItem` alias files; adopt in one category-agnostic service as pattern.
4. **PR-D** — Split `VehicleDetailPage.tsx` (group 5) when boats consumer marketplace ships.
5. **Future** — Group 4 migration ADR (Prisma + OpenAPI + SDK + routes).
