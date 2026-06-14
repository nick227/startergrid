# VIN-First Shared Inventory System — Implementation Plan
_Date: 2026-06-10 | Epics: 12 CSVs | Strategy: bottom-up, registry-first_

---

## Guiding Principles
- **DRY / registry-adapter pattern**: every category-aware label, field, or rule goes through a schema helper — never hardcode `VIN`/`make`/`model` outside automotive-specific components
- **Reuse first**: existing `COLUMN_ALIASES`, `classifyVehicleReadiness`, `OpsRowCard`, `requireDealerAccess`, `validateBody` must be consumed or replaced — not duplicated
- **Vehicle stays the committed auto table** — `categoryPayload` is the escape hatch for non-auto attributes
- **Node:test/assert** for all new server tests; Vitest for web component tests

---

## Layer 1 — category-schemas Package (foundation for everything)

### 1a. Extend `packages/category-schemas/src/types.ts`
Add new type exports **below** existing types (no breakage):

```typescript
// ── Inventory schema contract ───────────────────────────────────────────
export type RequiredLevel = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
export type MediaRole = 'STRUCTURED_SHOT' | 'GALLERY_IMAGE';
export type InventoryReadinessSeverity = 'BLOCKER' | 'WARNING';

export type MediaSlot = {
  key: string; label: string; group: string;
  requiredLevel: RequiredLevel; sortOrder: number;
  aliases?: string[]; helpText?: string;
  platformMappings?: Record<string, string>; // placeholder — not wired
};

export type MediaGuide = {
  categoryId: BusinessCategoryId;
  slots: MediaSlot[];
  minimumPublishSet: string[];   // slot keys required before any publish
  recommendedSet: string[];
};

export type InventoryImportFieldDef = {
  fieldKey: string; label: string;
  kind: 'text' | 'number' | 'currency' | 'identifier' | 'enum' | 'boolean';
  requiredLevel: RequiredLevel;
  displayPriority: number;
  importAliases: string[];
  validation?: { min?: number; max?: number; pattern?: string; maxLength?: number };
};

export type AttributeGroup = { key: string; label: string; fieldKeys: string[] };

export type InventoryReadinessRule = {
  fieldKey: string; severity: InventoryReadinessSeverity; message: string;
};

export type CategoryInventorySchema = {
  categoryId: BusinessCategoryId;
  schemaVersion: string;
  primaryIdentifier: { fieldKey: string; label: string; pattern?: string };
  displayFields: { browseRow: string[]; detailHeader: string[] };
  importFields: InventoryImportFieldDef[];
  attributeGroups: AttributeGroup[];
  readinessRules: InventoryReadinessRule[];
  mediaGuide?: MediaGuide;
};
```

### 1b. CREATE `packages/category-schemas/src/automotive/inventorySchema.ts`
Full `CategoryInventorySchema` for AUTOMOTIVE:
- `primaryIdentifier`: `{ fieldKey: 'vin', label: 'VIN', pattern: '^[A-HJ-NPR-Z0-9]{17}$' }`
- `importFields`: mirrors and replaces the logic in `src/services/inventory/importService.ts` `COLUMN_ALIASES` — declare every alias as `importAliases` on each field def so the server can consume the schema instead of a hardcoded map
- `attributeGroups`: Basics (vin, stockNumber, year, make, model, trim), Pricing & Condition (priceCents, mileage, condition), Details (bodyStyle, drivetrain, fuelType, transmission), Colors (exteriorColor, interiorColor)
- `readinessRules` (BLOCKER): vin, stockNumber, year, make, model, mileage, priceCents, condition, exteriorColor; (WARNING): trim, bodyStyle, photoUrls, front shot, odometer shot
- `mediaGuide`: full `AutoShotGuide` with slots from CSVs 07 & 08:
  - Exterior group (required: front; recommended: rear, front-quarter-driver, front-quarter-passenger, driver-side, passenger-side)
  - Interior group (required: odometer; recommended: dashboard, driver-interior; optional: passenger-interior, front-seats, back-seats, trunk-cargo)
  - Detail group (recommended: engine, vin-plate; optional: window-sticker, keys, wheels, tires, damage-detail)
  - `minimumPublishSet`: `['front', 'odometer']`
  - `recommendedSet`: `['front','rear','front-quarter-driver','driver-side','passenger-side','dashboard','odometer','engine','vin-plate']`

### 1c. CREATE `packages/category-schemas/src/inventory/registry.ts`
```typescript
export const CATEGORY_INVENTORY_REGISTRY: Partial<Record<BusinessCategoryId, CategoryInventorySchema>> = {
  AUTOMOTIVE: automotiveInventorySchema,
  // BOATS stub: primaryIdentifier HIN — filled in later sprint
};

export function getCategoryInventorySchema(id: BusinessCategoryId): CategoryInventorySchema | undefined
export function getPrimaryIdentifierLabel(id: BusinessCategoryId): string  // 'VIN' for auto, 'HIN' for boats, 'SKU' fallback
export function getRequiredReadinessFields(id: BusinessCategoryId): InventoryReadinessRule[]
export function getMediaGuide(id: BusinessCategoryId): MediaGuide | undefined
export function getMissingMediaSlots(id: BusinessCategoryId, assignedSlotKeys: string[]): MediaSlot[]
```

### 1d. UPDATE `packages/category-schemas/src/index.ts`
Export all new types and helpers.

---

## Layer 2 — VIN Validation + Decode Service (Epic 4)

All files under `src/services/inventory/vin/`:

### `vinValidator.ts`
```typescript
export function normalizeVin(raw: string): string  // trim, uppercase, strip spaces/dashes
export function validateVinFormat(vin: string): { valid: boolean; error?: string }
  // checks: length=17, chars A-HJ-NPR-Z0-9, check digit (positions 0-16, weights, transliteration table)
export function calculateVinCheckDigit(vin: string): string  // returns expected digit or 'X'
```
Check digit algorithm: transliterate each char → value × position weight, sum % 11 → 0-9 or X.

### `vinDecoder.ts`
```typescript
export type VinDecodeResult = {
  vin: string; provider: string; valid: boolean; decoded: boolean;
  year?: number; make?: string; model?: string; trim?: string;
  bodyStyle?: string; fuelType?: string; drivetrain?: string;
  transmission?: string; engineDescription?: string; manufacturer?: string;
  warnings: string[];
  rawPayload?: Record<string, string>; // sanitized NHTSA output, no secrets
};
export interface VinDecoder { name: string; decode(vin: string): Promise<VinDecodeResult> }
```

### `mockVinDecoder.ts`
Deterministic fixture map of 5-10 known VINs (Toyota, Ford, BMW, etc.) with full decoded results. Unknown VINs return `{ decoded: false, warnings: ['VIN not in mock fixture'] }`.

### `nhtsaVpicDecoder.ts`
Fetches `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json`.  
Maps NHTSA fields: `ModelYear→year`, `Make→make`, `Model→model`, `Trim→trim`, `BodyClass→bodyStyle`, `FuelTypePrimary→fuelType`, `DriveType→drivetrain`, `TransmissionStyle→transmission`, `EngineCylinders+DisplacementL→engineDescription`, `Manufacturer→manufacturer`.  
500ms timeout; on error returns `{ decoded: false, valid: true, warnings: [safeMessage] }`.

### `index.ts`
```typescript
export function resolveVinDecoder(): VinDecoder
// reads VIN_DECODER_PROVIDER env (default: 'mock' in dev/test, 'nhtsa' in prod)
```

---

## Layer 3 — Inventory DTOs + Services (Epics 2, 9, 12)

### CREATE `src/services/inventory/inventoryReadinessService.ts`
Schema-driven replacement for `classifyVehicleReadiness` in importService.ts:
```typescript
export type InventoryReadinessResult = {
  status: 'READY' | 'WARNING' | 'BLOCKED';
  missingFields: string[];
  invalidFields: string[];
  missingMediaSlots: string[];  // slot keys
  blockers: string[];
  nextAction: string | null;
};

export function buildInventoryReadiness(
  category: BusinessCategoryId,
  vehicleFields: Record<string, unknown>,
  assignedMediaSlotKeys: string[],
): InventoryReadinessResult
```
Internally: calls `getCategoryInventorySchema(category)`, evaluates `readinessRules` against provided fields, calls `getMissingMediaSlots` for required/recommended slots.

### CREATE `src/services/inventory/inventoryDistributionService.ts`
```typescript
export type InventoryDistributionSummary = {
  liveCount: number; queuedCount: number; failedCount: number;
  blockedCount: number; totalEligiblePlatforms: number;
  lastSyncAt: string | null; nextAction: string | null; nextActionHref: string | null;
};

export async function buildDistributionSummary(
  prisma: PrismaClient, dealershipId: string, vehicleId: string
): Promise<InventoryDistributionSummary>
```
Queries: `PublishQueueItem` by vehicleId (group by status), `MarketplaceListing`+`SocialPost` for live evidence, `PlatformAccount` for blocked credentials, `SyncEvent` latest.

### CREATE `src/services/inventory/vehicleShellService.ts`
```typescript
export type CreateVehicleShellInput = {
  dealershipId: string;
  vin: string;
  stockNumber?: string;   // generated if absent
  decoded: VinDecodeResult;
  actorId?: string;        // for AdminAuditLog if SUPER_ADMIN
};
export async function createVehicleShell(
  prisma: PrismaClient, input: CreateVehicleShellInput
): Promise<{ vehicle: Vehicle; ingressRunId: string }>
```
Creates Vehicle with decoded fields + honest gaps (mileage=0, priceCents=0, condition='USED' pending review), creates `IngressRun` (sourceKind=MANUAL), optionally writes `AdminAuditLog`.

---

## Layer 4 — Prisma Migration (Epic 9)

### MODIFY `prisma/schema.prisma` — VehicleMedia
Add 3 nullable columns:
```prisma
model VehicleMedia {
  // ... existing fields ...
  mediaSlotKey  String?  @db.VarChar(80)   // e.g. 'front', 'odometer'
  mediaRole     String?  @db.VarChar(24)   // 'STRUCTURED_SHOT' | 'GALLERY_IMAGE'
  assignedBy    String?  @db.VarChar(30)   // OperatorAccount.id (loose ref)
}
```
Run `npx prisma migrate dev --name add-media-slot-assignment`.  
Existing rows: mediaRole treated as `GALLERY_IMAGE` when null (handled in service layer, no backfill migration needed).

---

## Layer 5 — Server Routes (Epics 4, 5, 6, 9)

### MODIFY `src/server/requestValidation.ts`
Add new Zod schemas:
- `decodeVinSchema`: `{ vin: string }` (1–20 chars)
- `createFromVinSchema`: `{ vin, stockNumber?, price?, mileage?, condition? }`
- `bulkVinPreviewSchema`: `{ vins: string[] }` (max 500)
- `bulkVinCommitSchema`: `{ vins: string[], stockNumberMap?: Record<string,string> }`
- `mediaSlotAssignSchema`: `{ mediaId: string, slotKey: string | null }` (null = unassign)

### MODIFY `src/server/routes/inventory.ts`
All routes use `requireDealerAccess`:

```
POST /api/dealers/:dealershipId/inventory/automotive/decode-vin
  → normalizeVin + validateVinFormat + duplicate check + resolveVinDecoder().decode(vin)
  → returns: { vin, valid, decoded, duplicate, vehicleId?, fields, readinessPreview, warnings }

POST /api/dealers/:dealershipId/inventory/automotive/vehicles
  → createVehicleShell() + returns InventoryDetailDto

POST /api/dealers/:dealershipId/inventory/automotive/bulk-vins/preview
  → parse + validateVinFormat each VIN + check duplicates + batch decode (mock or nhtsa)
  → returns: { rows: [{vin, status, decoded, duplicate, warnings}], summary }

POST /api/dealers/:dealershipId/inventory/automotive/bulk-vins/commit
  → for each valid non-duplicate VIN: createVehicleShell()
  → creates single IngressRun spanning all creates
  → returns: { created, skipped, failed, ingressRunId }

PATCH /api/dealers/:dealershipId/inventory/vehicles/:vehicleId/media/:mediaId/slot
  → updates VehicleMedia.mediaSlotKey + mediaRole + assignedBy
  → validates slotKey against getMediaGuide(dealership.category)
  → writes AdminAuditLog if SUPER_ADMIN
  → returns updated media record
```

---

## Layer 6 — UI Components (Epics 3, 5, 8, 10, 11)

### 6a. UPDATE `apps/web/src/lib/routes.ts`
Add inventory workspace route:
```typescript
`#/${dealerId}/inventory` → already exists, extend to support `/inventory/add` tab
```

### 6b. CREATE `apps/web/src/components/inventory/InventoryWorkspace.tsx`
Props: `{ dealerId: string; entryContext: 'admin' | 'operator'; actorRole: OperatorRole; returnHref?: string }`  
Tabs: Browse | Add / Import | Needs Attention | Sources | Recently Changed | Sold / Removed  
Uses `InventoryWorkspaceContext` (provides dealerId, role, categorySchema).  
Admin context: shows dealer identity chip + back-to-admin link in header.

### 6c. CREATE `apps/web/src/components/inventory/VinEntryPanel.tsx`
States: idle → validating → decoded | invalid | duplicate → confirm → created  
- Client-side `normalizeVin` + format feedback before submit (shared validator, browser-safe pure function)
- Calls `POST .../decode-vin` on submit
- Shows decoded card: year/make/model/trim, warnings, confidence
- Duplicate: shows link to existing vehicle
- Confirm step: editable stockNumber field + "Create vehicle" CTA
- After create: readiness preview + "Add photos / set price" next action + "Add another VIN" reset

### 6d. CREATE `apps/web/src/components/inventory/MediaSlotGrid.tsx`
Props: `{ guide: MediaGuide; assignedMedia: VehicleMedia[]; readOnly?: boolean; onAssign/onUnassign callbacks }`  
Renders required/recommended/optional slots grouped.  
Each slot card: missing | captured | gallery-fallback | optional states with correct label.  
Hero selection helper: prefers `front-quarter-driver` → `front` → first gallery image.

### 6e. CREATE `apps/web/src/components/inventory/InventoryRowCard.tsx`
Category-aware wrapper using `getCategoryInventorySchema(category).displayFields.browseRow`.  
For AUTOMOTIVE: year/make/model/trim, VIN chip, stock#, price, mileage, condition, hero image, 3 status badges (inventoryStatus, readinessStatus, publishingStatus), platform coverage counts.  
Generic fallback: displays `primaryIdentifier` label + display fields without VIN assumptions.

### 6f. MODIFY `apps/web/src/pages/InventoryPage.tsx`
- Route admin path (from AdminDealerPage) to `InventoryWorkspace` with `entryContext='admin'`
- Route operator path to `InventoryWorkspace` with `entryContext='operator'`
- Replace current inventory list with `InventoryRowCard` within `InventoryWorkspace` Browse tab

---

## Layer 7 — Tests

### Server tests (node:test/assert)
- `src/tests/vinValidator.test.ts` — normalizeVin, validateVinFormat, check digit for known valid/invalid VINs, I/O/Q rejection
- `src/tests/mockVinDecoder.test.ts` — known VIN returns expected Toyota/Ford fixture; unknown returns decoded=false
- `src/tests/inventoryReadinessService.test.ts` — READY vehicle passes, missing priceCents → BLOCKED, missing photos → WARNING, non-auto category fallback
- `src/tests/inventoryDistributionService.test.ts` — live item, queued item, blocked credentials, failed queue item

### category-schemas tests
- `packages/category-schemas/src/inventory/__tests__/registry.test.ts` — unique slot keys, minimumPublishSet subset of slots, getPrimaryIdentifierLabel returns 'VIN' for AUTOMOTIVE, getMissingMediaSlots detects missing front+odometer

---

## Execution Order (dependencies)

```
1. Layer 1: types.ts → automotive/inventorySchema.ts → inventory/registry.ts → index.ts
2. Layer 2: vinValidator.ts → vinDecoder.ts → mockVinDecoder.ts → nhtsaVpicDecoder.ts → vin/index.ts
3. Layer 3: inventoryReadinessService.ts (depends on Layer 1)
           vehicleShellService.ts (depends on Layer 2 + 3)
           inventoryDistributionService.ts (depends on prisma models)
4. Layer 4: Prisma migration (VehicleMedia columns)
5. Layer 5: requestValidation.ts → inventory routes (depends on Layers 2+3+4)
6. Layer 6: InventoryWorkspaceContext → InventoryRowCard → VinEntryPanel → MediaSlotGrid → InventoryWorkspace → InventoryPage update
7. Layer 7: Tests throughout (after each layer)
```

---

## Files to Create/Modify (complete list)

| Action | Path |
|--------|------|
| MODIFY | `packages/category-schemas/src/types.ts` |
| CREATE | `packages/category-schemas/src/automotive/inventorySchema.ts` |
| CREATE | `packages/category-schemas/src/inventory/registry.ts` |
| MODIFY | `packages/category-schemas/src/index.ts` |
| CREATE | `src/services/inventory/vin/vinValidator.ts` |
| CREATE | `src/services/inventory/vin/vinDecoder.ts` |
| CREATE | `src/services/inventory/vin/mockVinDecoder.ts` |
| CREATE | `src/services/inventory/vin/nhtsaVpicDecoder.ts` |
| CREATE | `src/services/inventory/vin/index.ts` |
| CREATE | `src/services/inventory/inventoryReadinessService.ts` |
| CREATE | `src/services/inventory/inventoryDistributionService.ts` |
| CREATE | `src/services/inventory/vehicleShellService.ts` |
| MODIFY | `prisma/schema.prisma` |
| CREATE | prisma migration (add-media-slot-assignment) |
| MODIFY | `src/server/requestValidation.ts` |
| MODIFY | `src/server/routes/inventory.ts` |
| CREATE | `apps/web/src/components/inventory/InventoryWorkspace.tsx` |
| CREATE | `apps/web/src/components/inventory/VinEntryPanel.tsx` |
| CREATE | `apps/web/src/components/inventory/MediaSlotGrid.tsx` |
| CREATE | `apps/web/src/components/inventory/InventoryRowCard.tsx` |
| MODIFY | `apps/web/src/pages/InventoryPage.tsx` |
| CREATE | `src/tests/vinValidator.test.ts` |
| CREATE | `src/tests/mockVinDecoder.test.ts` |
| CREATE | `src/tests/inventoryReadinessService.test.ts` |
| CREATE | `src/tests/inventoryDistributionService.test.ts` |

---

## Verification

```bash
# 1. Package build
cd packages/category-schemas && npx tsc --noEmit

# 2. Server tests
node --test src/tests/vinValidator.test.ts
node --test src/tests/mockVinDecoder.test.ts
node --test src/tests/inventoryReadinessService.test.ts
node --test src/tests/inventoryDistributionService.test.ts

# 3. Prisma
npx prisma migrate dev --name add-media-slot-assignment
npx prisma generate

# 4. Full test suite
npm test

# 5. VIN decode smoke test (dev server running)
curl -X POST http://localhost:3000/api/dealers/DEALER_ID/inventory/automotive/decode-vin \
  -H "x-operator-id: DEV_OPERATOR" -d '{"vin":"1HGBH41JXMN109186"}'

# 6. UI: start dev server, navigate admin → dealer → inventory
# Verify: both admin context and operator context render InventoryWorkspace
# Verify: VinEntryPanel decodes known VIN, shows confirm step, creates vehicle
# Verify: MediaSlotGrid shows all required auto slots as missing for new vehicle
```
