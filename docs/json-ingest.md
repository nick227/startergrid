# JSON Inventory Ingest

## Overview

`POST /api/dealers/:dealershipId/inventory/ingest/json` accepts a structured JSON payload and runs the same validate → upsert → reconcile pipeline as a CSV commit — but without a column-mapping step. It is designed for DMS integrations, feed adapters, and programmatic inventory updates.

The endpoint is parallel to the CSV path. Both create an `IngressRun`, both write a `SyncEvent` audit record, and both trigger the auto-reconcile pipeline that dispatches to platforms.

---

## Request shape

```json
{
  "sourceSlug":  "my-dms-feed",
  "sourceLabel": "My DMS Feed",
  "mode":        "upsert",
  "vehicles": [
    {
      "stockNumber":   "A001",
      "vin":           "1HGCM82633A004352",
      "year":          2023,
      "make":          "Honda",
      "model":         "Accord",
      "trim":          "EX-L",
      "mileage":       12500,
      "priceCents":    2699000,
      "condition":     "USED",
      "exteriorColor": "Lunar Silver Metallic",
      "interiorColor": "Black",
      "bodyStyle":     "Sedan",
      "drivetrain":    "FWD",
      "fuelType":      "Gasoline",
      "transmission":  "Automatic",
      "photoUrls": [
        "https://media.example.com/a001/front.jpg",
        "https://media.example.com/a001/rear.jpg"
      ]
    }
  ]
}
```

### Top-level fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `vehicles` | array | **Yes** | 1–2000 vehicles per request |
| `sourceSlug` | string | No | Identifies the intake source. Defaults to `json-manual`. Max 80 chars. |
| `sourceLabel` | string | No | Display name for the source. Defaults to `JSON Upload`. Max 160 chars. |
| `mode` | `"upsert"` | No | Only `upsert` is supported; omitting it has the same effect. |

### Vehicle fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `stockNumber` | string | **Yes** | Max 80 chars. Must be unique within the batch. |
| `vin` | string | **Yes** | 10–17 chars. No I, O, or Q. Max 17 chars. |
| `year` | integer | **Yes** | 1900–2100. |
| `make` | string | **Yes** | Max 80 chars. |
| `model` | string | **Yes** | Max 80 chars. |
| `mileage` | integer | **Yes** | 0–2,000,000. |
| `priceCents` | integer | **Yes** | 1–100,000,000. Whole cents (e.g. `2699000` = $26,990.00). |
| `condition` | enum | **Yes** | `NEW` \| `USED` \| `CPO` — uppercase, no normalization. |
| `exteriorColor` | string | **Yes** | Max 80 chars. |
| `trim` | string | No | Recommended. Needed by most platform schemas. |
| `bodyStyle` | string | No | Recommended. |
| `interiorColor` | string | No | |
| `drivetrain` | string | No | e.g. `FWD`, `AWD`, `4WD`, `RWD` |
| `fuelType` | string | No | e.g. `Gasoline`, `Electric`, `Hybrid` |
| `transmission` | string | No | e.g. `Automatic`, `Manual` |
| `photoUrls` | string[] | No | Max 100 URLs per vehicle. Each must be a valid `https://` or `http://` URL. Max 512 chars each. |

### Validation rules

- **VIN**: must match `/^[A-HJ-NPR-Z0-9]{10,17}$/i` (no I, O, or Q)
- **priceCents < 100,000** (i.e. < $1,000.00): accepted but flagged as a warning; the vehicle is still committed
- **Duplicate stockNumber within a batch**: the duplicate rows are skipped (counted in `skipped`)
- **Any FAIL-severity issue** (missing required field, invalid VIN): that vehicle is skipped and counted in `skipped`
- **Extra fields** not in the schema are rejected with a 400 error (strict mode)

---

## Response shape

```json
{
  "status":       "COMMITTED",
  "ingressRunId": "clxyz1234",
  "created":      2,
  "updated":      1,
  "skipped":      0,
  "errors":       0,
  "vehicleCount": 3,
  "batchId":      "clxyz5678"
}
```

| Field | Notes |
|---|---|
| `status` | `COMMITTED` (no errors), `PARTIAL` (some errors, some succeeded), `FAILED` (all errored) |
| `ingressRunId` | ID of the `IngressRun` record. Poll this for `platformImpactJson`. |
| `batchId` | ID of the `SyncEvent` audit record. |
| `vehicleCount` | Total vehicles in the request (before validation). |
| `created` | Vehicles inserted as new records. |
| `updated` | Vehicles that already existed by `stockNumber` and were updated. |
| `skipped` | Vehicles that failed validation or had duplicate stock numbers. |
| `errors` | Vehicles that passed validation but failed during DB upsert. |

---

## Pipeline lifecycle

```
POST /ingest/json
  │
  ├─ Zod validation (400 if fails)
  ├─ Dealer access check (401/403 if fails)
  ├─ Per-vehicle validation + upsert
  ├─ Create/reuse InventorySource (slug = sourceSlug, kind = JSON)
  ├─ Create IngressRun  ← ingressRunId returned immediately
  ├─ Update source.lastReceivedAt
  ├─ Write SyncEvent audit record  ← batchId returned
  └─ scheduleAutoReconcile (2s debounce)
       │
       └─ (after 2s) runPrepareAndPublish → runScheduler
            └─ writes IngressRun.platformImpactJson
```

After the response is returned, the auto-reconcile fires asynchronously (~2s). Once it completes, `IngressRun.platformImpactJson` contains:

```json
{
  "reconcileAt":    "2026-06-05T14:30:00.000Z",
  "publishSummary": { "Scheduled": 12, "Needs Approval": 3 },
  "dispatched":     5,
  "inCooldown":     2
}
```

The operator UI (`IngressPanel`) shows this data inline under each run row.

---

## curl examples

Replace `<DEALER_ID>` with the actual dealer ID (e.g. from `npm run dealer:status`).

### Valid request

```bash
curl -s -X POST http://localhost:3000/api/dealers/<DEALER_ID>/inventory/ingest/json \
  -H "Content-Type: application/json" \
  -H "x-operator-id: dev-operator" \
  -d '{
    "sourceSlug": "my-dms",
    "sourceLabel": "My DMS",
    "mode": "upsert",
    "vehicles": [
      {
        "stockNumber":   "T001",
        "vin":           "1HGCM82633A004352",
        "year":          2023,
        "make":          "Honda",
        "model":         "Accord",
        "trim":          "Sport",
        "mileage":       8200,
        "priceCents":    2799000,
        "condition":     "USED",
        "exteriorColor": "Sonic Gray Pearl",
        "bodyStyle":     "Sedan",
        "photoUrls":     ["https://media.example.com/t001/01.jpg"]
      }
    ]
  }' | jq .
```

**Expected response:**
```json
{
  "status":       "COMMITTED",
  "ingressRunId": "clxyz...",
  "created":      1,
  "updated":      0,
  "skipped":      0,
  "errors":       0,
  "vehicleCount": 1,
  "batchId":      "clxyz..."
}
```

### Invalid condition (400)

```bash
curl -s -X POST http://localhost:3000/api/dealers/<DEALER_ID>/inventory/ingest/json \
  -H "Content-Type: application/json" \
  -H "x-operator-id: dev-operator" \
  -d '{"vehicles": [{"stockNumber": "T002", "vin": "1HGCM82633A004352",
        "year": 2023, "make": "Honda", "model": "Accord",
        "mileage": 0, "priceCents": 2000000,
        "condition": "LEASED", "exteriorColor": "White"}]}' | jq .
```

**Expected response:**
```json
{ "error": "vehicles.0.condition: Invalid enum value..." }
```

### Missing required field (400)

```bash
curl -s -X POST http://localhost:3000/api/dealers/<DEALER_ID>/inventory/ingest/json \
  -H "Content-Type: application/json" \
  -H "x-operator-id: dev-operator" \
  -d '{"vehicles": [{"stockNumber": "T003", "vin": "bad"}]}' | jq .
```

**Expected response:**
```json
{ "error": "vehicles.0.year: Required" }
```

### Missing auth (401)

```bash
curl -s -X POST http://localhost:3000/api/dealers/<DEALER_ID>/inventory/ingest/json \
  -H "Content-Type: application/json" \
  -d '{"vehicles": [...]}' | jq .
```

**Expected response:**
```json
{ "error": "Operator authentication required" }
```

---

## npm fixture script

Sends the 3-vehicle fixture (`JIF-2024-001` / `JIF-2024-002` / `JIF-2024-003`) covering all three condition enums, then waits for auto-reconcile and prints the platform impact.

```bash
# Get a dealer ID first
npm run dealer:status

# Run the fixture
npm run ingest:json:fixture -- <DEALER_ID>
```

**Sample output:**
```
JSON Ingest Fixture
──────────────────────────────────────────────────
Dealer:  Prairie Ridge Motors LLC (cma1234xyz)
Source:  Demo DMS Feed (demo-dms-feed)
Payload: 3 vehicles

Ingest result:
  Status:       COMMITTED
  Vehicles:     3
  Created:      3
  Updated:      0
  Skipped:      0
  Errors:       0
  IngressRun:   clxyz1234
  BatchEvent:   clxyz5678

Auto-reconcile scheduled (2s debounce). Waiting for platform impact…

Platform impact:
  Reconciled:   2026-06-05T14:30:00.000Z
  Dispatched:   4
  In cooldown:  0
  Summary:      {"Scheduled":10,"Needs Approval":3}
```

Running the script a second time will update (not create) the same three vehicles.

---

## OpenAPI reference

The machine-readable contract is in `openapi/openapi.yaml` under path `/api/dealers/{dealershipId}/inventory/ingest/json` with operationId `ingestJsonInventory`. Schemas: `JsonVehicleInput`, `JsonInventoryIngestRequest`, `JsonIngestResponse`.

The generated TypeScript SDK method is `InventoryService.ingestJsonInventory({ dealershipId, requestBody })` in `packages/api-client/generated/`.
