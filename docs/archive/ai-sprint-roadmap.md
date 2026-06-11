# AI Sprint Roadmap — Strong MVP Tonight

**Written for:** AI developer executing on this codebase  
**Current state:** v4.0.0 · 105 tests passing · 18 platforms · controlled bubble proven  
**Target:** DB-backed dealer intake → readiness run → artifact store → proof folder → operator scripts → demo reset  
**Constraint:** Additive schema changes only. `npm test` must stay at 105+ after every phase. Never break `poc:green`, `poc:risk`, `poc:portal`, `validate:pristine`.

---

## What Is Already Built — Do Not Rebuild

```
src/services/feedGeneratorService.ts        — Google JSON, Meta CSV, ADF/XML, Owned JSON, dispatcher
src/services/vehicleUpdateService.ts        — PRICE_CHANGE/SOLD/REMOVED propagation by integration class
src/services/leadCaptureService.ts          — owned channel + ADF/XML lead capture
src/services/dealerStatusService.ts         — headline/detail/CTA per ApplicationStatus × IntegrationClass
src/services/lifecyclePersistenceService.ts — Prisma writes for portal interactions, leads, vehicle updates
src/services/partnerPortalService.ts        — simulatePortalInteraction, runPortalLifecycle
src/data/platformProfiles.ts               — 18 profiles with integrationClass
src/data/mockPortalResponses.ts             — cherry-picked responses for all 18 platforms
src/lib/types.ts                            — IntegrationClass, VehicleUpdateKind, DealerStatusCopy, FeedArtifact, etc.
prisma/schema.prisma                        — Lead, VehicleUpdate, DealerSubscription already present
```

**Fixtures:**
- `mockDealership` / `mockVehicles` — risk matrix / poc scripts only
- `pristineApiValidation.fixture.ts` — regression standard, must never fail `validate:pristine`

**Established patterns to follow:**
- Services are pure TypeScript — no Prisma imports in services or validators
- Prisma lives only in `src/services/lifecyclePersistenceService.ts` and `src/scripts/`
- All imports use `.js` extension (ESM)
- Tests use `node:test` + `node:assert/strict` with `describe`/`it`
- Test files: `src/tests/*.test.ts`, built to `dist/` before running

---

## Tonight's Build Sequence

Six phases. Each phase ends with a verification command. Do not start the next phase until verification passes.

---

## Phase 1 — Schema Additions (foundation for everything)

**Owns:** `prisma/schema.prisma` only. One AI at a time.  
**Time target:** 20 minutes

Add these models and enum to `prisma/schema.prisma`. All additions — nothing removed or renamed.

### New enum

```prisma
enum Environment {
  MOCK
  SANDBOX
  PRODUCTION
}
```

### New models

```prisma
model PlatformProfileVersion {
  id            String   @id @default(cuid())
  platformSlug  String   @db.VarChar(80)
  schemaVersion String   @db.VarChar(80)
  profileJson   Json
  checksum      String   @db.VarChar(64)
  seededAt      DateTime @default(now())

  @@index([platformSlug])
}

model InventorySnapshot {
  id            String   @id @default(cuid())
  dealershipId  String
  vehicleCount  Int
  snapshotJson  Json
  checksum      String   @db.VarChar(64)
  createdAt     DateTime @default(now())

  dealership    DealershipProfile @relation(fields: [dealershipId], references: [id], onDelete: Cascade)
  readinessRuns ReadinessRun[]

  @@index([dealershipId])
}

model ReadinessRun {
  id                  String      @id @default(cuid())
  dealershipId        String
  inventorySnapshotId String
  environment         Environment @default(MOCK)
  runMode             String      @db.VarChar(24)   // BASELINE | STRICT | BOTH
  overallStatus       String      @db.VarChar(24)   // GREEN | YELLOW | RED
  greenCount          Int
  yellowCount         Int
  redCount            Int
  validatorVersion    String      @db.VarChar(40)
  resultsJson         Json
  createdAt           DateTime    @default(now())

  dealership          DealershipProfile @relation(fields: [dealershipId], references: [id], onDelete: Cascade)
  inventorySnapshot   InventorySnapshot @relation(fields: [inventorySnapshotId], references: [id])
  artifacts           GeneratedArtifact[]

  @@index([dealershipId])
}

model GeneratedArtifact {
  id             String      @id @default(cuid())
  dealershipId   String
  platformSlug   String      @db.VarChar(80)
  format         String      @db.VarChar(80)
  filename       String      @db.VarChar(255)
  storagePath    String      @db.VarChar(512)
  checksum       String      @db.VarChar(64)
  sizeBytes      Int
  environment    Environment @default(MOCK)
  linkedRunId    String?
  linkedSubmissionId String?
  expiresAt      DateTime?
  createdAt      DateTime    @default(now())

  dealership     DealershipProfile @relation(fields: [dealershipId], references: [id], onDelete: Cascade)
  readinessRun   ReadinessRun?     @relation(fields: [linkedRunId], references: [id])

  @@index([dealershipId])
  @@index([platformSlug])
}

model PlatformCredentialRef {
  id              String      @id @default(cuid())
  platformSlug    String      @db.VarChar(80)
  dealershipId    String?
  environment     Environment
  credentialKey   String      @db.VarChar(255)   // opaque ref — never the raw secret
  expiresAt       DateTime?
  lastValidatedAt DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  dealership      DealershipProfile? @relation(fields: [dealershipId], references: [id])

  @@index([platformSlug])
}

model DealerNotification {
  id           String    @id @default(cuid())
  dealershipId String
  type         String    @db.VarChar(60)   // LEAD_CAPTURED | STATUS_CHANGED | ACTION_REQUIRED | REPORT_READY
  payload      Json
  deliveredAt  DateTime?
  createdAt    DateTime  @default(now())

  dealership   DealershipProfile @relation(fields: [dealershipId], references: [id], onDelete: Cascade)

  @@index([dealershipId])
}
```

### Add relations to existing models

On `DealershipProfile`, add:
```prisma
  inventorySnapshots    InventorySnapshot[]
  readinessRuns         ReadinessRun[]
  generatedArtifacts    GeneratedArtifact[]
  credentialRefs        PlatformCredentialRef[]
  notifications         DealerNotification[]
```

On `SubmissionAttempt`, update `artifactPath` to also add:
```prisma
  environment    Environment @default(MOCK)
```

**Verification:**
```
npm run db:push
npm run typecheck
```
Both must exit 0. If `db:push` fails: check relation names and foreign key targets. Do not proceed until clean.

---

## Phase 2 — Seed Services (populate DB from profiles + pristine fixture)

**Owns:** `prisma/seed.ts` + new `src/services/seedService.ts`  
**Depends on:** Phase 1 complete and `db:push` clean  
**Time target:** 25 minutes

### Create `src/services/seedService.ts`

```typescript
// Exports:
export async function seedPlatformProfileVersions(prisma: PrismaClient): Promise<void>
// For each of the 18 platform profiles in platformProfiles:
//   - serialize to JSON
//   - generate SHA-256 checksum of JSON string (use node:crypto createHash('sha256'))
//   - upsert PlatformProfileVersion by platformSlug + schemaVersion
//   - log: "seeded {slug} @ {schemaVersion}"

export async function seedPristineDealer(prisma: PrismaClient): Promise<string>
// Insert pristineApiDealership + pristineApiVehicles (with media) into DB
// Returns dealershipId
// Skip if legalName already exists (idempotent)
// Return existing ID if already seeded
```

**Checksum pattern** (reuse across all checksum generation):
```typescript
import { createHash } from 'node:crypto';
function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
```

### Update `prisma/seed.ts`

Import and call both functions. The seed script already calls platform profile seeding — add `seedPlatformProfileVersions` and `seedPristineDealer`.

### Add script to `package.json`

```json
"db:seed:versions": "npm run -s build && node dist/prisma/seed.js"
```

(The existing `db:seed` can handle this — just make sure the new functions are called.)

**Verification:**
```
npm run db:push
npm run db:seed
```
Check DB has 18 `PlatformProfileVersion` rows and 1 `DealershipProfile` row for the pristine dealer. Log output must confirm both.

---

## Phase 3 — Inventory Snapshot + Readiness Run Services (DB-backed validation)

**Owns:** `src/services/inventorySnapshotService.ts` + `src/services/readinessRunService.ts`  
**Depends on:** Phase 1 + 2 complete  
**Time target:** 30 minutes  
**Parallel track note:** This phase and Phase 4 (artifact writer) can be built simultaneously by two AIs. They share no files until Phase 5 wires them together.

### Create `src/services/inventorySnapshotService.ts`

```typescript
// Exports:

export async function captureInventorySnapshot(
  prisma: PrismaClient,
  dealershipId: string
): Promise<{ snapshotId: string; vehicles: VehiclePayload[] }>
// 1. Query Vehicle + VehicleMedia for dealershipId
// 2. Map DB records to VehiclePayload shape (same shape as src/lib/types.ts VehiclePayload)
// 3. Serialize to JSON string
// 4. SHA-256 checksum
// 5. Insert InventorySnapshot row
// 6. Return { snapshotId, vehicles: VehiclePayload[] }
// Note: priceCents stored as Int in DB — keep as-is in snapshot

export function dbVehicleToPayload(vehicle: DbVehicle): VehiclePayload
// Maps a Prisma Vehicle + media rows to VehiclePayload
// Vehicle.options and Vehicle.starCore are Json fields — cast appropriately
```

### Create `src/services/readinessRunService.ts`

```typescript
// Exports:

export async function runAndPersistReadiness(
  prisma: PrismaClient,
  dealershipId: string,
  options?: { environment?: 'MOCK' | 'SANDBOX' | 'PRODUCTION'; validatorVersion?: string }
): Promise<{ runId: string; baselineResults: PlatformReadinessReport[]; strictResults: PlatformReadinessReport[]; overallStatus: ReadinessColor }>
// 1. captureInventorySnapshot → { snapshotId, vehicles }
// 2. Fetch DealershipProfile from DB → map to DealershipPayload
// 3. Run validatePlatformReadiness for all 18 platforms (baseline)
// 4. Run validatePlatformReadinessStrict for all 18 platforms (strict)
// 5. Determine overallStatus: GREEN if all baseline GREEN, YELLOW if any YELLOW, RED if any RED
// 6. Insert ReadinessRun row with resultsJson = { baseline: [...], strict: [...] }
// 7. Return run data

export function dbDealershipToPayload(dealership: DbDealership): DealershipPayload
// Maps Prisma DealershipProfile to DealershipPayload
// rooftopAddress and primaryContact are Json fields — cast to correct sub-types
```

### Critical import note

`readinessRunService` imports from:
- `../validators/platformReadinessValidator.js` (pure, no Prisma)
- `../data/platformProfiles.js`
- `./inventorySnapshotService.js`

No circular dependencies. Keep Prisma confined to the persistence services and scripts.

**Verification:**
```
npm run typecheck
npm test
```
105+ tests must pass. No new tests required yet (these services will be tested via the operator scripts in Phase 5).

---

## Phase 4 — Artifact Writer + Proof Folder (parallel with Phase 3)

**Owns:** `src/services/artifactWriterService.ts` + `src/services/proofFolderService.ts`  
**Depends on:** Phase 1 complete (GeneratedArtifact model available)  
**Time target:** 30 minutes  
**Parallel track note:** Build simultaneously with Phase 3. Does not touch Phase 3 files.

### Create `src/services/artifactWriterService.ts`

```typescript
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type { FeedArtifact } from '../lib/types.js';

const EXPORTS_DIR = process.env['FEED_EXPORTS_DIR'] ?? './exports';

// Exports:

export async function writeAndRegisterArtifact(
  prisma: PrismaClient,
  dealershipId: string,
  artifact: FeedArtifact,
  options?: { linkedRunId?: string; linkedSubmissionId?: string; environment?: 'MOCK' | 'SANDBOX' | 'PRODUCTION'; expiresAt?: Date }
): Promise<{ artifactId: string; storagePath: string; checksum: string }>
// 1. Compute SHA-256 of artifact.content
// 2. Write to ./exports/{platformSlug}/{filename} (mkdir -p)
// 3. Insert GeneratedArtifact row with path, checksum, sizeBytes, format, linkedRunId
// 4. Return { artifactId, storagePath, checksum }

export async function verifyArtifact(storagePath: string, expectedChecksum: string): Promise<boolean>
// Read file, compute checksum, compare to expectedChecksum
// Returns true if match, false if missing or mismatch

export function computeChecksum(content: string): string
// SHA-256 of content string — exported so other services can use it
```

### Create `src/services/proofFolderService.ts`

```typescript
import JSZip from 'jszip';  // add jszip to dependencies

// Exports:

export type ProofFolderManifest = {
  dealershipId: string;
  dealerName: string;
  generatedAt: string;
  readinessRunId: string | null;
  overallStatus: string | null;
  artifacts: Array<{
    artifactId: string;
    platformSlug: string;
    format: string;
    filename: string;
    storagePath: string;
    checksum: string;
    sizeBytes: number;
    environment: string;
    createdAt: string;
  }>;
  leadCount: number;
  activePlatformCount: number;
}

export async function buildProofFolderManifest(
  prisma: PrismaClient,
  dealershipId: string,
  linkedRunId?: string
): Promise<ProofFolderManifest>
// Query GeneratedArtifact rows for dealershipId (optionally filtered by linkedRunId)
// Query Lead count for dealershipId
// Query PlatformApplication ACTIVE count for dealershipId
// Build and return manifest

export async function exportProofFolderZip(
  prisma: PrismaClient,
  dealershipId: string,
  outputPath: string,
  linkedRunId?: string
): Promise<{ zipPath: string; manifest: ProofFolderManifest }>
// 1. Build manifest
// 2. For each artifact in manifest, read file from storagePath
// 3. Add each file to JSZip under {platformSlug}/{filename}
// 4. Add manifest.json to root of zip
// 5. Write zip to outputPath
// 6. Return { zipPath, manifest }
```

**Add to package.json dependencies:**
```json
"jszip": "latest"
```
Run `npm install` after editing package.json.

**Verification:**
```
npm install
npm run typecheck
npm test
```

---

## Phase 5 — Operator Scripts (wires everything together)

**Owns:** `src/scripts/dealerCreate.ts`, `src/scripts/dealerStatus.ts`, `src/scripts/dealerProof.ts`, `src/scripts/demoReset.ts`, and `package.json` scripts  
**Depends on:** Phases 1–4 all complete  
**Time target:** 35 minutes

### `src/scripts/dealerCreate.ts`

CLI: `node dist/src/scripts/dealerCreate.js [--dealer-file <path>] [--use-pristine]`

```
Flow:
1. If --use-pristine: load pristineApiDealership + pristineApiVehicles from fixtures
   If --dealer-file: load JSON from path → parse as DealershipPayload + VehiclePayload[]
2. Upsert DealershipProfile + Vehicles + VehicleMedia to DB
3. runAndPersistReadiness → ReadinessRun row
4. generateFeedForPlatform for all 18 platforms → writeAndRegisterArtifact for each
5. buildProofFolderManifest → print summary
6. Print: dealer ID, readiness summary (GREEN/YELLOW/RED per platform), artifact count, proof folder ready

Exit 0 if all baseline GREEN, exit 1 otherwise.
```

### `src/scripts/dealerStatus.ts`

CLI: `node dist/src/scripts/dealerStatus.js <dealershipId>`

```
Flow:
1. Fetch DealershipProfile, PlatformApplication[], most recent ReadinessRun, Lead count
2. For each of 18 platforms:
   - Find matching PlatformApplication (or use NOT_STARTED if absent)
   - getDealerStatusCopy(platform, application.status, dealerAction)
   - Print: getDealerStatusBadge + headline + detail + CTA
3. Print: total leads (last 30 days), active platforms, open actions
```

### `src/scripts/dealerProof.ts`

CLI: `node dist/src/scripts/dealerProof.js <dealershipId> [--output <path>]`

```
Flow:
1. exportProofFolderZip(prisma, dealershipId, outputPath)
2. Print manifest summary: artifact count, platforms covered, lead count, checksum list
3. Print ZIP path
```

### `src/scripts/demoReset.ts`

CLI: `node dist/src/scripts/demoReset.js`

```
Flow:
1. Print "Resetting demo data..."
2. Delete all DealershipProfile rows WHERE legalName = pristine dealer name (cascades to everything)
3. Call seedPristineDealer
4. Run dealerCreate --use-pristine logic inline (no subprocess)
5. Run full poc scripts inline: pocGreen, pocRisk, pocPortal
6. Print final: "Demo reset complete. Dealer ID: {id}. Artifacts: {count}. Tests: run npm test."
Exit 0 only if all 18 platforms GREEN and all artifacts written.
```

### Add to `package.json`

```json
"dealer:create":    "npm run -s build && node dist/src/scripts/dealerCreate.js",
"dealer:create:pristine": "npm run -s build && node dist/src/scripts/dealerCreate.js --use-pristine",
"dealer:status":    "npm run -s build && node dist/src/scripts/dealerStatus.js",
"dealer:proof":     "npm run -s build && node dist/src/scripts/dealerProof.js",
"demo:reset":       "npm run -s build && node dist/src/scripts/demoReset.js"
```

**Verification:**
```
npm run dealer:create:pristine
```
Should print 18/18 GREEN, artifact count, proof folder ready. Exit 0.

---

## Phase 6 — DB-Mode `validate:pristine` + Final Tests

**Owns:** `src/scripts/validatePristine.ts` (update), `src/tests/` (new tests)  
**Depends on:** Phases 1–5 complete  
**Time target:** 20 minutes

### Update `src/scripts/validatePristine.ts`

Add `--db` flag support:

```
If --db flag present:
  1. Load dealer from DB by legalName (pristine dealer name)
  2. captureInventorySnapshot → vehicles from DB
  3. Run validation from DB data
  4. Print: "[DB MODE]" prefix
  5. Exit 0 only if 18/18 GREEN baseline and 0 RED strict

Default (no flag): keep existing fixture-based behavior unchanged
```

Add to `package.json`:
```json
"validate:pristine:db": "npm run -s build && node dist/src/scripts/validatePristine.js --db"
```

### New tests to write

`src/tests/inventorySnapshotService.test.ts` — no DB needed, test the shape mapping:
```
- dbVehicleToPayload: maps all required fields
- dbVehicleToPayload: null/optional fields don't throw
- dbDealershipToPayload: maps legalName, rooftopAddress, primaryContact
```

`src/tests/artifactWriterService.test.ts` — test the pure functions only (no Prisma):
```
- computeChecksum: same input → same output (deterministic)
- computeChecksum: different input → different output
- computeChecksum: returns 64-char hex string
```

`src/tests/proofFolderService.test.ts` — test manifest shape:
```
- manifest includes dealershipId, generatedAt, artifacts array
- empty artifacts array when no artifacts exist for dealer
```
Use a mock Prisma client pattern: `{ generatedArtifact: { findMany: async () => [] }, lead: { count: async () => 0 }, platformApplication: { count: async () => 0 } }` cast as `PrismaClient`.

**Final verification:**
```
npm test
npm run poc:green
npm run poc:risk
npm run poc:portal
npm run validate:pristine
npm run dealer:create:pristine
npm run demo:reset
```

All must exit 0. Test count must be ≥ 115 (105 existing + new tests).

---

## Parallel Execution Map

If two AIs are active simultaneously:

```
Phase 1 (schema)     → AI-A only. AI-B waits. Schema is a shared file.
Phase 2 (seed)       → AI-A only (prisma/seed.ts). AI-B starts Phase 4.
Phase 3 (snapshots)  → AI-A, after Phase 2 done.
Phase 4 (artifacts)  → AI-B, simultaneously with Phase 3.
Phase 5 (scripts)    → Both AIs. AI-A: dealerCreate + demoReset. AI-B: dealerStatus + dealerProof.
Phase 6 (tests/DB validate) → Both AIs. AI-A: update validatePristine. AI-B: write new tests.
```

**Shared file coordination:**
- `prisma/schema.prisma` — Phase 1 only, one AI, never edited again tonight
- `package.json` — each AI appends their new scripts; merge cleanly (no duplicate keys)
- `src/lib/types.ts` — no changes needed tonight (all new types are Prisma-native)
- `src/data/platformProfiles.ts` — read-only tonight

---

## What NOT to Build Tonight

Do not start these. They belong in week 2+ of the 90-day roadmap.

- Web UI or HTTP API endpoints
- Sandbox credential validation (needs external account setup)
- CSV inventory import
- Multi-dealer load test (5 dealers × 50 vehicles)
- Real SMTP notifications (mock env log is sufficient)
- Platform health monitoring jobs (scheduled/cron)
- ZIP proof export using external object storage
- Structured `ReadinessIssue` model refactor
- Any modification to existing validator logic or risk matrix

---

## Regression Guard

After every file edit, before moving to the next task, run:

```
npm run typecheck 2>&1 | tail -5
```

If it errors: fix it before writing the next file. TypeScript errors compound and become hard to untangle after 3+ files.

After each phase completes:

```
npm test 2>&1 | grep -E "^# (tests|pass|fail)"
```

If `fail` is non-zero: stop. Fix. Do not continue to the next phase with a broken test suite.

---

## MVP Done Condition

The MVP is strong when all of the following pass on a clean DB (after `npm run demo:reset`):

```bash
npm test                          # ≥115 passing, 0 failing
npm run poc:green                 # 18/18 GREEN
npm run poc:risk                  # 40/40 (or N/N) expectations pass  
npm run poc:portal                # 18/18 ACTIVE on happy path
npm run validate:pristine         # 18/18 GREEN baseline, 0 RED strict
npm run validate:pristine:db      # same, from DB
npm run dealer:create:pristine    # exits 0, prints 18 GREEN + artifacts
npm run dealer:status <id>        # prints full status grid from DB
npm run dealer:proof <id>         # exits 0, ZIP exported with manifest
npm run demo:reset                # exits 0, full pipeline clean
```

When those 10 commands all exit 0, the MVP is buildable, demoable, and describable without touching code.
