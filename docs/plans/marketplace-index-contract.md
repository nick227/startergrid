# Marketplace Index Contract

**Status:** Plan — not implemented  
**Date:** 2026-06-05  
**Scope:** What the consumer marketplace app (`apps/marketplace/`) is allowed to read from the sync engine, and how the boundary is enforced.

---

## Context

The system has three layers with different trust and coupling rules:

| Layer | Role | What it owns |
|-------|------|--------------|
| `src/` (sync engine) | Truth | Inventory, ingress, platform readiness, publishing pipeline, performance cache, accounts |
| `apps/web/` (operator portal) | Operator tooling | Reads the full operator API surface via generated SDK |
| `apps/marketplace/` (consumer app) | Buyer-facing browse | Must read curated output only — no operator internals |

The sync engine dispatches inventory to a `marketplace` platform profile (slug: `marketplace`, class: `FEEDABLE`, treated like any third-party destination). The marketplace app must not couple to that dispatch pipeline — it reads a stable read-only index API.

---

## 1. What data becomes marketplace-visible?

A vehicle is marketplace-eligible when:

1. Its dealer has at least one active platform account for the `marketplace` slug (or a general ACTIVE status).
2. The vehicle is not `SOLD`, `REMOVED`, or `ARCHIVED`.
3. The vehicle has passed baseline readiness (VIN valid, price set, minimum images met).
4. The dealer's `dealerStatus` is not `SUSPENDED` or `OFFBOARDED`.

The marketplace index exposes a **curated projection** of eligible vehicles:

```
MarketplaceVehicleCard:
  stockNumber       string
  year              number
  make              string
  model             string
  trim              string | null
  condition         NEW | USED | CERTIFIED
  priceCents        number
  mileage           number | null
  exteriorColor     string | null
  mediaUrls         string[]          // first N images only, ordered by sequence
  dealerId          string
  dealerName        string
  dealerCity        string | null
  dealerState       string | null
  listingUrl        string            // deep link to dealer storefront vehicle page
  listedAt          string            // ISO 8601
```

**Not in the card:** VIN, internal vehicle IDs, readiness signals, platform application state, sync events, operator notes, performance cache, account details, pricing history.

---

## 2. What data must remain operator-only?

| Data | Reason |
|------|--------|
| VIN | PII risk; not needed for consumer browse |
| Platform application state | Internal pipeline tracking |
| PublishQueueItem, SyncRun, SyncEvent | Dispatch internals |
| PlatformAccount credentials / refs | Security |
| ReadinessRun, GeneratedArtifact | Internal validation artifacts |
| Performance cache (movementSignal, comparableCount, avgComparableDays) | Operator analytics — would expose competitive timing data |
| Dealer subscription / invoice data | Commercial confidential |
| DealerNotification | Internal comms |
| Raw lead data | GDPR / privacy — leads belong to the dealer |
| Account workflow state (pendingApplications, blockedVehicles) | Operator workflow internals |
| Readiness scores | Internal; labeling would mislead consumers |

---

## 3. Marketplace index payload

### List endpoint response

```json
{
  "vehicles": [MarketplaceVehicleCard, ...],
  "total": 42,
  "page": 1,
  "pageSize": 24,
  "nextPage": "/api/marketplace/vehicles?page=2&pageSize=24"
}
```

### Dealer storefront endpoint response

```json
{
  "dealerId": "...",
  "dealerName": "Prairie Ridge Motors",
  "city": "...",
  "state": "...",
  "vehicles": [MarketplaceVehicleCard, ...]
}
```

### Single vehicle endpoint response

```json
{
  "vehicle": MarketplaceVehicleCard,
  "fullDescription": "string | null",
  "additionalMediaUrls": "string[]"
}
```

### Lead capture (write endpoint — public)

Already exists on the operator API surface: `POST /api/dealers/:id/leads`. The marketplace app may call this directly. No new route needed; rate limiting already applied.

---

## 4. Routes apps/marketplace should consume

All marketplace routes live under `/api/marketplace/` (separate from the operator `/api/dealers/` surface).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/marketplace/vehicles` | Paginated browse, supports `?make=&model=&condition=&minPrice=&maxPrice=&dealer=` |
| GET | `/api/marketplace/vehicles/:stock` | Single vehicle card detail |
| GET | `/api/marketplace/dealers/:id` | Dealer storefront — all eligible vehicles for one dealer |
| POST | `/api/dealers/:id/leads` | Lead capture (reuse existing operator route, already public) |

These routes are `x-route-classification: public` — no operator auth required.

---

## 5. Inventory ingress / publish status → marketplace eligibility

Eligibility is a read-time filter, not a stored flag. The query logic:

```
eligible vehicles = Vehicle WHERE
  status NOT IN (SOLD, REMOVED, ARCHIVED)
  AND dealer.dealerStatus NOT IN (SUSPENDED, OFFBOARDED)
  AND vehicle passes baseline readiness check
  AND dealer has marketplace publish authorization
    (e.g. PlatformAccount for slug='marketplace' with status ACTIVE,
     OR a policy flag on the dealer that allows open marketplace listing)
```

The sync engine does not need a `MarketplaceListing` projection table for the MVP. The marketplace API queries `Vehicle` + `VehicleMedia` + `DealershipProfile` directly at read time, filtered by the eligibility rules above.

If the marketplace grows to require pre-projected rows for performance (e.g., full-text search index, cross-dealer aggregations), a `MarketplaceListing` projection table can be added as a denormalized read model — populated by a background job after publish succeeds. That decision is deferred.

---

## 6. How performance signals appear in the marketplace, if at all

**They do not appear in the consumer marketplace.**

Performance signals (movementSignal, comparableCount, observedAssistLabel) are operator analytics derived from the sync engine's internal lead and timing data. Exposing them to consumers:

- Leaks competitive intelligence (e.g., a vehicle marked STALE signals it's not selling).
- Implies attribution that the language guardrails specifically prohibit.
- Has no consumer UX value — buyers care about the vehicle, not how it's moving.

If in the future we want a "fresh listing" badge or "just arrived" filter, that should be derived from `listedAt` age only — not from the performance cache.

---

## 7. OpenAPI contract for the boundary

A separate OpenAPI spec should define the marketplace surface:

```
openapi/openapi-marketplace.yaml
```

It is distinct from `openapi/openapi.yaml` (the operator spec). Reasons:

- Different auth model (public vs operator-auth).
- Different SDK generation target (`packages/marketplace-client/`).
- The operator spec must not leak marketplace routes (and vice versa).
- Redocly can validate both independently.

The marketplace spec will:

- Tag all routes `x-route-classification: public`.
- Define `MarketplaceVehicleCard`, `MarketplaceVehicleDetail`, `MarketplaceDealerStorefront`, and `MarketplaceVehicleList` in `components/schemas`.
- Not import or reference any schema from the operator spec.
- Use `operationId` on every operation (same convention as operator spec).

The `apps/marketplace/` SDK wrapper follows the same pattern as `apps/web/src/lib/api/sdk.ts` — generated client, no raw `fetch` calls in components.

---

## Implementation order (when ready)

1. Write `openapi/openapi-marketplace.yaml` with the 3 GET routes above.
2. Add `npm run client:generate:marketplace` script.
3. Implement `src/server/routes/marketplace.ts` (Fastify plugin, public classification, eligibility query).
4. Register in `src/server/app.ts`.
5. `routeContract.test.ts` gains marketplace route entries.
6. Scaffold `apps/marketplace/` with Vite + React + Tailwind (same pattern as `apps/web/`).
7. `apps/marketplace/src/lib/api/sdk.ts` wraps generated client.

Do not start until this plan is reviewed and the operator API surface is stable.

---

## What this plan intentionally defers

- `MarketplaceListing` projection table (only needed at scale)
- Search index / full-text (deferred — page-filtered queries sufficient for MVP)
- Dealer auth for marketplace (operators manage listings via the operator portal, not the marketplace)
- `marketplace` platform profile activation and real HTTP dispatch to ingest
- Any performance signal exposure to consumers
