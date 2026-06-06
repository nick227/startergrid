# Marketplace Index Contract

**Status:** Fully implemented  
**Date:** 2026-06-06  
**Scope:** Public consumer marketplace API — boundary rules, eligibility, field contract, query layer.

---

## Context

The system has three layers with different trust and coupling rules:

| Layer | Role | What it owns |
|-------|------|--------------|
| `src/` (sync engine) | Truth | Inventory, ingress, platform readiness, publishing pipeline, performance cache, accounts |
| `apps/web/` (operator portal) | Operator tooling | Reads full operator API via generated SDK (`@auto-dealer/api-client`) |
| `apps/marketplace/` (consumer app) | Buyer-facing browse | Reads curated marketplace index only — imports `@dealer-marketplace/client` exclusively |

The marketplace app must not couple to the sync engine's dispatch pipeline — it reads a stable, read-only index API. This is enforced by two independent guardrails (see § Boundary Enforcement).

---

## 1. Eligibility rule

A vehicle is marketplace-eligible when all three conditions hold **at query time**:

```
soldAt IS NULL
AND removedAt IS NULL
AND priceCents > 0
```

This is applied as a Prisma `WHERE` clause — not a stored flag, not client-side filtering.

**Not checked at this layer:** dealer readiness, platform account activation, dealer suspension status. These are deferred — `DealershipProfile` does not yet have a `dealerStatus` field.

---

## 2. Public-safe fields (MarketplaceVehicleCard)

```
listingId        string        Opaque stable ID — not the VIN; used for the detail route
stockNumber      string
year             number
make             string
model            string
trim             string | null
condition        NEW | USED | CPO
priceCents       number
mileage          number
exteriorColor    string | null
mediaUrls        string[]      First 8 images by sort order (card); all images in detail
dealerId         string
dealerName       string        dbaName ?? legalName
dealerCity       string | null
dealerState      string | null
listingUrl       string        Relative path to consumer listing page
listedAt         string        ISO 8601 — vehicle createdAt
```

`listingId` is the vehicle's DB `id` (cuid). It is stable, opaque, and is NOT the VIN.

**Not in the card:** VIN, internalIds, readiness signals, platform application state, sync events, operator notes, performance cache, account details, pricing history, interiorColor, bodyStyle, drivetrain, fuelType, transmission, options, starCore.

---

## 3. Private / operator-only fields

The following must **never** appear in any marketplace response. They are excluded at the Prisma `select` layer — not just stripped from the shape function.

| Field / relation | Reason |
|-----------------|--------|
| `vin` | PII risk — not needed for consumer browse |
| `syncEvents`, `publishQueue` | Dispatch internals |
| `performanceCache`, `movementSignal`, `avgComparableDays`, `benchmarkConfidence` | Operator analytics — competitive timing data |
| `platformAccounts`, `applications` | Account management state |
| `subscription` | Billing data |
| `credentialRefs` | API credentials |
| `readinessRuns`, `generatedArtifacts` | Internal validation artifacts |
| `notifications` | Internal operator comms |
| `syncPolicies`, `leadCaptureUrl` | Operator workflow config |
| `interiorColor`, `bodyStyle`, `drivetrain`, `fuelType`, `transmission`, `options`, `starCore`, `updatedAt` | Internal vehicle fields |

### Performance signals do not appear in the marketplace

`movementSignal`, `comparableCount`, `avgComparableDays`, `benchmarkLabel`, and all `PlatformPerformanceSummary` fields are operator analytics. Exposing them:
- Leaks competitive timing data (a STALE vehicle signals it is not selling).
- Implies attribution the language guardrails prohibit.
- Has no consumer UX value — buyers care about the vehicle, not platform timing.

If a "fresh listing" badge is ever wanted, derive it from `listedAt` age only.

---

## 4. API routes

All routes: `x-route-classification: public`, `security: []`, no operator auth.

| Method | Path | Query params | Notes |
|--------|------|-------------|-------|
| GET | `/api/marketplace/vehicles` | make, model, condition, minPrice, maxPrice, maxMileage, dealer, page, pageSize | Paginated browse |
| GET | `/api/marketplace/vehicles/:listingId` | — | 404 if sold/removed/absent |
| GET | `/api/marketplace/dealers/:dealerId` | — | 404 if dealer absent |

### Response shapes

**List response:**
```json
{
  "vehicles": [MarketplaceVehicleCard],
  "total": 42,
  "page": 1,
  "pageSize": 24,
  "nextPage": "/api/marketplace/vehicles?page=2&pageSize=24"
}
```

**Detail response:**
```json
{
  "vehicle": MarketplaceVehicleCard,
  "fullDescription": null,
  "additionalMediaUrls": ["url9", "url10"]
}
```
`fullDescription` is null until `Vehicle` gains a description field. `additionalMediaUrls` holds images beyond the first 8 (card limit = 8; detail returns all).

**Dealer index response:**
```json
{
  "dealerId": "...",
  "dealerName": "Prairie Ridge Motors",
  "city": "Springfield",
  "state": "IL",
  "websiteUrl": "https://...",
  "vehicles": [MarketplaceVehicleCard]
}
```

---

## 5. Filters

All filters are applied as Prisma `WHERE` conditions. None are evaluated client-side.

| Filter | Param | Behaviour |
|--------|-------|-----------|
| Make | `make` | Exact match |
| Model | `model` | Exact match |
| Condition | `condition` | `NEW`, `USED`, or `CPO` |
| Min price (cents) | `minPrice` | Inclusive. Negative values ignored. Eligibility `priceCents > 0` always preserved. |
| Max price (cents) | `maxPrice` | Inclusive |
| Max mileage | `maxMileage` | Inclusive. Negative values ignored. |
| Dealer | `dealer` | Filter by dealership ID (`dealershipId`) |
| Page | `page` | Default 1; minimum 1 |
| Page size | `pageSize` | Default 24; max 100 |

**Price safety:** the `priceCents > 0` eligibility floor is never overwritten by price filter params. `priceFilter` always starts with `{ gt: 0 }`; `gte` is only added when `minPrice > 0`.

---

## 6. Stable sort

```
ORDER BY createdAt DESC, id ASC
```

The `id` (cuid) tie-breaker ensures deterministic pagination when multiple vehicles share the same `createdAt` timestamp. Applied in both `listMarketplaceVehicles` and `getMarketplaceDealerIndex`.

---

## 7. OpenAPI contract

`openapi/openapi-marketplace.yaml` — isolated from `openapi/openapi.yaml`.

Rules enforced by `src/tests/marketplaceRouteContract.test.ts`:
- Every registered Fastify route appears in the spec.
- Every spec path has a matching registered route.
- Every route has `x-route-classification: public`.
- Every route has `security: []`.
- Every route has an `operationId`.
- No `$ref` to `openapi.yaml`.
- No `OperatorAuth` scheme.
- `openapi.yaml` has no `/api/marketplace/` routes.

Validate: `npm run openapi:validate:marketplace`

---

## 8. Generated client

`packages/marketplace-client/` — generated from `openapi/openapi-marketplace.yaml` via `openapi-typescript-codegen`.

Regenerate: `npm run marketplace:client:generate`

The consumer app imports:
```typescript
import { MarketplaceService } from '@dealer-marketplace/client';
import type { MarketplaceVehicleCard, ... } from '@dealer-marketplace/client';
```

---

## 9. Boundary enforcement

Two independent guardrails prevent `apps/marketplace` from coupling to operator internals:

### Layer 1 — Import scanner
`scripts/check-marketplace-boundary.js` — walks all `.ts/.tsx` files in `apps/marketplace/src/` and fails with exit 1 if any file imports from:
- `@auto-dealer/api-client`
- `auto-dealer-onboarding-poc-v1` (root backend)
- `apps/web`
- `/src/services`, `/src/server`, `/src/lib/prisma`
- `../../src` or `../../../src` (relative escapes)

Run: `npm run marketplace:boundary:check`

### Layer 2 — TypeScript type assertions
`apps/marketplace/src/lib/marketplace-boundary.check.ts` — compile-time assertions using:

```typescript
type AbsentFrom<T, K extends string> = K extends keyof T ? 'FAIL' : 'ok';
type MustBeAbsent<_ok extends 'ok'> = _ok;

export type MarketplaceVehicleCardBoundaryAssertions = {
  _no_vin: MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'vin'>>;
  // ... 13 more forbidden fields
};
```

If any forbidden field is ever added to `MarketplaceVehicleCard`, `tsc --noEmit` fails with: _Type `"FAIL"` does not satisfy the constraint `"ok"`_.

### Layer 3 — Prisma explicit SELECT
`VEHICLE_CARD_SELECT` and `VEHICLE_DETAIL_SELECT` in `marketplaceQueryService.ts` are typed `Prisma.VehicleSelect` objects listing only the 12 safe scalar fields. VIN and all operator fields are **never fetched** from the database — defense in depth beyond shape stripping.

---

## 10. Test coverage

| File | What it tests |
|------|---------------|
| `src/tests/marketplaceContract.test.ts` | Card shape, private field exclusion, VIN serialization, eligibility filter, pagination, dealer index, vehicle detail, listingId contract |
| `src/tests/marketplaceQueryFilters.test.ts` | WHERE clause correctness per filter, eligibility invariants, VIN not in SELECT, operator relations not in SELECT, stable sort structure, skip/take math, nextPage URL, invalid param normalization |
| `src/tests/marketplaceRouteContract.test.ts` | Route ↔ spec coverage, security declarations, spec isolation |
| `apps/marketplace/src/lib/marketplace-boundary.check.ts` | TypeScript compile-time field absence assertions |

Total: 861 backend tests, 0 failures. All marketplace tests are pure — no DB, no HTTP.

---

## 11. What is intentionally deferred

- **`MarketplaceListing` projection table** — only needed when full-text search or cross-dealer aggregations require a denormalized read model. Current eligibility filter on `Vehicle` is sufficient for MVP.
- **Marketplace platform profile activation** — sync engine dispatching inventory to the `marketplace` slug, real HTTP ingest endpoint. The consumer API currently queries `Vehicle` directly; this is sufficient until the publish pipeline needs to gate marketplace visibility per-vehicle.
- **Dealer suspension gating** — `DealershipProfile` has no `dealerStatus` field. When added, the eligibility WHERE clause should include `dealership.dealerStatus NOT IN (SUSPENDED, OFFBOARDED)`.
- **Full-text search** — `make` / `model` are exact-match filters. Full-text index deferred to scale.
- **Buyer accounts, leads from marketplace, financing, saved cars, search ranking, analytics** — out of scope for the consumer browse MVP.
