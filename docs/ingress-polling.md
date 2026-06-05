# Ingress Source Polling

## Overview

API inventory sources (kind `API`) can be polled automatically by running:

```bash
npm run ingress:poll-sources
```

Each registered source stores a `pollIntervalMinutes` in its `configJson`. The poll command checks whether enough time has elapsed since `lastCheckedAt` and only fetches sources that are due. Sources with no `pollIntervalMinutes` set are never considered due (Manual only mode).

The command is a one-shot process, not a daemon. Run it repeatedly from an external scheduler (cron, Windows Task Scheduler, pm2-cron, etc.) at a frequency shorter than your shortest source interval.

**Typical pattern:** run the CLI every 5 minutes; each source's own `pollIntervalMinutes` controls how often it actually fetches.

---

## CLI Flags

```bash
npm run ingress:poll-sources [-- <flags>]
```

| Flag | Description |
|---|---|
| `--dealer <id>` | Restrict to one dealership (omit to process all) |
| `--dry-run` | Evaluate due/not-due without making any HTTP requests or DB writes |
| `--limit <n>` | Cap the number of sources checked per run (useful for gradual rollout) |
| `--retry-errors` | Also check sources currently in `ERROR` status (default: skip them) |
| `--verbose` | Print each skipped paused/disconnected source |

---

## Output Format

```
Ingress Source Poll  2026-06-05T14:00:00.000Z
────────────────────────────────────────────────────────────
3 API sources · 2 active · 1 due · 1 not-due · 0 paused/disconnected · 0 error

  SKIP   DMS Daily Feed  (Prairie Ridge Motors)  — next in 23m
  CHECK  Partner Live Feed  (Prairie Ridge Motors)  — last checked 2h ago
         OK   45 vehicles (12 created, 33 updated, 0 skipped)

────────────────────────────────────────────────────────────
Checked: 1  Succeeded: 1  Failed: 0  Skipped: 1
```

**Exit codes:**
- `0` — all checks succeeded (or dry-run)
- `1` — at least one source check failed

---

## Dry-Run Example

```bash
npm run ingress:poll-sources -- --dry-run
```

```
DRY RUN — sources will be evaluated but not checked

Ingress Source Poll  2026-06-05T14:00:00.000Z
────────────────────────────────────────────────────────────
3 API sources · 2 active · 2 due · 0 not-due · 1 paused/disconnected · 0 error
Limit: not set

  SKIP   Paused Feed  (Dealer A)  (filtered: not active)
  CHECK  Live API  (Dealer B)  — last checked 3h ago
         [dry-run] would check source clxyz123
  CHECK  Daily DMS  (Dealer B)  — last checked never
         [dry-run] would check source clxyz456

────────────────────────────────────────────────────────────
Would check: 2  Skipped: 1
```

Use `--dry-run` to verify which sources are due before enabling a scheduler.

---

## How Due-Check Works

A source is due for polling when **all** of the following are true:

1. `kind === 'API'`
2. `status === 'ACTIVE'` (or `'ERROR'` with `--retry-errors`)
3. `pollIntervalMinutes` is set (non-null)
4. Either `lastCheckedAt` is null (never checked), or `now - lastCheckedAt >= pollIntervalMinutes × 60s`

The `nextCheckAt` field on `IngressSourceView` is computed server-side and shown in the operator UI ("Next check in 45m" / "Overdue" / "Manual only").

---

## Recommended Cadence

| Scenario | CLI cron | Per-source interval |
|---|---|---|
| Near-realtime feeds | `*/5 * * * *` (every 5m) | 5–15 min |
| Hourly refresh | `*/15 * * * *` (every 15m) | 60 min |
| Daily DMS sync | `0 */1 * * *` (hourly) | 1440 min (daily) |
| Manual-only | Not needed | — |

Run the CLI **more frequently than your shortest source interval**. The per-source interval is respected by `isSourceDueForCheck`; sources are never fetched more often than their interval regardless of how often the CLI runs.

---

## Scheduler Setup

### Linux/macOS — cron

```bash
# Edit crontab
crontab -e

# Add (runs every 5 minutes, logs to /var/log/ingress-poll.log):
*/5 * * * * cd /path/to/auto-dealer-sales-portal && node dist/src/scripts/inventory/pollSources.js >> /var/log/ingress-poll.log 2>&1
```

Build must already have run (`npm run build`) before the cron executes. Either pre-build or include it:

```bash
*/5 * * * * cd /path/to/auto-dealer-sales-portal && npm run -s build && node dist/src/scripts/inventory/pollSources.js >> /var/log/ingress-poll.log 2>&1
```

### Windows Task Scheduler

1. Open **Task Scheduler → Create Basic Task**
2. Name: `InventorySourcePoll`
3. Trigger: **Daily**, repeat every **5 minutes** (set under "Advanced Settings")
4. Action: **Start a program**
   - Program: `node`
   - Arguments: `dist\src\scripts\inventory\pollSources.js`
   - Start in: `C:\wamp64\www\auto-dealer-sales-portal`
5. Run whether user is logged on or not

### pm2 (Node process manager)

```bash
# Install pm2 globally if not present
npm install -g pm2

# Schedule as a cron job via pm2
pm2 start "npm run ingress:poll-sources" \
  --name ingress-poll \
  --cron "*/5 * * * *" \
  --no-autorestart

# Persist across restarts
pm2 save
pm2 startup
```

### Manual one-off (testing/on-demand)

```bash
# Check all due sources
npm run ingress:poll-sources

# Check one dealer only
npm run ingress:poll-sources -- --dealer <dealershipId>

# Retry sources currently in ERROR
npm run ingress:poll-sources -- --retry-errors

# Limit to 3 sources (gradual rollout)
npm run ingress:poll-sources -- --limit 3
```

---

## Source Configuration

Set `pollIntervalMinutes` when registering or editing a source in the operator UI, or via API:

```bash
# Register with hourly schedule
curl -s -X POST http://localhost:3000/api/dealers/<DEALER_ID>/ingress/sources \
  -H "Content-Type: application/json" \
  -H "x-operator-id: dev-operator" \
  -d '{
    "label": "My DMS Feed",
    "feedUrl": "https://dms.example.com/inventory.json",
    "status": "ACTIVE",
    "pollIntervalMinutes": 60
  }' | jq .

# Update schedule on existing source
curl -s -X PATCH http://localhost:3000/api/dealers/<DEALER_ID>/ingress/sources/<SOURCE_ID> \
  -H "Content-Type: application/json" \
  -H "x-operator-id: dev-operator" \
  -d '{"pollIntervalMinutes": 360}' | jq .

# Remove schedule (manual-only)
curl -s -X PATCH http://localhost:3000/api/dealers/<DEALER_ID>/ingress/sources/<SOURCE_ID> \
  -H "Content-Type: application/json" \
  -H "x-operator-id: dev-operator" \
  -d '{"pollIntervalMinutes": null}' | jq .
```

Valid range: 5–10080 minutes (5 min to 1 week).

---

## Feed URL Requirements

- Must be reachable via HTTPS (no HTTP)
- Must return `Content-Type: application/json` (or valid JSON body)
- Must return the same payload shape as `POST /inventory/ingest/json`:
  ```json
  { "vehicles": [ { "stockNumber": "...", "vin": "...", ... } ] }
  ```
- Max response size: 5 MB
- Timeout: 30 seconds

If a fetch fails, the source is set to `status: ERROR` and the error is stored in `lastCheckError` (visible in the operator UI as "Error · retry available"). Run `--retry-errors` to re-check error sources automatically, or click **Retry** in the UI.

---

## What Happens After a Successful Check

1. `lastCheckedAt` updated on the source
2. Vehicles upserted via the standard validate → upsert pipeline
3. `IngressRun` created (linked to the API source, `sourceKind: API`)
4. `SyncEvent` audit record written (`kind: INVENTORY_IMPORT`)
5. Auto-reconcile scheduled (2s debounce) → runs `prepareAndPublish` → dispatches to platforms
6. `platformImpactJson` written back to `IngressRun` when reconcile completes
7. Source row in operator UI updates: `lastCheckedAt`, `lastReceivedAt`, `nextCheckAt`, platform impact chips

---

## Deployment Checklist

Before enabling automated polling in any environment:

- [ ] At least one API source registered with a valid HTTPS `feedUrl`
- [ ] `pollIntervalMinutes` set on the source (visible in operator UI)
- [ ] Feed URL tested manually: `npm run ingress:check-source -- <dealerId> <sourceId>`
- [ ] Dry-run verified: `npm run ingress:poll-sources -- --dry-run`
- [ ] External scheduler configured (cron / Task Scheduler / pm2)
- [ ] Scheduler runs **more frequently** than the shortest source interval
- [ ] Log output captured to file or monitoring system
- [ ] Non-zero exit code alerts wired (feed failures exit 1)
- [ ] `npm run smoke:test` passes (includes poll dry-run check)
