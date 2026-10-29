# Phase 2 API integration — backend ownership

Backend owns Prisma, services, routes, OpenAPI and generated clients. Antigravity owns `apps/marketplace`; Cursor owns `apps/web`. Neither UI app nor splash is edited by this backend work.

## Stable identity

`{ source: "vehicle" | "category_item", inventoryId, dealershipId, categoryId, publicationId }` identifies an inventory record and its current first-party publication. Inventory IDs remain the existing Vehicle / CategoryInventoryItem IDs. `publicationId` is a MarketplaceListing ID; do not use it as the detail/inquiry route ID. No third inventory model exists. Never guess source from the ID string.

## Antigravity

Existing automotive/marine endpoints and shapes remain supported:

- `GET /api/marketplace/vehicles?category=boats&dealer=dealer_me_marine`
- `GET /api/marketplace/vehicles/me_marine_1?category=boats`
- `POST /api/marketplace/vehicles/me_marine_1/leads`

Category items:

- `GET /api/marketplace/category-items?categoryId=EBOOKS&dealer=dealer_me_books&page=1&pageSize=24` → `{ items, total, page, pageSize }`. Cards include `identity`, `listingId`, `categoryId`, `title`, `author`, `format`, `priceCents`, `mediaUrls`, `dealerId`, seller name/location.
- `GET /api/marketplace/category-items/me_books_digital_1` → card plus public category `data`, publisher, language, pageCount, ISBN/ASIN.
- `POST /api/marketplace/category-items/me_books_digital_1/leads` with `{"contactName":"Buyer","contactEmail":"buyer@example.com","message":"Is this title available?"}` → HTTP 201 `{"message":"Inquiry received","leadId":"…"}`.
- `GET /api/marketplace/sellers/dealer_me_books?category=ebooks` → existing seller fields and `vehicles`, plus `categoryItems` and `categoryItemTotal`. First 100 category items are embedded; use paginated category-items with dealer filter for more.

Category list filter accepts registered ID or slug; omitted means all eligible category items. Invalid category: 400. Disabled category: 404. Detail and inquiry: 404 for hidden, disabled, sold, removed, draft, unpriced, incompatible or mismatched-owner items. Inquiry uses the existing public abuse limiter (429) and strict contact validation (400); request cannot choose a seller or inventory FK.

Local image: `/demo-assets/multi-entity-books.svg`. `me_books_digital_1` is a separate **digital control**, not a conversion of physical book stock. `me_books_1`, `me_books_2`, and both record-store drafts remain private. Do not infer digital purchase/download fulfillment from successful inquiry capture.

## Cursor

Operator APIs retain op_session/dealer access checks:

- Existing category inventory routes remain unchanged.
- `POST /api/dealers/dealer_me_books/platforms/consumer-marketplace/category-listings` body `{"categoryItemId":"me_books_digital_1"}` → 201 `{ listing }`. Vehicle publish keeps `{ vehicleId }` on `/listings`. Ineligible records return 409; wrong-owner records return 404; unauthorized users retain 401/403 behavior.
- Existing DELETE category-listings endpoint withdraws publication.
- `GET /api/dealers/dealer_me_books/leads` now includes `categoryItemId`, `inventoryIdentity: {source, inventoryId, dealershipId}`, and `categoryItem: {id, categoryId, title, stockNumber, soldAt, thumbnailUrl}`. Vehicle inquiries retain `vehicleId`/`vehicle`. No fabricated Vehicle is returned for category inquiries.
- Existing `PATCH /api/dealers/:dealershipId/leads/:leadId` supports workflow state, assignment and notes for either inventory source. Existing version/access/assignee checks are unchanged.
- Use the explicit source/ID to open the corresponding existing inventory detail. Team work continues to use business-scoped tasks and reference strings; no new Team UI or typed relation is introduced.

Email summary and JSON webhook planning retain seller-scoped destinations and carry category item identity/title. ADF/XML is automotive-only: category-item CRM handoff returns `canSend:false`, `sendBlocker:"UNSUPPORTED_INVENTORY_TYPE"`; it does not fabricate a vehicle. No delivery destination is accepted from public buyer input and no paid integration is enabled.

## Database and fixture setup

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
NODE_ENV=development DEALERGRID_MULTI_ENTITY_SEED=1 node dist/src/scripts/dev/seedMultiEntity.js
```

Migration `20261028120000_category_item_leads` adds nullable `Lead.categoryItemId`, an index, and a foreign key with ON DELETE SET NULL. Existing vehicle/unassigned leads remain unchanged. Lead snapshot retains stable identity if an item is later deleted. Apply migration before running the new server.

Existing fixture login/reset instructions remain in phase-1.md. The additive digital control is created on ordinary rerun; `--reset` restores all four owned demo businesses and preserves Harborline. No inquiries or sales are seeded.

## Acceptance scope

| Business | Publication + inquiry backend |
|---|---|
| Automotive | Existing Vehicle workflow retained |
| Marine | Existing Vehicle/HIN workflow retained |
| Bookstore | Eligible digital control completes CategoryInventoryItem journey; physical ISBN stock remains blocked by digital contract |
| Record store | Physical vinyl/CD stock remains blocked; SONGS consumer category disabled |
| Vintage | APPAREL consumer category disabled; no public workflow claimed |

Category-item browse/readiness filtering currently evaluates schema rules before pagination in memory. This keeps totals and visibility correct for this POC; a larger catalog needs equivalent database predicates/pagination optimization. Category-item inquiry attribution is recorded as a shared channel event with listing ID and typed identity metadata; Vehicle-only per-unit sales/performance reports are not represented as category-item reports.

## Attribution and verification

`POST /api/marketplace/events` accepts optional `inventorySource:"category_item"` alongside the existing event names (`vehicle_impression`, `vehicle_detail_view`). Supply the category item ID as `listingId`; legacy callers default to `vehicle`. Publication, category and optional seller ownership are checked before recording the event. Existing event names are retained for API compatibility; the metadata identifies the inventory source.

Backend checks:

```bash
npm run build
node --test dist/src/tests/*.test.js
NODE_ENV=development DEALERGRID_MULTI_ENTITY_SEED=1 DEALERGRID_INTEGRATION=1 node --test dist/src/tests/multiEntityIntegration.test.js
npm run openapi:validate
npm run openapi:validate:marketplace
```

The explicit local integration suite resets only the four owned fixture businesses, makes actual API inquiries, verifies database linkage, lead assignment and access isolation, then resets away the test inquiries. It snapshots Harborline before/after. Ordinary backend unit runs skip this destructive-to-demo-only integration test. Use the existing local fixture guard and do not run against a shared real-data database.

The integration suite covers digital publication/discovery/storefront, inquiry persistence and navigation fields, ADF exclusion, channel attribution, foreign-seller denial, unpublished/disabled/draft/sold/removed/unpriced/incompatible-item denial, and automotive/marine inquiry regression. UI browser rendering and physical retail category enablement remain outside this acceptance result.

Both generated clients have been regenerated. `packages/api-client/generated` is ignored by this repository; Cursor should run `npm run client:generate` after pulling the OpenAPI changes. Marketplace generated client changes are tracked. OpenAPI validation also repaired the pre-existing missing dealershipId parameter on the inbound-email GET contract; no inbound-email runtime behavior changed.


Final verification: TypeScript build passed; 2,769 backend tests passed with zero failures (five existing TODOs; the local integration suite is skipped in the ordinary run). The explicit local integration run passed all six tests, including Harborline preservation. Both OpenAPI documents validate; the Operator spec retains 15 pre-existing warnings. No UI/browser acceptance is claimed. The local database has the migration and restored fixtures, including the valid digital control, with no test buyer inquiries remaining.
