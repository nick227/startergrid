# Handoff Document — Auto Dealer Sales Portal

**Updated:** 2026-06-06  
**State:** v4.2.1 · Marketplace Index Quality — hardened query layer, boundary guardrails, 861 tests  
**Branch:** `main`

---

## What This System Does

A sync engine that owns dealer inventory truth, ingress, platform readiness, publishing, accounts, and performance cache. It validates against 18 ad/marketplace platforms, generates feed artifacts, queues and dispatches them via a scheduler, and produces proof + invoice artifacts.

Two frontends consume different API surfaces:

- **Operator portal** (`apps/web/`) — inventory, ingress, accounts, publish/sync, **movement benchmarks in workflow** (Inventory primary; Sync context; Insights reference). Uses the generated operator OpenAPI SDK (`@auto-dealer/api-client`).
- **Consumer marketplace** (`apps/marketplace/`) — multi-dealer browse/search. Reads curated marketplace index APIs only; imports `@dealer-marketplace/client` exclusively. Must not couple to sync-engine internals (queues, account states, operator workflow).

CLI scripts remain available for all sync-engine operations.

---

## Application Architecture

```
apps/web              Operator portal — generated operator OpenAPI SDK (@auto-dealer/api-client)
apps/marketplace      Consumer multi-dealer app — @dealer-marketplace/client only; no operator coupling
src/                  Sync engine + core DB truth
  server/routes/
    marketplace.ts    Public consumer browse API — no auth; eligibility filter applied at query time
```

**Source of truth (sync engine owns):** inventory, ingress, platform readiness, platform dispatch, performance cache.

**Marketplace consumes curated output only:** marketplace index, public vehicle cards, dealer storefront-ready inventory, search/filter payloads. It does **not** read raw publishing queues, account states, or operator workflow data.

`dealer-storefront` is a white-label **feed channel** (artifact output), not a hosted per-dealer browse product. Discovery lives in the internal marketplace, synced as platform slug **`marketplace`** (FEEDABLE, treated like any third-party destination).

---

## HTTP Route Contract (mandatory)

Any HTTP route touched or added must follow, in the same commit:

1. OpenAPI spec updated first (`openapi/openapi.yaml`)
2. Security classification (`x-route-classification`, `security` block)
3. `operationId` on every operation
4. Request/response schemas in `components/schemas`
5. Regenerate SDK — `npm run client:generate`
6. Frontends call SDK wrappers in `apps/*/src/lib/api/sdk.ts`, not raw `fetch`
7. `src/tests/routeContract.test.ts` stays green

No more “just add a quick endpoint.”

---

## Performance Intelligence (v4.1)

Cached movement benchmarks answer: *Is this vehicle moving faster or slower than similar stock, and which platforms show observed activity?*

**Engine (sync):** `VehiclePerformanceCache`, `PlatformPerformanceSummary`, aggregate jobs, five operator API routes, `npm run performance:compute`.

**Operator UI stance:** benchmarks are **native context**, not a separate analytics product.

| Surface | Role |
|---------|------|
| **Inventory** | Primary — `Days / Signal` column; row expand for comparable group + observed assists |
| **Sync** | Readiness first — movement line under tiles; manual **Refresh** only |
| **Platform rows** | Quiet avg move time + observed assists + low confidence |
| **Insights** | Reference summary — reads cache only; explicit refresh button |

**Language contract:** movement signal, similar average, observed assist, best observed platform, low confidence, not enough comparable data. Never: sold by, ROI, attribution, guaranteed best channel.

**UI rule:** no route auto-triggers `POST /performance/compute` on load.

### v4.1.1 operational wiring

- After successful auto-reconcile (import/sync), `runPerformanceComputeForDealer` runs in-process; failures are logged and do not fail reconcile.
- `AutoSyncStatus` adds `performanceRefreshPending` and `performanceComputedAt` for portal freshness polling.
- `seedPerformanceBenchmarkDemo` adds sold comparables + sync events + leads so demo shows FAST / SLOW / STALE (not all LOW_DATA).
- Marketplace index APIs remain performance-free (operator routes only).

### v4.2 vehicle-level UI (Inventory primary)

- Expand any inventory row for **VehicleDetailPanel**: movement vs similar stock, platform movement comparison, marketplace-safe preview (via `@dealer-marketplace/client` SDK — no performance fields).
- Movement signal **filters** and **sort** on Inventory; no frontend benchmark math (API fields + display rounding only).
- Sync hierarchy: readiness hero → tiles → inventory peek → platforms → history; movement one-liner links to Insights for full reference.

### v4.2.1 release hardening

- Marketplace preview: loading skeleton, error + retry, empty state; operator-only ineligibility when price unset.
- `marketplacePreview.ts` + vitest UI tests enforce no VIN/readiness/movement/performance in consumer preview text.
- `composeInventoryList` — readiness → search → movement → sort; movement chip counts scoped to readiness + search.
- `npm run test --prefix apps/web` — marketplace isolation + filter composition tests.

---

## Marketplace API (v4.2.1)

Public read-only consumer vehicle browse. Entirely separate from the operator API surface.

**OpenAPI spec:** `openapi/openapi-marketplace.yaml` — isolated from `openapi/openapi.yaml`. Validated independently with `npm run openapi:validate:marketplace`.

**Generated client:** `packages/marketplace-client/` — regenerate with `npm run marketplace:client:generate`. Consumer app imports `@dealer-marketplace/client` exclusively.

### Routes (all `x-route-classification: public`, no auth required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/marketplace/vehicles` | Paginated browse. Supports `?make=&model=&condition=&minPrice=&maxPrice=&maxMileage=&dealer=&page=&pageSize=` |
| GET | `/api/marketplace/vehicles/:listingId` | Single vehicle detail. 404 if sold, removed, or absent. |
| GET | `/api/marketplace/dealers/:dealerId` | Dealer storefront — all eligible vehicles for that dealer. |

### Eligibility rule

A vehicle is marketplace-eligible when all three conditions hold at query time:
- `soldAt IS NULL`
- `removedAt IS NULL`
- `priceCents > 0`

No readiness check, no dealer status check at this layer. Eligibility is a WHERE clause filter — not a stored flag.

### Public-safe fields (MarketplaceVehicleCard)

| Field | Type | Notes |
|-------|------|-------|
| `listingId` | `string` | Opaque stable ID — not the VIN |
| `stockNumber` | `string` | |
| `year` | `number` | |
| `make` | `string` | |
| `model` | `string` | |
| `trim` | `string \| null` | |
| `condition` | `NEW \| USED \| CPO` | |
| `priceCents` | `number` | |
| `mileage` | `number` | |
| `exteriorColor` | `string \| null` | |
| `mediaUrls` | `string[]` | First 8 images by sort order |
| `dealerId` | `string` | |
| `dealerName` | `string` | `dbaName ?? legalName` |
| `dealerCity` | `string \| null` | |
| `dealerState` | `string \| null` | |
| `listingUrl` | `string` | Relative path to consumer listing page |
| `listedAt` | `string` | ISO 8601 |

### Forbidden / private fields

The following must never appear in any marketplace response. Enforcement: `VEHICLE_CARD_SELECT` and `VEHICLE_DETAIL_SELECT` in `marketplaceQueryService.ts` use explicit Prisma `select` — VIN and all operator fields are **never fetched from the database**.

| Field / relation | Reason |
|-----------------|--------|
| `vin` | PII risk — not needed for consumer browse |
| `syncEvents`, `publishQueue` | Dispatch internals |
| `performanceCache`, `movementSignal`, `avgComparableDays` | Operator analytics — competitive timing data |
| `platformAccounts`, `applications` | Account management state |
| `subscription` | Billing data |
| `credentialRefs` | API security credentials |
| `readinessRuns`, `generatedArtifacts` | Internal validation artifacts |
| `notifications` | Internal operator comms |
| `syncPolicies`, `leadCaptureUrl` | Operator workflow config |
| `interiorColor`, `bodyStyle`, `drivetrain`, `fuelType`, `transmission`, `options`, `starCore` | Internal vehicle fields not part of public card |

### Filters (applied as Prisma WHERE — never client-side)

| Filter | Query param | Notes |
|--------|-------------|-------|
| Make | `make` | Exact match |
| Model | `model` | Exact match |
| Condition | `condition` | `NEW`, `USED`, or `CPO` |
| Min price (cents) | `minPrice` | Inclusive. Negative values ignored. `priceCents > 0` eligibility always applied. |
| Max price (cents) | `maxPrice` | Inclusive |
| Max mileage | `maxMileage` | Inclusive. Negative values ignored. |
| Dealer | `dealer` | Filter by dealership ID |
| Page | `page` | Default 1; min 1 |
| Page size | `pageSize` | Default 24; max 100 |

### Stable sort

`ORDER BY createdAt DESC, id ASC` — the `id` tie-breaker makes pagination deterministic when multiple vehicles share the same `createdAt` timestamp.

### Boundary guardrails

Two enforced layers prevent `apps/marketplace` from coupling to operator internals:

1. **Import scanner** (`scripts/check-marketplace-boundary.js`) — scans all `.ts/.tsx` files in `apps/marketplace/src/`; exits non-zero if any import matches `@auto-dealer/api-client`, root backend, or backend source paths. Run: `npm run marketplace:boundary:check`.
2. **TypeScript type assertions** (`apps/marketplace/src/lib/marketplace-boundary.check.ts`) — compile-time checks that `MarketplaceVehicleCard` does not contain forbidden fields. Caught by `tsc --noEmit` in the marketplace typecheck.

---

## Repo Layout

```
prisma/
  schema.prisma         Full DB schema — source of truth
  seed.ts               Seeds platform profiles + pristine demo dealer

src/
  data/
    platformProfiles.ts       18 platform profile definitions (the registry)
    mockPortalResponses.ts    Mock HTTP responses per platform × condition

  fixtures/
    dealers/                  dealership.fixture, negativeDealership.fixture
    vehicles/                 vehicles.fixture, negativeVehicles.fixture
    platforms/                stalePlatformProfiles.fixture
    scenarios/                pristineApiValidation.fixture (dealer + 3 vehicles)

  lib/
    types.ts                  All shared TypeScript types (no Prisma imports)
    prisma.ts                 Singleton PrismaClient

  validators/
    pathValidator.ts          Shared path/media-rule helper (root — imported by all)
    dealer/
      dealershipProfileValidator.ts
    vehicle/
      vehiclePayloadValidator.ts
    platform/
      platformReadinessValidator.ts    Baseline + strict readiness per platform
      platformValidator.ts             Full platform validation report
      strictPlatformProfileValidator.ts

  services/
    commercial/               invoiceService, proofFolderService
    dealer/                   dealerStatusService, dealerExportService,
                              dealerNotificationService, mockEmailService
    inventory/                inventorySnapshotService, inventoryUpdateService,
                              vehicleUpdateService, mediaValidationService
    platform/                 platformReadinessService, readinessRunService,
                              riskMatrixService, seedService
    publishing/               prepareAndPublishService, publishQueueService,
                              schedulerService, syncEventService, syncPolicyService,
                              feedGeneratorService, artifactWriterService, outputGenerator,
                              lifecyclePersistenceService, applicationActivationService,
                              approvalService, packetGenerator, partnerPortalService,
                              mockReceiptService
    storefront/               storefrontQueryService, leadCaptureService
    performance/              performanceMath (pure), performanceAggregator,
                              vehicleAggregateJob, platformAggregateJob,
                              performanceQueryService

  server/
    app.ts                    Slim Fastify registrar — registers routes only
    routes/
      dealers.ts              GET /api/dealers
      storefront.ts           GET storefront/vehicle, POST leads
      inventory.ts            PATCH price/photos, POST sold/removed
      publish.ts              POST prepare, GET status/history/accounts

  scripts/
    dealer/                   dealerCreate, dealerStatus, dealerExport,
                              dealerInvoice, dealerProof, vehicleUpdate
    sync/                     publishPrepare, syncScheduler, syncApproval,
                              syncQueue, syncRun
    dev/                      validateAll, validatePristine, smokeTest,
                              demoReset, report, fakeOnboard, fakeSubmitAll
    poc/                      pocGreen, pocPortalLifecycle, pocRiskMatrix
    server.ts                 Fastify entry point (port 3000)

  tests/                      node:test suite — 861 tests, all pure (no DB)

apps/
  web/                        Operator portal (Vite + React + Tailwind)
                              Dev: npm run ui:dev (port 5173, proxied to API on 3000)
    src/pages/InsightsPage.tsx          Performance Insights tab — summary tiles, vehicle table, platform cards
    src/components/sync/
      PerformanceInsightStrip.tsx       Movement signal + stale risk strip on Inventory and Sync pages
  marketplace/                Consumer multi-dealer app (Vite + React + Tailwind)
                              Dev: npm run marketplace:dev
    src/pages/VehicleListPage.tsx       Paginated browse — make/model/condition filters
    src/pages/VehicleDetailPage.tsx     Single vehicle detail + image gallery
    src/pages/DealerDetailPage.tsx      Dealer storefront index
    src/lib/api.ts                      API wrapper — imports only @dealer-marketplace/client
    src/lib/marketplace-boundary.check.ts  Compile-time field exclusion assertions

openapi/
  openapi.yaml                Operator API contract — source of truth for operator HTTP surface
  openapi-marketplace.yaml    Marketplace API contract — isolated; no operator schemas or auth

packages/
  api-client/                 Generated operator SDK (`npm run client:generate`)
  marketplace-client/         Generated marketplace SDK (`npm run marketplace:client:generate`)

docs/                         Design, planning, and handoff documents
exports/                      Generated feed artifacts — gitignored
```

---

## Domain Architecture

Services are grouped by the business concern they own, not by file type.

| Domain | What it owns |
|--------|--------------|
| `commercial/` | Invoicing and proof-of-delivery artifacts — the dealer's paid deliverables |
| `dealer/` | Dealer identity, status copy, export, notifications, mock email transport |
| `inventory/` | Vehicle state, price/media updates, readiness snapshots, media validation |
| `platform/` | Platform profiles, readiness runs, risk matrix, profile seeding |
| `publishing/` | The full publishing pipeline: feed generation → artifact storage → queue → scheduler → dispatch → approval → sync events. Also owns application lifecycle (activation, packets, portal simulation) |
| `storefront/` | Owned-channel queries and lead capture — kept isolated so lead logic doesn't creep into the core publishing pipeline |
| `performance/` | Performance cache computation and read queries. `performanceMath.ts` is pure (no DB). Aggregator jobs write `VehiclePerformanceCache` and `PlatformPerformanceSummary`. Query service is read-only from cache. |

**Known issue:** `publishing/lifecyclePersistenceService` currently owns `persistLead` in addition to application-lifecycle persistence. Lead persistence belongs in `storefront/` long-term. Deferred — do not refactor without a dedicated ticket.

Validators mirror the same domains (`dealer/`, `vehicle/`, `platform/`) with `pathValidator.ts` at root as a shared primitive used by all three subgroups.

Scripts are grouped by workflow (`dealer/`, `sync/`, `dev/`, `poc/`) with `server.ts` at root as the entry point.

---

## Environment Setup

**Requirements:** Node.js 22+, WampServer (MySQL 8+), npm

```bash
# Backend
npm install
cp .env.example .env          # adjust DATABASE_URL if needed
npm run db:push
npm run db:seed

# Operator UI
npm run ui:install
```

**`.env` values:**
```
DATABASE_URL="mysql://root:@localhost:3306/dealer_onboarding_poc"
APP_BASE_URL="http://localhost:5173"
MOCK_OUTBOX_DIR="./mock-outbox"
FEED_EXPORTS_DIR="./exports"
```

**Running both together:**
```bash
# Terminal 1 — API server (port 3000)
npm run server:start

# Terminal 2 — Operator UI (port 5173, proxies /api to 3000)
npm run ui:dev
```

Open `http://localhost:5173`, select Prairie Ridge Motors, and verify the Publish Console loads.

---

## Regression Contract

Run all of these after any change. None may fail before shipping.

```bash
# Core
npm test                              # 861 tests, 0 failing (backend + web)
npm run smoke:test                    # 6/6 system checks (DB, profiles, typecheck)
npm run typecheck                     # TypeScript, no emit

# Marketplace
npm run marketplace:boundary:check    # 0 forbidden imports in apps/marketplace/src/
npm run openapi:validate:marketplace  # marketplace spec valid
npm run marketplace:build             # client generate + Vite build

# Validation
npm run poc:green                     # 18/18 platforms GREEN (in-memory)
npm run poc:risk                      # 90/90 risk matrix expectations
npm run poc:portal                    # 18/18 platforms reach ACTIVE on happy path
npm run validate:pristine             # 18/18 GREEN baseline, 0 RED strict (fixture)
npm run validate:pristine:db          # same, reads dealer + inventory from DB

# Publish pipeline (requires a dealer ID)
npm run publish:prepare -- <id> --dry-run
npm run publish:prepare -- <id>
npm run sync:queue -- <id>
npm run sync:scheduler -- <id> --dry-run
npm run sync:approval -- list <id>

# Dealer commands
npm run dealer:proof -- <id>
npm run dealer:export -- <id>
```

---

## Scripts Reference

| Command | What it does |
|---|---|
| `db:push` | Sync schema to MySQL (safe, additive) |
| `db:seed` | Seed platform profiles + pristine demo dealer |
| `db:reset` | Force-reset DB + re-seed (destructive) |
| `test` | Build + run all 861 tests (backend + web) |
| `typecheck` | TypeScript check, no emit |
| `smoke:test` | DB connectivity, profile count, typecheck, validate:pristine |
| `poc:green` | 18/18 GREEN in-memory |
| `poc:risk` | Risk matrix: BASELINE / STRICT / NEGATIVE / STALE scenarios |
| `poc:portal` | Portal lifecycle: happy path + rejection arcs |
| `validate:pristine` | Pristine fixture → 18/18 GREEN |
| `validate:pristine:db` | Pristine fixture from DB → 18/18 GREEN |
| `dealer:create:pristine` | Full pipeline on pristine fixture, exits 0 |
| `dealer:status -- <id>` | Status grid: all 18 platforms, copy + CTA |
| `dealer:proof -- <id>` | Proof folder ZIP (artifacts + manifest) |
| `dealer:export -- <id>` | Full dealer data archive ZIP |
| `dealer:invoice -- <id> <YYYY-MM>` | Setup + monthly invoice statement |
| `vehicle:update -- <id> <stock> <kind>` | Apply price/photo/sold/removed update |
| `publish:prepare -- <id> [--dry-run]` | Prepare & Publish golden path |
| `sync:queue -- <id>` | View full publish queue + account states |
| `sync:scheduler -- [--dry-run]` | Dispatch scheduled items from queue |
| `sync:approval -- list/approve/hold/reject/release` | Operator approval workflow |
| `sync:run -- <id>` | Process READY items immediately |
| `server:start` | Start Fastify API on port 3000 |
| `ui:dev` | Start Vite operator UI on port 5173 |
| `demo:reset` | Full teardown + reseed + pipeline verification |

---

## HTTP API Surface

Server runs on port 3000. The Vite UI proxies `/api` automatically in dev.

Operator routes require the dev auth placeholder. For local UI work, set the same operator id on both sides:

```bash
# API process (.env)
DEV_OPERATOR_ID=dev-operator
DEV_OPERATOR_DEALER_IDS=

# Vite web app (apps/web/.env.local)
VITE_DEV_OPERATOR_ID=dev-operator
```

`DEV_OPERATOR_DEALER_IDS` is an optional comma-separated dealership allowlist. Leave it blank to allow the dev operator to access every seeded dealership. Public storefront reads stay anonymous; lead capture is public-write and rate-limited.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness check |
| GET | `/api/dealers` | List all dealers (operator picker) |
| GET | `/api/dealers/:id/storefront` | Dealer storefront JSON |
| GET | `/api/dealers/:id/vehicles/:stock` | Single vehicle listing |
| POST | `/api/dealers/:id/leads` | Capture lead from storefront |
| PATCH | `/api/dealers/:id/vehicles/:stock/price` | Update price |
| PATCH | `/api/dealers/:id/vehicles/:stock/photos` | Update photos |
| POST | `/api/dealers/:id/vehicles/:stock/sold` | Mark sold |
| POST | `/api/dealers/:id/vehicles/:stock/removed` | Mark removed |
| POST | `/api/dealers/:id/publish/prepare` | Prepare & Publish (body: `{dryRun, platforms}`) |
| GET | `/api/dealers/:id/publish/status` | Current publish status grid |
| GET | `/api/dealers/:id/publish/history` | SyncEvent history (cursor-paginated) |
| GET | `/api/dealers/:id/publish/accounts` | Platform account + application summary |
| GET | `/api/dealers/:id/performance/vehicles` | All vehicle performance cache rows |
| GET | `/api/dealers/:id/performance/vehicles/:stock` | Single vehicle performance by stock number |
| GET | `/api/dealers/:id/performance/platforms` | Per-platform observed assist summaries |
| GET | `/api/dealers/:id/performance/summary` | Aggregated view: counts, top movers, stale risks, best platform |
| POST | `/api/dealers/:id/performance/compute` | Trigger manual cache recomputation |

All publish endpoints return `nextRecommendedAction` — one of: `fix_blocked_vehicles`, `review_approvals`, `run_scheduler`, `resolve_partner_requirement`, `resolve_account_requirement`, `no_action`.

### Marketplace routes (public — no auth)

Documented in `openapi/openapi-marketplace.yaml`. Client in `packages/marketplace-client/`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/marketplace/vehicles` | Paginated browse with filters (see Marketplace API section) |
| GET | `/api/marketplace/vehicles/:listingId` | Single vehicle detail |
| GET | `/api/marketplace/dealers/:dealerId` | Dealer storefront index |

---

## The 18 Platforms

Defined in `src/data/platformProfiles.ts`.

| Class | Platforms |
|-------|-----------|
| `OWNED` | Dealer Storefront |
| `FEEDABLE` | Google Vehicle Ads, Meta, TikTok, Microsoft, Pinterest, Reddit, eBay Motors, X, Snapchat, LinkedIn, ADF/XML Lead Routing, Nextdoor, Apple Business Connect |
| `ASSISTED` | CarGurus, Cars.com |
| `PARTNER_DEPENDENT` | Autotrader/Cox, TrueCar |

---

## Data Model (Key Tables)

```
DealershipProfile
  └── Vehicle → VehicleMedia
  └── PlatformApplication → SubmissionAttempt, AuthorizationPacket
  └── Lead
  └── VehicleUpdate
  └── InventorySnapshot → ReadinessRun → GeneratedArtifact
  └── DealerNotification
  └── DealerSubscription
  └── SyncPolicy, PublishQueueItem, SyncRun, SyncEvent
  └── PlatformAccount
  └── VehiclePerformanceCache         Per-vehicle movement signal cache (one row per vehicle)
  └── PlatformPerformanceSummary      Per-platform observed assist summary (one row per slug)

PlatformProfile (seeded registry of 18)
PlatformProfileVersion (versioned snapshots, SHA-256 checked)
```

**Performance cache models** — see the full contract in [Performance Data Contract](#performance-data-contract).

`VehiclePerformanceCache` — keyed `(dealershipId, vehicleId)`. One row per active vehicle. `benchmarkLabel` is derived at query time, never stored.

`PlatformPerformanceSummary` — keyed `(dealershipId, platformSlug)`. One row per platform with SUBMISSION\_SENT events. `observedAssistLabel` is derived at query time, never stored.

**Cascade:** Deleting a `DealershipProfile` cascades to all child rows. `GeneratedArtifact.linkedRunId` is `onDelete: SetNull`.

---

## Performance Data Contract

This section is the authoritative reference for anyone building UI, writing API consumers, or modifying the performance pipeline. The contract is enforced by `src/tests/performanceContract.test.ts`.

### VehiclePerformanceCache — stored fields

| Field | Type | Notes |
|-------|------|-------|
| `daysOnline` | `Int` | Whole days since `createdAt` at compute time |
| `movementSignal` | `String` | FAST \| ON_TRACK \| SLOW \| STALE \| LOW_DATA |
| `comparableCount` | `Int` | Count of sold comparable vehicles used for benchmark |
| `avgComparableDays` | `Float?` | Average days-online for sold comparables. Null when `comparableCount = 0` |
| `medianComparableDays` | `Float?` | Median days-online for sold comparables. Null when `comparableCount = 0` |
| `benchmarkConfidence` | `String` | INSUFFICIENT \| LOW \| MEDIUM \| HIGH (default: INSUFFICIENT) |
| `platformAssistsJson` | `Json?` | `{ [slug]: { leads: number } }` — lead counts per platform |

**Not stored:** `benchmarkLabel` — derived at query time from `benchmarkConfidence` via `benchmarkLabel()`.

### PlatformPerformanceSummary — stored fields

| Field | Type | Notes |
|-------|------|-------|
| `avgDaysToMove` | `Float?` | Average days from first SUBMISSION_SENT to soldAt. Null when `sampleSize = 0` |
| `medianDaysToMove` | `Float?` | Median days from first SUBMISSION_SENT to soldAt. Null when `sampleSize = 0` |
| `sampleSize` | `Int` | Count of sold vehicles used in calculation (= `vehiclesSold`) |
| `leadsPerVehicle` | `Float?` | `totalLeads / vehiclesListed`. Null when `vehiclesListed = 0` |
| `confidence` | `String` | INSUFFICIENT \| LOW \| MEDIUM \| HIGH |

**Not stored:** `observedAssistLabel` — derived at query time from `confidence` via `platformAssistLabel()`.

### API response fields (VehiclePerformanceItem)

Every `GET /performance/vehicles` response item includes all of the above plus:

| Field | Source |
|-------|--------|
| `benchmarkLabel` | Derived: `benchmarkLabel(benchmarkConfidence)` |
| `firstListedAt` | ISO 8601 string from `firstListedAt` DB column |
| `computedAt` | ISO 8601 string from `computedAt` DB column |

### API response fields (PlatformPerformanceItem)

Every `GET /performance/platforms` response item includes all of the above plus:

| Field | Source |
|-------|--------|
| `observedAssistLabel` | Derived: `platformAssistLabel(confidence)` |
| `computedAt` | ISO 8601 string from `computedAt` DB column |

### Movement signal thresholds

Ratio = `daysOnline / avgComparableDays`

| Signal | Condition |
|--------|-----------|
| `LOW_DATA` | `comparableCount < 3` OR `avgComparableDays` is null/0 |
| `FAST` | ratio < 0.7 |
| `ON_TRACK` | 0.7 ≤ ratio ≤ 1.3 |
| `SLOW` | 1.3 < ratio ≤ 2.0 |
| `STALE` | ratio > 2.0 |

### Confidence thresholds (used for both benchmarks and platform summaries)

| Level | Sold vehicles | `benchmarkLabel` | `observedAssistLabel` |
|-------|--------------|------------------|-----------------------|
| `INSUFFICIENT` | 0–2 | "not enough comparable data" | "insufficient data" |
| `LOW` | 3–9 | "limited comparable data" | "possible assist" |
| `MEDIUM` | 10–29 | "comparable benchmark" | "strong observed assist" |
| `HIGH` | 30+ | "strong comparable benchmark" | "strong observed assist" |

### Language rules

These rules are enforced in tests. Any label change must pass the language contract suite.

- Use **"movement signal"** — never "velocity score", "sell-through rate", "days-to-sell".
- Use **"observed assist"** for platform labels — never "sold by [platform]", "drove X sales", "caused".
- Use **"comparable benchmark"** for vehicle benchmarks — never "predicted sell time", "expected days", "will sell in".
- `benchmarkLabel()` and `platformAssistLabel()` in `performanceMath.ts` are the single sources of label text.
- **Forbidden terms in any label:** "sold by", "drove", "caused", "ROI", "revenue", "predict", "will sell", "guaranteed", "certain", "attribution".
- `PerformanceConfidence` levels describe sample size only — not quality of the platform or likelihood of future performance.

### Testing contract

`src/tests/performanceContract.test.ts` proves:
- All required fields are present on aggregator output rows
- All required fields are present on API response items (via mock Prisma)
- LOW_DATA case: `comparableCount < 3` → `movementSignal=LOW_DATA`, `benchmarkConfidence=INSUFFICIENT`, `benchmarkLabel="not enough comparable data"`
- Platform INSUFFICIENT: `sampleSize=0` → `avgDaysToMove=null`, `medianDaysToMove=null`, `observedAssistLabel="insufficient data"`
- No label contains any forbidden attribution or predictive term
- `benchmarkLabel` and `observedAssistLabel` are deterministic, non-empty strings

---

## Key Design Decisions

**Why Prisma ^6, not ^7?** Prisma 7 removed datasource URL from `schema.prisma` and requires a driver adapter. Pinned to `^6` — upgrade path exists when there's time.

**Why `as unknown as Prisma.InputJsonValue`?** Prisma 6 enforces strict recursive `InputJsonValue` types incompatible with `Record<string, unknown>`. The cast is safe — values are JSON-serializable. All occurrences are in persistence services and scripts only.

**API `dryRun` defaults to `true`.** Operators must explicitly pass `dryRun: false` to execute Prepare & Publish via the API. CLI requires removing `--dry-run` explicitly. Both sides enforce the same safety posture.

**`lifecyclePersistenceService` mixes concerns.** `persistLead` lives in `publishing/lifecyclePersistenceService` because it was introduced alongside application-state transitions. Lead persistence should eventually move to `storefront/`. Do not touch until that refactor is scoped.

**Environment tagging.** Every `SubmissionAttempt`, `GeneratedArtifact`, `ReadinessRun`, and `PlatformCredentialRef` has `environment: MOCK | SANDBOX | PRODUCTION`. All current data is `MOCK`. This is the hard gate before any real API call.

---

## What's Working and Proven

| Capability | How to verify |
|---|---|
| 18-platform readiness validation | `poc:green`, `validate:pristine` |
| Risk matrix (4 scenario types × 18 platforms) | `poc:risk` |
| Portal lifecycle simulation | `poc:portal` |
| DB-backed dealer + inventory intake | `dealer:create:pristine` |
| Prepare & Publish golden path (dry-run + execute) | `publish:prepare -- <id> [--dry-run]` |
| Platform queue + scheduler + approval workflow | `sync:queue`, `sync:scheduler`, `sync:approval` |
| Vehicle update propagation (price, photos, sold, removed) | `vehicle:update` |
| Feed artifact generation (all 18 formats) | (internal to dealer:create + publish:prepare) |
| Proof folder ZIP | `dealer:proof` |
| Dealer data export ZIP | `dealer:export` |
| Invoice computation | `dealer:invoice -- <id> <YYYY-MM>` |
| Operator Publish Console UI | `npm run ui:dev` + open localhost:5173 |
| Publish API (prepare, status, history, accounts) | See HTTP API section above |
| Performance Insights UI (Insights tab) | `npm run ui:dev`, pick dealer, click Insights |
| Performance API (vehicle list, vehicle detail, platform list, summary, compute) | See HTTP API section above |

---

## What's Not Built Yet

1. **Marketplace publish-pipeline integration** — real HTTP dispatch from the sync engine to a `marketplace` ingest endpoint; `MarketplaceListing` projection table for pre-projected rows at scale. The consumer app (`apps/marketplace/`) and the read-only API are built and boundary-hardened. Contract: `docs/plans/marketplace-index-contract.md`.
2. **Production auth** — dev operator header only; no login, sessions, or dealer/admin role model.
3. **Sandbox / production API calls** — all `SubmissionAttempt` rows are MOCK.
4. **Background scheduler daemon** — sync runs on-demand via CLI/API.
5. **Real SMTP delivery** — `DealerNotification` writes to DB; MOCK env only.
6. **Dealer self-service capability gating** — operator portal exists; role-based dealer depth not implemented.

---

## Files That Are Safe to Ignore

- `README.md`, `README_V2.5.md`, `README_V2.5.1.md`, `PATCH_MANIFEST.md` — historical, preserved for reference
- `src/scripts/dev/fakeOnboard.ts`, `src/scripts/dev/fakeSubmitAll.ts` — legacy scripts superseded by `dealer:create`
- `src/scripts/dev/report.ts`, `src/scripts/dev/validateAll.ts` — early-iteration scripts, not in active use
- `mock-platform-receipts/`, `mock-outbox/` — gitignored, generated by poc/dev scripts

---

## Context Documents

| Doc | Contents |
|-----|----------|
| `docs/Market Research Document.md` | Business context and competitive landscape |
| `docs/go-to-market-playbook.md` | Sales motion |
| `docs/pricing-and-unit-economics.md` | Revenue model |
| `docs/technical-90-day-roadmap.md` | Full 90-day build plan |
| `docs/ai-sprint-roadmap.md` | Sprint spec that drove the DB-backed MVP build |
| `docs/mvp-scope-and-milestones.md` | Phase definitions and acceptance criteria |
