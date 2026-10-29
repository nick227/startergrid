# DealerGrid multi-entity POC — Phase 1

## Outcome and boundaries

Automotive has the established operational journey. Boats share its persisted Vehicle journey, with HIN/hours presentation and category payload adapters; local public-detail and inquiry-service checks pass. None of the other three requested physical retail categories currently has a complete public-to-operator journey. A schema label or a successful database insert is not evidence of that journey.

No application routes, UI, category registries, schemas, paid integrations, or splash files were changed. The layered naming ADR remains authoritative: Vehicle at the existing persistence/API boundary, Asset in Operator, Listing in Marketplace. Fixture inputs are not a capability registry.

## Architecture audit

- `packages/category-schemas/src/registry.ts` owns business category configuration. `inventory/registry.ts` separately owns established category-item inventory contracts: AUTOMOTIVE, EBOOKS, SONGS, DIGITAL_ART, VIDEO_DISTRIBUTION. There is no physical BOOKS or RECORDS category. Do not add one in a fixture registry.
- `prisma/schema.prisma`: Vehicle has mandatory year/make/model/mileage/vin and categoryPayload. CategoryInventoryItem has categoryId, primaryIdentifier, JSON data, media, and MarketplaceListing relations. These are existing storage paths, not interchangeable abstractions.
- `apps/web/src/pages/InventoryPage.tsx` selects Vehicle-backed inventory for `physical_inventory`, otherwise CategoryItemsBrowse. `src/server/routes/inventory.ts` exposes both existing inventory paths. Category-item shell creation and `inventoryRecordAdapter.ts` handle category data; readiness derives from the inventory schema.
- BOATS maps HIN to `vin`, hours to `mileage`, and vesselType to categoryPayload. APPAREL maps brand/style/size/color to make/model/trim/exteriorColor, but is a placeholder with Marketplace disabled. Apparel still inherits mandatory automotive storage fields; fixture year is garment era and mileage is zero, not a supported apparel usage metric.
- EBOOKS supports ISBN in data, but its primary identifier is SKU/Work ID and its only condition is DIGITAL. It models publishing, including print-distribution metadata, not used physical bookstore stock. SONGS similarly models digital releases; vinyl/CD condition, physical editions and stock need an explicit contract.
- `marketplace/helpers.ts` and each category's `marketplace.consumerEnabled` control public vehicle routes. AUTOMOTIVE, BOATS and EBOOKS are enabled; SONGS and APPAREL are disabled. `marketplaceQueryService.ts` requires READY, positive price, unsold/unremoved records and an ACTIVE first-party listing. Vehicle channel opt-out is also respected.
- `server/routes/marketplaceListings.ts`, `MarketplaceListingStore.ts`, and `bridges/ConsumerMarketplaceBridge.ts` already support first-party category-item publication without OAuth. Category-item list/detail API shaping exists, but is book-shaped (title/author/format). The current Marketplace frontend calls the vehicle listing API; no category-item API integration was found in its source. Seller index/storefront inventory remains Vehicle-backed. Enabling EBOOKS alone does not complete its public UI journey.
- Additional boundary gap: `/api/marketplace/category-items` list/detail handlers do not use `resolveEnabledMarketplaceCategory`. Their publication gate does not enforce consumer category enablement. The seed therefore never creates ACTIVE listings for disabled or incompatible category items. This should be covered when implementing category-item public adapters.
- `marketplaceLeadService.ts` queries Vehicle only. Lead has `vehicleId` but no CategoryInventoryItem relation. Category-item capture needs an explicit listing identity/ownership contract, persistence link, Activity presentation and channel-event/report attribution. Do not fake it with an unrelated Vehicle ID or dealer-only lead.
- Admin `CreateDealershipDialog.tsx` consumes BUSINESS_CATEGORY_IDS; `server/routes/admin.ts`, request validation and `createDealershipService.ts` create categorized businesses and owner invitations. All five business profiles can be registered using existing IDs, but EBOOKS/SONGS are imperfect category choices for these physical stores. Seeding bypasses onboarding/invitation delivery and is not an Admin acceptance test.
- Authentication and OperatorDealerAccess are category-independent. Activity leads use dealer-scoped Lead records. TeamThread supports business-scoped assigned work with a string reference; it is not a typed category-item relation. `services/reports/observedDemandReport.ts` and related performance/lifecycle reporting use Vehicle identities. Generic Team activity is available, but category-item inventory demand/sales reporting is incomplete.

## Acceptance matrix

**Available** means a traced implementation exists, not that browser acceptance passed. **Partial** identifies a contract limitation. All browser journeys remain to be exercised.

| Target / current category | Admin create | Operator sign-in / inventory | First-party publish | Public browse / seller | Inquiry → correct listing + business → Activity Leads | Team work | Activity / reporting |
|---|---|---|---|---|---|---|---|
| Harborline / AUTOMOTIVE | Available | Available | Available; baseline preserved | Available | Available, existing capture regressions pass | Available | Established vehicle reports |
| Bookstore / EBOOKS | Available, category mismatch | Auth available; digital inventory only; physical drafts quarantined | Digital backend available; physical stock blocked by contract | Category-item API exists; UI/storefront adapter missing | Blocked: Vehicle-only capture and Lead FK | Business task available; no captured listing lead | Generic business work only; category-item reporting missing |
| Record store / SONGS | Available, category mismatch | Auth available; digital music inventory only; physical drafts quarantined | Public category disabled; physical-release contract missing | Disabled; physical-release listing adapter missing | Blocked: category-item capture/link missing | Business task available | Generic business work only; physical-release reporting missing |
| Vintage / APPAREL | Available | Auth available; existing physical field mapping is partial/placeholder | Public category disabled; fixture stays draft | Disabled | No public listing journey | Business task available | Legacy Vehicle reports exist but apparel semantics unaccepted |
| Marine / BOATS | Available | Auth available; existing HIN/hours mapping | Available; two seeded listings | Available; real public-detail query verified | Real capture service verified correct vehicle/dealer; shared Activity route available | Business task available | Existing Vehicle-based reports; marine units/wording need browser review |

No category-item listing is claimed as fully operational. The next concrete blockers are physical book/record inventory contracts, category-item public UI/storefront adapters, and durable category-item inquiry/report identity. No major shared-service refactor is part of this foundation.

## Fixture plan and implemented foundation

One opt-in entrypoint: `src/scripts/dev/seedMultiEntity.ts`; fixture inputs: `multiEntityFixture.ts`.

- Requires `NODE_ENV=development`, `DEALERGRID_MULTI_ENTITY_SEED=1` and a localhost MySQL DATABASE_URL. Nothing is wired into production startup or the default seed.
- Reuses existing `dealer_ux_harborline` without updating or resetting it. The script requires that baseline to exist. It deliberately does not invoke its destructive UX reseeder or enable its external destinations.
- Creates `dealer_me_books`, `dealer_me_records`, `dealer_me_vintage`, `dealer_me_marine`. Each has owner/staff access only to its own business, two inventory records, local illustration media, and an assigned inventory review Team task.
- Books and records are explicit DRAFT inspection data in the existing CategoryInventoryItem store, with `fixtureContractGap` metadata and physical condition/format values. They deliberately do not satisfy DIGITAL contracts and must not be used as publishing-readiness evidence. Vintage uses the existing physical Vehicle path and stays DRAFT. Marine uses Vehicle and receives two ACTIVE first-party listings.
- Illustrations are committed under `assets/demo-vehicles/multi-entity-*.svg` and served by the existing `/demo-assets/` handler/proxies. They are labeled demo illustrations, not product photography.
- Stable IDs, stock numbers and business dates; password salts and DB audit/default timestamps are intentionally nondeterministic. Ordinary reruns fill absent records and preserve demo edits; `--reset` restores fixture content.
- No synthetic leads, sale events, channel metrics or reporting successes are seeded. Team tasks are clearly fixture work. No OAuth, geocoding, paid API, external notification or feed dispatch is invoked.

## Run, sign in, reset

Use a disposable, migrated local database with the existing Harborline UX baseline. If absent, establish it using the existing `src/scripts/dev/seedUxAcceptance.ts` workflow; that workflow resets Harborline data, so do not use it just to rerun this fixture.

```bash
npm run build
NODE_ENV=development DEALERGRID_MULTI_ENTITY_SEED=1 node dist/src/scripts/dev/seedMultiEntity.js
# Restore only the four new fixture businesses and their eight accounts:
NODE_ENV=development DEALERGRID_MULTI_ENTITY_SEED=1 node dist/src/scripts/dev/seedMultiEntity.js --reset
```

Reset is transactional and deletes the four exact fixture dealer IDs and eight exact account IDs, including their demo-session work. It does not run `db:reset`, touch unrelated tenants, or touch Harborline. Reserve these IDs/emails for this demo; do not grant these accounts access to real businesses.

Owner emails: `owner@books.multi-entity.example`, `owner@records.multi-entity.example`, `owner@vintage.multi-entity.example`, `owner@marine.multi-entity.example`. Replace `owner` with `staff` for staff accounts. Password: `local-multi-entity-only`. Existing Harborline credentials remain unchanged.

Operator hash routes: `#/dealer_me_books/inventory`, `#/dealer_me_records/inventory`, `#/dealer_me_vintage/inventory`, `#/dealer_me_marine/inventory`; use each business's Activity → Leads and Team navigation. Marketplace uses its existing boats category routes. No new pages were added.

## Verification performed

- TypeScript build passed.
- 156 tests passed across fixture guards, boats seeding, category inventory/write guards, Marketplace category boundaries and enablement.
- 61 regressions passed across Marketplace capture/delivery, first-party publishing, vehicle lifecycle and reporting.
- Against the local database: seed, rerun, reset, rerun, and final reset passed. Verified two access rows per new business, owner password verification, two ACTIVE marine listings, and marine public detail retrieval.
- Called the real Marketplace inquiry service for `me_marine_1` with no delivery destinations; verified the persisted Lead had `vehicleId=me_marine_1` and `dealershipId=dealer_me_marine`. Book inquiry returned null. Reset removed this verification inquiry afterward; no fake customer remains.
- Compared the Harborline profile, vehicles/media, leads and Team threads before/after these checks: unchanged.
- Browser login, Admin invitation acceptance, public storefront rendering, UI lead visibility/assignment and category-specific report wording are **not** claimed as tested. The runtime here is Node 20 while package.json specifies Node 22; repeat acceptance under the supported runtime.
