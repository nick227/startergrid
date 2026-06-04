# Handoff Document — Auto Dealer Sales Portal

**Updated:** 2026-06-04  
**State:** v4.0.0 · DB-backed MVP + Publish Pipeline + Operator UI · 409 tests passing  
**Branch:** `main`

---

## What This System Does

A backend pipeline that takes a dealer profile and inventory, runs readiness validation against 18 ad/marketplace platforms, generates feed artifacts per platform, queues and dispatches them via a scheduler, and produces proof + invoice artifacts the operator delivers to the dealer.

The business model: charge a setup fee to launch, a monthly fee to manage.

The system is TypeScript throughout. The **operator console UI** (`apps/web/`) is now live — operators can open a dealer, see publish readiness, run dry-run previews, and execute Prepare & Publish from a browser. CLI scripts remain available for all operations.

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

  tests/                      node:test suite — 409 tests, all pure (no DB)

apps/
  web/                        Operator Publish Console (Vite + React + Tailwind)
                              Dev: npm run ui:dev (port 5173, proxied to API on 3000)

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
npm test                              # 409 tests, 0 failing
npm run smoke:test                    # 6/6 system checks (DB, profiles, typecheck)
npm run typecheck                     # TypeScript, no emit

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
| `test` | Build + run all 409 tests |
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

All publish endpoints return `nextRecommendedAction` — one of: `fix_blocked_vehicles`, `review_approvals`, `run_scheduler`, `resolve_partner_requirement`, `resolve_account_requirement`, `no_action`.

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

PlatformProfile (seeded registry of 18)
PlatformProfileVersion (versioned snapshots, SHA-256 checked)
```

**Cascade:** Deleting a `DealershipProfile` cascades to all child rows. `GeneratedArtifact.linkedRunId` is `onDelete: SetNull`.

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

---

## What's Not Built Yet

1. **Real SMTP delivery** — `DealerNotification` writes to DB; MOCK env only.
2. **Sandbox / production API calls** — all `SubmissionAttempt` rows are MOCK.
3. **CSV inventory import** — JSON only.
4. **Dealer-facing portal** — UI is operator-only; no dealer login or self-service view.
5. **Webhook / real-time feed push** — scheduler runs on-demand; no background daemon yet.
6. **Admin / multi-tenant auth** — no authentication on any API endpoint.
7. **`@@unique` on `PlatformProfileVersion(platformSlug, schemaVersion)`** — idempotency handled in code; DB constraint not added yet.

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
