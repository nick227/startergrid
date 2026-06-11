# Dealer Online Sales Performance Engine — Implementation Plan

**Date:** 2026-06-05  
**Status:** Ready to implement

---

## Goal

Cached aggregate layer that answers: *"For this vehicle, compared to similar vehicles, is it moving faster or slower than expected, and which platforms usually move this kind of car best?"*

No live benchmark computation during UI browsing. Aggregate jobs run on schedule or via manual trigger.

---

## Comparable Vehicle Rule

Same make + same model + model year within ±3 + price within ±5%.  
Minimum 3 sold comparables to report a benchmark; otherwise `LOW_DATA` / `INSUFFICIENT`.

---

## Language Constraints

- "strong observed assist" / "best observed platform" — never "sold by"
- Show confidence label (`HIGH / MEDIUM / LOW / INSUFFICIENT`) on all platform data
- Show "not enough comparable data" when comparableCount < 3

---

## New Prisma Models

Add to `prisma/schema.prisma` before the closing brace, after `PlatformAccount`:

```prisma
model VehiclePerformanceCache {
  id                String    @id @default(cuid())
  dealershipId      String
  vehicleId         String    @unique
  stockNumber       String    @db.VarChar(80)
  make              String    @db.VarChar(80)
  model             String    @db.VarChar(80)
  year              Int
  priceCents        Int
  condition         String    @db.VarChar(10)
  daysOnline        Int
  firstListedAt     DateTime
  comparableCount   Int       @default(0)
  avgComparableDays Float?
  movementSignal    String    @db.VarChar(16)  // FAST|ON_TRACK|SLOW|STALE|LOW_DATA
  platformAssistsJson Json?                     // { [slug]: { leads: number } }
  computedAt        DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  dealership  DealershipProfile @relation(fields: [dealershipId], references: [id], onDelete: Cascade)
  vehicle     Vehicle           @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  @@index([dealershipId])
  @@index([dealershipId, movementSignal])
}

model PlatformPerformanceSummary {
  id               String   @id @default(cuid())
  dealershipId     String
  platformSlug     String   @db.VarChar(80)
  vehiclesListed   Int      @default(0)
  vehiclesSold     Int      @default(0)
  avgDaysToMove    Float?
  medianDaysToMove Float?
  totalLeads       Int      @default(0)
  leadsPerVehicle  Float?
  confidence       String   @db.VarChar(16)  // INSUFFICIENT|LOW|MEDIUM|HIGH
  sampleSize       Int      @default(0)
  computedAt       DateTime @default(now())
  updatedAt        DateTime @updatedAt

  dealership  DealershipProfile @relation(fields: [dealershipId], references: [id], onDelete: Cascade)

  @@unique([dealershipId, platformSlug])
  @@index([dealershipId])
}
```

**Back-relations to add** in existing models:

```prisma
// In DealershipProfile:
vehiclePerformanceCaches     VehiclePerformanceCache[]
platformPerformanceSummaries PlatformPerformanceSummary[]

// In Vehicle:
performanceCache  VehiclePerformanceCache?
```

---

## New Files

```
src/services/performance/performanceMath.ts       ← pure functions (testable)
src/services/performance/vehicleAggregateJob.ts   ← DB: compute VehiclePerformanceCache
src/services/performance/platformAggregateJob.ts  ← DB: compute PlatformPerformanceSummary
src/services/performance/performanceQueryService.ts ← DB reads: serve API responses
src/server/routes/performance.ts                  ← 5 route registrations
src/scripts/performance/computePerformance.ts     ← CLI runner
src/tests/performanceMath.test.ts                 ← 27 test cases
apps/web/src/components/sync/PerformanceInsightStrip.tsx ← new UI strip
```

---

## Existing Files Modified

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add 2 models + back-relations |
| `src/server/app.ts` | Import + call `registerPerformanceRoutes` |
| `openapi/openapi.yaml` | Add Performance tag, 5 paths, 8 schemas |
| `apps/web/src/lib/types.ts` | Add 6 performance response types + optional fields to VehicleListItem |
| `apps/web/src/lib/api/sdk.ts` | Add 5 new fetch functions |
| `apps/web/src/pages/InventoryPage.tsx` | Fetch perf list, merge by stockNumber, add column |
| `apps/web/src/components/inventory/inventoryConfig.tsx` | Add `MovementSignalBadge` + performance column |
| `apps/web/src/pages/SyncPage.tsx` | Fetch performance summary, render PerformanceInsightStrip |
| `package.json` | Add `performance:compute` script |

---

## Service Function Signatures

### `performanceMath.ts` (pure, no imports from DB)

```typescript
export type MovementSignal = 'FAST' | 'ON_TRACK' | 'SLOW' | 'STALE' | 'LOW_DATA';
export type Confidence = 'INSUFFICIENT' | 'LOW' | 'MEDIUM' | 'HIGH';

// Thresholds: FAST < 0.7, ON_TRACK 0.7–1.3, SLOW 1.3–2.0, STALE > 2.0
// LOW_DATA when comparableCount < 3 or avgComparableDays is null
export function deriveMovementSignal(
  daysOnline: number,
  avgComparableDays: number | null,
  comparableCount: number,
): MovementSignal

// INSUFFICIENT < 3, LOW 3–9, MEDIUM 10–29, HIGH ≥ 30
export function deriveConfidence(soldCount: number): Confidence

// Same make, same model (case-insensitive), |year_a - year_b| <= 3, price within ±5%
// Returns false if either vehicle has priceCents <= 0
export function isComparable(
  a: { make: string; model: string; year: number; priceCents: number },
  b: { make: string; model: string; year: number; priceCents: number },
): boolean

// (soldAt ?? removedAt ?? now) - createdAt in days (floor)
export function computeDaysOnline(
  createdAt: Date,
  endDate: Date | null,
  now?: Date,
): number

// Returns human label: "strong observed assist" | "possible assist" | "insufficient data"
export function platformAssistLabel(confidence: Confidence): string

// Compute median from sorted array; returns null for empty array
export function median(values: number[]): number | null
```

### `vehicleAggregateJob.ts`

```typescript
export async function computeVehiclePerformanceCache(
  prisma: PrismaClient,
  dealershipId: string,
  opts?: { vehicleIds?: string[] },
): Promise<{ computed: number; errors: number }>
```

**Logic per vehicle:**
1. `firstListedAt` = min(vehicle.createdAt, earliest SyncEvent with kind=SUBMISSION_SENT for vehicleId)
2. `daysOnline` = `computeDaysOnline(firstListedAt, vehicle.soldAt ?? vehicle.removedAt)`
3. Comparable vehicles = `prisma.vehicle.findMany` where make+model match, year within ±3, priceCents ±5%, id ≠ vehicleId, soldAt not null (sold vehicles only for the average)
4. `avgComparableDays` = avg of `computeDaysOnline(v.createdAt, v.soldAt)` for each comparable
5. `movementSignal` = `deriveMovementSignal(daysOnline, avgComparableDays, comparableCount)`
6. Platform assists = group Lead rows by platformSlug for this vehicleId
7. Upsert into `VehiclePerformanceCache`

### `platformAggregateJob.ts`

```typescript
export async function computePlatformPerformanceSummaries(
  prisma: PrismaClient,
  dealershipId: string,
): Promise<{ platforms: number }>
```

**Logic per platform slug (derived from SyncEvent.platformSlug where kind=SUBMISSION_SENT):**
1. `vehiclesListed` = distinct vehicleIds with SUBMISSION_SENT for this platformSlug
2. `vehiclesSold` = count of those vehicleIds where vehicle.soldAt is not null
3. `avgDaysToMove` = avg of (soldAt - min SUBMISSION_SENT event createdAt) for sold vehicles
4. `medianDaysToMove` = `median(...)` using `performanceMath.median`
5. `totalLeads` = Lead count where platformSlug matches
6. `leadsPerVehicle` = totalLeads / vehiclesListed (null if 0)
7. `confidence` = `deriveConfidence(vehiclesSold)`
8. Upsert into `PlatformPerformanceSummary`

### `performanceQueryService.ts`

```typescript
export type PerformanceVehicleItem = {
  vehicleId: string;
  stockNumber: string;
  year: number; make: string; model: string; trim: string | null;
  priceCents: number; condition: string;
  daysOnline: number;
  firstListedAt: string;
  comparableCount: number;
  avgComparableDays: number | null;
  movementSignal: MovementSignal;
  computedAt: string;
};

export type PerformanceVehicleDetail = PerformanceVehicleItem & {
  confidence: Confidence;
  platformAssists: Array<{ platformSlug: string; leads: number; label: string }>;
};

export type PlatformPerformanceItem = {
  platformSlug: string;
  vehiclesListed: number;
  vehiclesSold: number;
  avgDaysToMove: number | null;
  medianDaysToMove: number | null;
  totalLeads: number;
  leadsPerVehicle: number | null;
  confidence: Confidence;
  sampleSize: number;
  observedAssistLabel: string;  // from platformAssistLabel(confidence)
  computedAt: string;
};

export type PerformanceSummaryView = {
  topMovers: PerformanceVehicleItem[];      // up to 5, signal=FAST
  staleRisks: PerformanceVehicleItem[];     // up to 5, signal=STALE
  bestObservedPlatform: PlatformPerformanceItem | null; // lowest avgDaysToMove, confidence ≥ LOW
  activeCount: number;
  staleCount: number;
  lowDataCount: number;
  computedAt: string | null;               // null if no cache exists
};

export async function getVehiclePerformanceList(
  prisma: PrismaClient, dealershipId: string,
): Promise<{ items: PerformanceVehicleItem[]; computedAt: string | null }>

export async function getVehiclePerformanceDetail(
  prisma: PrismaClient, dealershipId: string, stockNumber: string,
): Promise<PerformanceVehicleDetail | null>

export async function getPlatformPerformanceList(
  prisma: PrismaClient, dealershipId: string,
): Promise<{ platforms: PlatformPerformanceItem[]; computedAt: string | null }>

export async function getPerformanceSummary(
  prisma: PrismaClient, dealershipId: string,
): Promise<PerformanceSummaryView>
```

---

## API Endpoints & Response Shapes

All under `/api/dealers/{dealershipId}/performance/`, operator auth.

### `GET /performance/vehicles`
```json
{
  "items": [
    {
      "vehicleId": "clxyz",
      "stockNumber": "A1234",
      "year": 2022, "make": "Toyota", "model": "Camry", "trim": "SE",
      "priceCents": 2499900, "condition": "USED",
      "daysOnline": 18,
      "firstListedAt": "2026-05-18T00:00:00Z",
      "comparableCount": 9,
      "avgComparableDays": 22.3,
      "movementSignal": "FAST",
      "computedAt": "2026-06-05T10:00:00Z"
    }
  ],
  "meta": { "total": 47, "computedAt": "2026-06-05T10:00:00Z" }
}
```

### `GET /performance/vehicles/:stockNumber`
```json
{
  "item": {
    "vehicleId": "clxyz",
    "stockNumber": "A1234",
    "year": 2022, "make": "Toyota", "model": "Camry", "trim": "SE",
    "priceCents": 2499900, "condition": "USED",
    "daysOnline": 18,
    "firstListedAt": "2026-05-18T00:00:00Z",
    "comparableCount": 9,
    "avgComparableDays": 22.3,
    "movementSignal": "FAST",
    "confidence": "LOW",
    "platformAssists": [
      { "platformSlug": "autotrader", "leads": 3, "label": "strong observed assist" }
    ],
    "computedAt": "2026-06-05T10:00:00Z"
  }
}
```

### `GET /performance/platforms`
```json
{
  "platforms": [
    {
      "platformSlug": "autotrader",
      "vehiclesListed": 31,
      "vehiclesSold": 8,
      "avgDaysToMove": 19.1,
      "medianDaysToMove": 17.0,
      "totalLeads": 24,
      "leadsPerVehicle": 0.77,
      "confidence": "LOW",
      "sampleSize": 8,
      "observedAssistLabel": "strong observed assist",
      "computedAt": "2026-06-05T10:00:00Z"
    }
  ],
  "meta": { "computedAt": "2026-06-05T10:00:00Z" }
}
```

### `GET /performance/summary`
```json
{
  "summary": {
    "topMovers": [ ...up to 5 FAST vehicles... ],
    "staleRisks": [ ...up to 5 STALE vehicles... ],
    "bestObservedPlatform": { ...PlatformPerformanceItem or null... },
    "activeCount": 47,
    "staleCount": 3,
    "lowDataCount": 12,
    "computedAt": "2026-06-05T10:00:00Z"
  }
}
```

### `POST /performance/compute` (no request body)
```json
{
  "result": {
    "vehicles": 47,
    "platforms": 6,
    "durationMs": 1240,
    "computedAt": "2026-06-05T10:00:00Z"
  }
}
```

---

## OpenAPI Additions (openapi/openapi.yaml)

Add `Performance` to the `tags` array.

**5 path entries** (all with `OperatorAuth` security, `x-route-classification: operator`):
- `GET /api/dealers/{dealershipId}/performance/vehicles` → `listVehiclePerformance` → `PerformanceVehicleListResponse`
- `GET /api/dealers/{dealershipId}/performance/vehicles/{stockNumber}` → `getVehiclePerformanceDetail` → `PerformanceVehicleDetailResponse`
- `GET /api/dealers/{dealershipId}/performance/platforms` → `listPlatformPerformance` → `PlatformPerformanceResponse`
- `GET /api/dealers/{dealershipId}/performance/summary` → `getPerformanceSummary` → `PerformanceSummaryResponse`
- `POST /api/dealers/{dealershipId}/performance/compute` → `computePerformance` → `PerformanceComputeResponse`

**8 schema components** under `components/schemas`:
- `MovementSignal` enum: `[FAST, ON_TRACK, SLOW, STALE, LOW_DATA]`
- `PerformanceConfidence` enum: `[INSUFFICIENT, LOW, MEDIUM, HIGH]`
- `PerformanceVehicleItem` object
- `PerformanceVehicleDetail` object (extends PerformanceVehicleItem + platformAssists array)
- `PlatformPerformanceItem` object
- `PerformanceSummaryView` object
- `PerformanceVehicleListResponse` → `{ items: PerformanceVehicleItem[], meta: { total, computedAt } }`
- `PerformanceVehicleDetailResponse` → `{ item: PerformanceVehicleDetail }`
- `PlatformPerformanceResponse` → `{ platforms: PlatformPerformanceItem[], meta: { computedAt } }`
- `PerformanceSummaryResponse` → `{ summary: PerformanceSummaryView }`
- `PerformanceComputeResponse` → `{ result: { vehicles, platforms, durationMs, computedAt } }`

---

## UI Integration (lightweight, no rebuild)

### `inventoryConfig.tsx` changes

Add `MovementSignalBadge` helper after `ReadinessBadge`:

```typescript
const SIGNAL_CONFIG: Record<string, { label: string; color: BadgeColor }> = {
  FAST:     { label: 'Fast',     color: 'green' },
  ON_TRACK: { label: 'On Track', color: 'blue'  },
  SLOW:     { label: 'Slow',     color: 'amber' },
  STALE:    { label: 'Stale',    color: 'red'   },
  LOW_DATA: { label: '—',        color: 'slate' },
};

export function MovementSignalBadge({ signal }: { signal: string }) {
  const cfg = SIGNAL_CONFIG[signal] ?? SIGNAL_CONFIG['LOW_DATA'];
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
}
```

Add new column to `VEHICLE_COLUMNS` after the `readiness` column:

```typescript
{
  key: 'performance',
  label: 'Days / Signal',
  render: (v: VehicleListItem) => {
    const vp = v as VehicleListItem & { daysOnline?: number; movementSignal?: string };
    if (vp.daysOnline == null) return <span className="text-slate-300 text-xs">—</span>;
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">{vp.daysOnline}d</span>
        <MovementSignalBadge signal={vp.movementSignal ?? 'LOW_DATA'} />
      </span>
    );
  },
},
```

### `InventoryPage.tsx` changes

Add second `useAsyncQuery` for performance list:

```typescript
const perf = useAsyncQuery(() => fetchVehiclePerformanceList(dealerId), [dealerId]);

const vehiclesWithPerf = useMemo(() => {
  const perfMap = Object.fromEntries(
    (perf.data?.items ?? []).map(p => [p.stockNumber, p])
  );
  return (inventory.data?.vehicles ?? []).map(v => ({
    ...v,
    daysOnline: perfMap[v.stockNumber]?.daysOnline,
    movementSignal: perfMap[v.stockNumber]?.movementSignal,
  }));
}, [inventory.data, perf.data]);
```

Pass `vehiclesWithPerf` instead of `inventory.data?.vehicles` to the DataTable.

### `PerformanceInsightStrip.tsx` (new component)

Renders below `SyncSummaryStrip` in `SyncPage.tsx`. Shows stale risk count + best observed platform. Renders nothing if `summary.computedAt` is null (no data computed yet — shows a faint "Run performance:compute to see insights" callout instead).

```typescript
type Props = {
  summary: PerformanceSummaryView | null;
  loading: boolean;
};
```

### `SyncPage.tsx` changes

Add one `useAsyncQuery` call for performance summary, render `<PerformanceInsightStrip>` below `<SyncSummaryStrip>`. `SyncSummaryStrip` itself is unchanged.

---

## Test Plan — `src/tests/performanceMath.test.ts`

All pure function tests, no DB required.

| # | Function | Case |
|---|----------|------|
| 1 | deriveMovementSignal | 10 days, avg 20 → FAST (ratio 0.5) |
| 2 | deriveMovementSignal | 20 days, avg 20 → ON_TRACK (ratio 1.0) |
| 3 | deriveMovementSignal | 30 days, avg 20 → SLOW (ratio 1.5) |
| 4 | deriveMovementSignal | 50 days, avg 20 → STALE (ratio 2.5) |
| 5 | deriveMovementSignal | comparableCount 0 → LOW_DATA |
| 6 | deriveMovementSignal | comparableCount 2 → LOW_DATA |
| 7 | deriveMovementSignal | comparableCount 3, avg null → LOW_DATA |
| 8 | deriveMovementSignal | ratio exactly 0.7 → ON_TRACK (inclusive lower boundary) |
| 9 | deriveMovementSignal | ratio exactly 1.3 → ON_TRACK (inclusive upper boundary) |
| 10 | deriveMovementSignal | ratio exactly 2.0 → SLOW (STALE is > 2.0, not ≥) |
| 11 | deriveConfidence | 0 sold → INSUFFICIENT |
| 12 | deriveConfidence | 2 sold → INSUFFICIENT |
| 13 | deriveConfidence | 3 sold → LOW |
| 14 | deriveConfidence | 9 sold → LOW |
| 15 | deriveConfidence | 10 sold → MEDIUM |
| 16 | deriveConfidence | 29 sold → MEDIUM |
| 17 | deriveConfidence | 30 sold → HIGH |
| 18 | isComparable | same make/model, year ±0, price ±0% → true |
| 19 | isComparable | same make/model, year +3 → true |
| 20 | isComparable | same make/model, year +4 → false |
| 21 | isComparable | same make/model, price +5% exactly → true (boundary inclusive) |
| 22 | isComparable | same make/model, price +5.1% → false |
| 23 | isComparable | different make → false |
| 24 | isComparable | priceCents = 0 on either vehicle → false (zero-price guard) |
| 25 | isComparable | make comparison is case-insensitive: "Toyota" vs "TOYOTA" → true |
| 26 | computeDaysOnline | createdAt 10 days ago, not sold → 10 |
| 27 | computeDaysOnline | soldAt 5 days after createdAt → 5 (uses soldAt, not now) |
| 28 | median | [10, 20, 30] → 20 |
| 29 | median | [] → null |
| 30 | median | [10, 20] → 15 (even length average) |

---

## npm Scripts

```json
"performance:compute": "npm run -s build && node dist/src/scripts/performance/computePerformance.js",
"performance:compute:dealer": "npm run -s build && node dist/src/scripts/performance/computePerformance.js"
```

The script accepts an optional `--dealer-id <id>` flag; without it, runs for all dealers.

---

## Implementation Order

### Phase 1 — Schema + math (no running server needed)
1. Add 2 models + back-relations to `prisma/schema.prisma`
2. `npx prisma db push` + `npx prisma generate`
3. Create `src/services/performance/performanceMath.ts`
4. Create `src/tests/performanceMath.test.ts` (30 test cases)
5. `npm test` — all 30 pass (615 + 30 = 645 total)

### Phase 2 — Aggregate jobs + CLI
6. Create `src/services/performance/vehicleAggregateJob.ts`
7. Create `src/services/performance/platformAggregateJob.ts`
8. Create `src/scripts/performance/computePerformance.ts`
9. Add `performance:compute` script to `package.json`
10. `npm run performance:compute` against dev DB — smoke test manually

### Phase 3 — Query service + API routes
11. Create `src/services/performance/performanceQueryService.ts`
12. Create `src/server/routes/performance.ts`
13. Register in `src/server/app.ts`
14. `npm run server:start` + curl the 5 endpoints

### Phase 4 — OpenAPI + SDK
15. Add Performance paths + schemas to `openapi/openapi.yaml`
16. `npm run openapi:validate` — must pass
17. `npm run client:generate`
18. Add 5 fetch functions to `apps/web/src/lib/api/sdk.ts`
19. Add performance types to `apps/web/src/lib/types.ts`

### Phase 5 — UI integration
20. Add `MovementSignalBadge` + performance column to `inventoryConfig.tsx`
21. Update `InventoryPage.tsx` (second fetch + merge + column)
22. Create `apps/web/src/components/sync/PerformanceInsightStrip.tsx`
23. Update `SyncPage.tsx` (fetch summary, render strip)
24. `npm run ui:build` — must pass

### Phase 6 — Final verification
25. `npm test` — 645 tests pass
26. `npm run smoke:test` — 8/8 pass
27. `npm run openapi:validate`
28. `npm run ui:build`
29. Manual end-to-end: run `performance:compute`, open UI, verify Inventory shows signal badges, SyncPage shows insight strip

---

## Critical Files

| File | Role |
|------|------|
| `prisma/schema.prisma` | Add 2 models |
| `src/services/performance/performanceMath.ts` | All pure logic |
| `src/services/performance/vehicleAggregateJob.ts` | Per-vehicle cache computation |
| `src/services/performance/platformAggregateJob.ts` | Per-platform cache computation |
| `src/services/performance/performanceQueryService.ts` | Fast reads from cache |
| `src/server/routes/performance.ts` | 5 route handlers |
| `src/server/app.ts` | Register routes |
| `openapi/openapi.yaml` | API contract |
| `apps/web/src/components/inventory/inventoryConfig.tsx` | Badge + column |
| `apps/web/src/pages/InventoryPage.tsx` | Merge perf data |
| `apps/web/src/components/sync/PerformanceInsightStrip.tsx` | New sync page strip |
| `apps/web/src/pages/SyncPage.tsx` | Render strip |

---

## Acceptance Criteria

1. `npm test` passes (all existing 615 + 30 new pure-function tests)
2. `npm run openapi:validate` passes
3. `npm run client:generate` succeeds
4. `npm run smoke:test` 8/8 passes
5. `npm run ui:build` succeeds
6. `npm run performance:compute` runs without error on dev DB
7. `GET /api/dealers/:id/performance/summary` returns JSON within 100ms (reads from cache)
8. InventoryPage shows "Days / Signal" column with badge
9. SyncPage shows PerformanceInsightStrip (or empty-state callout if no cache)
10. All platform data uses "observed assist" language; never "sold by"
