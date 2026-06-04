# Handoff Document — Auto Dealer Sales Portal

**Prepared:** 2026-06-03  
**State at handoff:** v4.0.0 · DB-backed MVP pipeline complete · 121 tests passing  
**Branch:** `master` · Commit: `72f3d1c`

---

## What This System Does

A backend pipeline that takes a dealer profile and inventory, runs readiness validation against 18 ad/marketplace platforms, generates feed artifacts for each platform, and produces a proof folder the operator can deliver to the dealer. The business model: charge a setup fee to launch, charge a monthly fee to manage.

The system lives entirely in TypeScript. There is no web UI yet. All workflows are driven through CLI scripts.

---

## Repo Layout

```
prisma/
  schema.prisma         Full DB schema — source of truth
  seed.ts               Seeds platform profiles, profile versions, pristine demo dealer

src/
  data/
    platformProfiles.ts     18 platform profile definitions (the registry)
    mockPortalResponses.ts  Mock HTTP responses per platform × condition
  fixtures/
    pristineApiValidation.fixture.ts   Pristine dealer + 3 vehicles (regression standard)
    dealership.fixture.ts / vehicles.fixture.ts   Mock data for poc scripts
  lib/
    types.ts            All shared TypeScript types (no Prisma imports)
    prisma.ts           Singleton PrismaClient
  validators/           Pure validation logic — no DB, no Prisma
  services/
    feedGeneratorService.ts       Google JSON, Meta CSV, ADF/XML, Owned JSON, dispatcher
    vehicleUpdateService.ts       Price/sold/removed propagation by integration class
    leadCaptureService.ts         Owned channel + ADF/XML lead capture
    dealerStatusService.ts        Headline/detail/CTA copy per status × class
    lifecyclePersistenceService.ts  Portal interaction, lead, vehicle update persistence
    partnerPortalService.ts       Portal lifecycle simulator
    inventorySnapshotService.ts   DB → VehiclePayload[] + InventorySnapshot row
    readinessRunService.ts        Full baseline + strict run → ReadinessRun row
    artifactWriterService.ts      Write file + GeneratedArtifact row
    proofFolderService.ts         Manifest + JSZip export
    seedService.ts                PlatformProfileVersion + pristine dealer seeding
  scripts/              CLI entry points (see "Scripts" section below)
  tests/                node:test suite — 121 tests, all pure (no DB)

docs/                   Long-form design and planning documents
exports/                Generated feed artifacts — gitignored, recreated by demo:reset
```

**Key architectural rule:** Prisma only lives in `lifecyclePersistenceService.ts`, `seedService.ts`, `inventorySnapshotService.ts`, `readinessRunService.ts`, `artifactWriterService.ts`, `proofFolderService.ts`, and `src/scripts/`. All validators and business-logic services are pure TypeScript with no DB imports.

---

## Environment Setup

**Requirements:** Node.js 22+, WampServer (MySQL 8+), npm

```bash
# 1. Clone and install
npm install

# 2. Create .env (copy from .env.example, adjust if needed)
# Default: mysql://root:@localhost:3306/dealer_onboarding_poc

# 3. Push schema and seed
npm run db:push
npm run db:seed

# 4. Verify everything works
npm run demo:reset
```

After `demo:reset` you should see:
```
Demo reset complete. Dealer ID: <id>. Artifacts: 18. Tests: run npm test.
```

**`.env` values:**
```
DATABASE_URL="mysql://root:@localhost:3306/dealer_onboarding_poc"
APP_BASE_URL="http://localhost:5173"
MOCK_OUTBOX_DIR="./mock-outbox"
FEED_EXPORTS_DIR="./exports"   # optional, defaults to ./exports
```

---

## The 10 Commands That Must Always Pass

This is the regression contract. Run these after any change:

```bash
npm test                            # 121 tests, 0 failing
npm run poc:green                   # 18/18 platforms GREEN
npm run poc:risk                    # 90/90 risk matrix expectations
npm run poc:portal                  # 18/18 platforms reach ACTIVE on happy path
npm run validate:pristine           # 18/18 GREEN baseline, 0 RED strict (fixture)
npm run validate:pristine:db        # same, reading from DB
npm run dealer:create:pristine      # exits 0, 18 GREEN, 18 artifacts written
npm run dealer:status <dealer-id>   # prints full status grid from DB
npm run dealer:proof <dealer-id>    # exports ZIP with manifest, exits 0
npm run demo:reset                  # full teardown + reseed + all checks, exits 0
```

If any of these fail, do not ship.

---

## Scripts Reference

| Command | What it does |
|---|---|
| `npm run db:push` | Sync schema to MySQL (safe, additive) |
| `npm run db:seed` | Seed platform profiles + profile versions + pristine dealer |
| `npm run db:reset` | Force-reset DB + re-seed (destructive) |
| `npm test` | Build + run all tests |
| `npm run typecheck` | TypeScript check only (no emit) |
| `npm run poc:green` | Prove 18/18 platforms GREEN (in-memory, no DB) |
| `npm run poc:risk` | Prove risk matrix expectations (in-memory) |
| `npm run poc:portal` | Prove portal lifecycle happy/rejection arcs (in-memory) |
| `npm run validate:pristine` | Validate pristine fixture against all 18 platforms |
| `npm run validate:pristine:db` | Same but loads dealer + inventory from DB |
| `npm run dealer:create:pristine` | Full pipeline for pristine dealer |
| `npm run dealer:create -- --dealer-file <path>` | Full pipeline for dealer from JSON file |
| `npm run dealer:status -- <id>` | Status grid for a dealer by ID |
| `npm run dealer:proof -- <id>` | Export proof folder ZIP for a dealer |
| `npm run demo:reset` | Full reset and pipeline verification |

---

## The 18 Platforms

Defined in `src/data/platformProfiles.ts`. Each has an `integrationClass`:

| Class | Meaning | Platforms |
|---|---|---|
| `OWNED` | We build and manage it | Dealer Storefront |
| `FEEDABLE` | Direct feed/API, self-serve | Google, Meta, TikTok, Microsoft, Pinterest, Reddit, eBay, X, Snapchat, LinkedIn, Nextdoor, Apple |
| `ASSISTED` | Manual/email handoff | Cars.com, CarGurus, Autotrader/Cox |
| `PARTNER_DEPENDENT` | Requires commercial agreement | TrueCar, ADF/XML Lead Routing |

---

## Data Model (Key Tables)

```
DealershipProfile         Core dealer record
  └── Vehicle             One per VIN, dealershipId FK
        └── VehicleMedia  Photos and other media
  └── PlatformApplication Status per platform (NOT_STARTED → ACTIVE)
        └── SubmissionAttempt  Each outbound attempt, linked to environment
  └── Lead                Captured from owned channel or ADF
  └── VehicleUpdate       Price/sold/removed events (event-sourced)
  └── InventorySnapshot   Point-in-time vehicle list (JSON + checksum)
        └── ReadinessRun  Baseline + strict results against all 18 platforms
              └── GeneratedArtifact  Feed files (metadata only; content in ./exports/)
  └── DealerNotification  Async notification queue
  └── PlatformCredentialRef  Opaque credential refs (no raw secrets)

PlatformProfile           Registry of 18 platform definitions (seeded)
PlatformProfileVersion    Versioned snapshot of a profile (SHA-256 checksum)
DealerSubscription        Billing plan for a dealer
```

**Cascade behavior:** Deleting a `DealershipProfile` cascades to all child rows. `GeneratedArtifact.linkedRunId` is set to NULL if its `ReadinessRun` is deleted (`onDelete: SetNull`).

---

## Key Design Decisions

**Why Prisma ^6, not ^7?** Prisma 7 removed datasource URL from `schema.prisma` and requires a driver adapter for `PrismaClient`. That's a significant migration (new packages, restructured instantiation). Pinned to `^6` to stay on the roadmap's original assumptions. Upgrade path exists when there's time — see [Prisma 7 migration guide](https://pris.ly/d/major-version-upgrade).

**Why no HTTP API yet?** Operator CLI scripts prove the full pipeline end-to-end. A web layer adds accidental complexity before the data model is stable. The next natural step is an HTTP layer over the same services, not a rewrite.

**Why `as unknown as Prisma.InputJsonValue`?** Prisma 6 enforces strict recursive `InputJsonValue` types for `Json` fields, which is incompatible with `Record<string, unknown>` (the project's `JsonRecord` type). The cast is safe — the runtime values are JSON-serializable objects. All occurrences are in scripts and persistence services only.

**Why no `@@unique` on `PlatformProfileVersion(platformSlug, schemaVersion)`?** The sprint spec omitted it. Idempotency is handled in `seedService.ts` with a `findFirst` check. Add the constraint in the next schema migration pass if needed — it would simplify future upserts.

**Environment tagging:** Every `SubmissionAttempt`, `GeneratedArtifact`, `ReadinessRun`, and `PlatformCredentialRef` has an `environment: Environment` column (MOCK/SANDBOX/PRODUCTION). All data written today is `MOCK`. This is the gate before any real API call.

---

## What's Working and Proven

| Capability | Command | Notes |
|---|---|---|
| 18-platform readiness validation | `poc:green`, `validate:pristine` | Pure, no DB required |
| Risk matrix (pass/fail scenarios) | `poc:risk` | 90/90 expectations |
| Portal lifecycle simulation | `poc:portal` | 18/18 happy path → ACTIVE |
| DB-backed dealer + inventory intake | `dealer:create:pristine` | Idempotent upsert |
| Inventory snapshot with checksum | (internal to readiness run) | SHA-256 of vehicle JSON |
| Readiness run stored in DB | (internal to dealer:create) | baseline + strict, green/yellow/red counts |
| Feed artifact generation | (internal to dealer:create) | 18 files written to ./exports/ |
| Artifact DB registration | (internal to dealer:create) | checksum, path, sizeBytes |
| Proof folder manifest | `dealer:proof` | Includes lead count, platform count |
| Proof folder ZIP export | `dealer:proof` | JSZip, manifest.json at root |
| DB-mode pristine validation | `validate:pristine:db` | Reads dealer + vehicles from DB |
| Full pipeline reset | `demo:reset` | Idempotent, exits 0 |
| Status grid CLI | `dealer:status` | All 18 platforms, copy + CTA |

---

## What's Not Built Yet

In priority order (see `docs/technical-90-day-roadmap.md` for full detail):

1. **Owned storefront served over HTTP** — the JSON artifact is generated, but there's no HTTP server. Dealers can't browse it yet.
2. **Lead capture wired to DB from a live form** — `leadCaptureService.ts` exists and writes to DB, but there's no HTTP endpoint or frontend to call it.
3. **Platform application lifecycle from a real intake** — `PlatformApplication` records aren't created automatically when a dealer is onboarded. The `dealer:status` command shows NOT_STARTED for all platforms because no applications exist yet.
4. **Assisted channel packet submission tracking** — authorization packets are generated (see `fakeSubmitAll.ts`) but not wired into the `dealer:create` flow.
5. **Inventory update propagation from real events** — `vehicleUpdateService.ts` works in-memory; it's not called when a vehicle is updated in the DB.
6. **HTTP API** — no Express/Fastify layer yet. All workflows are CLI-only.
7. **Sandbox credential validation** — `PlatformCredentialRef` model exists in schema; no real API calls.
8. **CSV inventory import** — JSON only today.
9. **Dealer notifications via SMTP** — `DealerNotification` model exists; delivery is log-only in MOCK.
10. **Monthly invoice generation** — `DealerSubscription` model exists; no invoice computation script.

---

## Suggested Next Sprint

The highest-value item that directly unlocks revenue is **platform application creation + assisted channel workflow**:

1. When `dealer:create` runs, auto-create a `PlatformApplication` row for each platform the dealer selected in `desiredChannels` (status: `READY_TO_SUBMIT`).
2. For FEEDABLE platforms: mark as `SUBMITTED` immediately after the feed artifact is written; `ACTIVE` after a configurable hold.
3. For ASSISTED platforms: generate the authorization packet → `SubmissionAttempt` row (MOCK_EMAIL) → status: `SUBMITTED`.
4. Wire `vehicleUpdateService.ts` into a real DB update path: when a vehicle's `priceCents` is updated, create a `VehicleUpdate` row and propagate.
5. Add `dealer:activate` script that transitions a platform application through to ACTIVE for demo purposes.

This makes `dealer:status` actually show meaningful lifecycle state instead of all NOT_STARTED.

---

## Files That Are Safe to Ignore

- `README.md` — outdated v2 patch instructions, preserved for history
- `README_V2.5.md`, `README_V2.5.1.md` — historical release notes
- `PATCH_MANIFEST.md` — historical file manifest
- `src/scripts/fakeOnboard.ts`, `src/scripts/fakeSubmitAll.ts` — legacy scripts superseded by `dealer:create`
- `src/scripts/report.ts`, `src/scripts/validateAll.ts` — early-iteration scripts, not in active use
- `mock-platform-receipts/` — gitignored, generated by poc scripts

---

## Contact / Context

See `docs/Market Research Document.md` for the business context, `docs/go-to-market-playbook.md` for the sales motion, and `docs/pricing-and-unit-economics.md` for the revenue model.

The `docs/ai-sprint-roadmap.md` is the spec that drove tonight's build — useful reference for why specific decisions were made.
