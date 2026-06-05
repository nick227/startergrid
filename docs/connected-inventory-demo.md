# Connected Inventory Demo Flow

End-to-end walkthrough showing API source registration → Check now → IngressRun → platform impact. Takes under 5 minutes from a clean environment.

---

## Prerequisites

```bash
# 1. Server dependencies installed and schema pushed
npm install && npm run db:push && npm run db:seed

# 2. Verify environment is clean
npm run smoke:test   # expect 8/8 checks passed
```

---

## Step 1 — Run setup command

```bash
npm run demo:connected-inventory
```

This command:
- Finds (or uses) the first seeded dealer
- Creates (or updates) an API source: **Connected Demo Feed** (`cdi-demo-feed`)
- Points the feed URL at `http://localhost:3000/dev/demo-feed` (the built-in demo endpoint)
- Sets `pollIntervalMinutes: 15`
- Prints the dealer ID, source ID, and step-by-step instructions

**With optional flags:**

```bash
# Remove existing CDI vehicles so first check shows all as "created", then run check
npm run demo:connected-inventory -- --reset --check

# Target a specific dealer
npm run demo:connected-inventory -- <dealershipId>

# Reset, target specific dealer, and run initial check
npm run demo:connected-inventory -- <dealershipId> --reset --check
```

---

## Step 2 — Start the API server

```bash
npm run server:start
# → API listening on http://localhost:3000
```

The demo feed is served from `GET http://localhost:3000/dev/demo-feed`. Keep this terminal open.

---

## Step 3 — Start the operator UI

```bash
npm run ui:dev
# → Vite dev server on http://localhost:5173
```

---

## Step 4 — Open the UI and run a check

1. Open **http://localhost:5173**
2. Select the dealer from the picker
3. Navigate to the **Inventory** tab
4. Scroll to **Intake sources**
5. Find the **Connected Demo Feed** source
6. Click **"Check now"**

The button shows "Checking…" for 2–3 seconds while the server:
- Fetches `http://localhost:3000/dev/demo-feed`
- Validates the JSON payload (3 vehicles)
- Upserts vehicles
- Creates an `IngressRun`
- Schedules auto-reconcile (2s debounce)

---

## Step 5 — Observe the results

After the check completes, the IngressRun appears in the run list below the sources:

```
● Committed   Connected Demo Feed   just now
  3 vehicles  +3 created
  platform impact pending…
```

After ~2 seconds (auto-reconcile), the platform impact chips appear:

```
  → 2 dispatched · 10 scheduled · 3 need approval
```

**Second check** (click "Check now" again):

```
● Committed   Connected Demo Feed   just now
  3 vehicles  ↻3 updated
  → (platform impact chips)
```

---

## Demo Feed Contents

The demo feed serves 3 vehicles covering all three condition codes:

| Stock # | Year | Make | Model | Condition |
|---|---|---|---|---|
| CDI-2024-001 | 2023 | Honda | Accord Sport | USED |
| CDI-2024-002 | 2022 | BMW | X5 xDrive40i | CPO |
| CDI-2024-003 | 2024 | Volkswagen | Jetta SEL | NEW |

The fixture is at `src/fixtures/scenarios/connectedInventoryDemo.fixture.ts`.
The demo feed endpoint is registered in `src/server/app.ts` at `GET /dev/demo-feed`.

---

## What the feed response looks like

```bash
curl http://localhost:3000/dev/demo-feed | jq .
```

```json
{
  "sourceSlug": "cdi-demo-feed",
  "sourceLabel": "Connected Demo Feed",
  "vehicles": [
    {
      "stockNumber": "CDI-2024-001",
      "vin": "1HGCM82633A004001",
      "year": 2023,
      "make": "Honda",
      "model": "Accord",
      "trim": "Sport",
      "mileage": 8500,
      "priceCents": 2799000,
      "condition": "USED",
      "exteriorColor": "Sonic Gray Pearl",
      "photoUrls": ["https://media.example.com/cdi-001/front.jpg", "..."]
    },
    ...
  ]
}
```

This is exactly the shape `POST /inventory/ingest/json` accepts — the same payload works for both the feed check and a direct API call.

---

## CLI equivalent (no UI required)

```bash
# Get the dealer and source IDs from the setup command output, then:
npm run ingress:check-source -- <dealershipId> <sourceId>
```

---

## Reset between demos

```bash
# Remove CDI vehicles and re-run setup (so "Check now" shows 3 created again)
npm run demo:connected-inventory -- --reset
```

CDI-prefixed stock numbers are used exclusively by the demo fixture and don't collide with real dealer inventory or the JIF fixture (json-ingest-fixture) stock numbers.

---

## Polling automation

After the demo is set up, the source is also picked up by the poll CLI:

```bash
# Dry-run to verify it's due
npm run ingress:poll-sources -- --dry-run

# Actually poll
npm run ingress:poll-sources
```

See `docs/ingress-polling.md` for scheduler setup (cron / Task Scheduler / pm2).

---

## Full downstream chain

```
Click "Check now"
  ↓
checkApiInventorySource
  ↓ fetches http://localhost:3000/dev/demo-feed
  ↓ validates JSON schema
  ↓ ingestJsonVehicles
       ↓ per-vehicle upsert
       ↓ createIngressRun (sourceKind=API, sourceId=cdi-demo-feed)
       ↓ SyncEvent written
       ↓ source.lastCheckedAt + lastReceivedAt updated
       ↓ scheduleAutoReconcile (2s debounce)
            ↓ runPrepareAndPublish
            ↓ runScheduler → dispatches to platforms
            ↓ IngressRun.platformImpactJson written
                 ↓ UI shows impact chips
```
