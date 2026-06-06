# Demo Flow — Auto Dealer Sales Portal

End-to-end guide for running, verifying, and demonstrating the system.

**Stack:** Fastify API (port 3000) · Operator portal (port 5173) · Marketplace (port 5174) · MySQL

---

## TL;DR — fast verification (no browser required)

```bash
npm run verify:all   # spec validate → 861 tests → boundary check
npm run build:all    # TypeScript + operator UI + marketplace Vite builds
npm run smoke:test   # 8/8 system checks (requires running DB)
```

All three must pass before any demo or deploy.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 22+ | `node --version` |
| WampServer / MySQL | 8+ | Must be running before `smoke:test` or any DB script |
| npm | 10+ | Bundled with Node 22 |

Ports **3000**, **5173**, and **5174** must be free.

---

## One-time setup

```bash
# 1. Install root dependencies
npm install

# 2. Install UI dependencies
npm run ui:install
npm run marketplace:install

# 3. Copy env template and adjust if needed (see Environment Variables below)
cp .env.example .env

# 4. Push schema and seed platform profiles + demo dealer
npm run db:push
npm run db:seed
```

This is only needed once per machine. After this, use `demo:reset` to restore the demo state.

---

## Environment variables

### API server (root `.env`)

| Variable | Default | Required | Notes |
|----------|---------|----------|-------|
| `DATABASE_URL` | `mysql://dealerpoc:dealerpoc@localhost:3307/dealer_onboarding_poc` | ✅ | Adjust user/pass/port for your MySQL setup |
| `APP_BASE_URL` | `http://localhost:5173` | ✅ | Used in generated artifact URLs |
| `MOCK_OUTBOX_DIR` | `./mock-outbox` | ✅ | Where mock platform receipts are written |
| `DEV_OPERATOR_ID` | `dev-operator` | ✅ | Operator identity for local dev auth |
| `DEV_OPERATOR_DEALER_IDS` | *(empty)* | — | Optional allowlist of dealer IDs; empty = access all |
| `FEED_EXPORTS_DIR` | `./exports` | — | Where feed artifact ZIPs are written |

### Operator portal (`apps/web/.env.local`)

| Variable | Default | Required | Notes |
|----------|---------|----------|-------|
| `VITE_DEV_OPERATOR_ID` | `dev-operator` | ✅ | Must match `DEV_OPERATOR_ID` in root `.env` |

The `apps/web/.env.local` file is not committed. Create it if missing:

```bash
echo 'VITE_DEV_OPERATOR_ID="dev-operator"' > apps/web/.env.local
```

### Marketplace app

No additional env vars. The marketplace dev server proxies `/api` to `localhost:3000` automatically.

---

## Step 0 — Reset demo state

Wipes the database and reseeds a complete demo state: platform profiles, a pristine dealer with 3 vehicles, readiness artifacts, sync events, and performance benchmarks (FAST/SLOW/STALE signals).

```bash
npm run demo:reset
```

**What it does:**

1. Force-resets the database (`db push --force-reset`)
2. Reseeds 18 platform profiles
3. Creates the pristine demo dealer (`Prairie Ridge Motors`) with 3 vehicles
4. Runs full readiness + feed generation for all 18 platforms
5. Runs portal lifecycle simulation on the happy path
6. Seeds sold comparables + sync events for performance benchmark demo

**What it prints at the end:**

```
Demo reset complete. Dealer ID: <ID>. Artifacts: 18. Tests: run npm test.
```

Save the **Dealer ID** — you'll need it for CLI commands in the steps below.

---

## Step 1 — Start the stack

Open **three separate terminals** from the project root:

**Terminal 1 — API server (port 3000):**
```bash
npm run server:start
```
Wait for: `Server listening at http://127.0.0.1:3000`

**Terminal 2 — Operator portal (port 5173):**
```bash
npm run dev:operator
```
Wait for: `Local: http://localhost:5173/`

**Terminal 3 — Marketplace (port 5174):**
```bash
npm run dev:marketplace
```
Wait for: `Local: http://localhost:5174/`

All three proxied `/api` calls route to the same API server on port 3000.

---

## Step 2 — Operator portal: Inventory overview

Open `http://localhost:5173` in a browser.

1. The dealer picker shows **Prairie Ridge Motors** — click it.
2. Navigate to the **Inventory** tab.
3. You should see ~3 vehicles. Each row shows:
   - Stock number, year, make, model
   - Readiness status (GREEN)
   - **Movement signal** chip: FAST / ON_TRACK / SLOW / STALE / LOW_DATA
   - Days online
4. Click any vehicle row to expand the **Vehicle Detail Panel**:
   - Movement vs similar stock (comparable benchmark)
   - Platform movement comparison table (which platforms show observed activity)
   - **Marketplace preview** — the public card as a consumer would see it
5. Use the **Movement filter** bar to filter by signal (e.g., show only SLOW).
6. Use the **Sort** bar to sort by days online or price.

---

## Step 3 — Inventory ingress & portal JSON ingest

The ingress layer pulls vehicle data from external inventory sources. After `demo:reset`, Prairie Ridge Motors has three vehicles (`PRM-24001` … `PRM-24003`).

### Portal — JSON / API ingest (recommended for demos)

1. Open **Inventory** for Prairie Ridge Motors.
2. Under **Intake sources**, expand **JSON / API ingest**.
3. Paste a JSON payload or **Upload file** (max 5 MB in the portal).
4. Optional: enable **Treat this feed as the full current inventory** — this always runs a **snapshot dry-run** first. Vehicles missing from the payload appear as removal candidates; nothing is removed until you commit in **Snapshot review**.
5. Click **Run JSON ingest** or **Run snapshot dry-run ingest**.
6. Review counts: created, updated, blocked, skipped, errors, **Missing from feed**.
7. If snapshot mode: use **Snapshot review** to explicitly mark selected stock numbers as removed (not sold).

**Snapshot demo tip:** paste a feed containing only `PRM-24001` with snapshot mode on — the review card should list `PRM-24002` and `PRM-24003` as missing from the latest feed.

See `docs/json-ingest.md` for the API contract and portal UI notes.

### Playwright E2E (optional)

Requires demo DB state (`npm run demo:reset`) and free ports 3000 + 5173:

```bash
npm run e2e:portal:install   # once per machine — Chromium only
npm run e2e:portal
```

Tests skip automatically if no dealers are returned from the API.

### CLI ingress tooling

**Check configured sources:**
```bash
npm run ingress:check-source
```

**Poll all sources (imports if new vehicles found):**
```bash
npm run ingress:poll-sources
```

After a successful ingest, the Inventory tab reflects updated counts via the intake refresh hook (inventory reload + ingress runs + benchmarks).

**Ingress run history** is visible under Intake sources — each run shows status, counts, and platform impact when reconcile completes.

---

## Step 4 — Platform publish pipeline

**In the operator portal:**
1. Navigate to the **Sync** tab.
2. The readiness hero shows overall dealer readiness.
3. Platform tiles show each platform's current state (GREEN / YELLOW / RED).
4. The inventory peek confirms how many vehicles are ready vs blocked.

**Via CLI** (replace `<DEALER_ID>` with the ID from Step 0):

Prepare and publish (dry run — inspect without committing):
```bash
npm run publish:prepare -- <DEALER_ID> --dry-run
```

Execute:
```bash
npm run publish:prepare -- <DEALER_ID>
```

View the current publish queue:
```bash
npm run sync:queue -- <DEALER_ID>
```

---

## Step 5 — Sync & approval workflow

After `publish:prepare`, items are in the queue awaiting dispatch.

**Run the scheduler (dispatches READY items):**
```bash
npm run sync:scheduler -- --dry-run
npm run sync:scheduler
```

**List pending approvals:**
```bash
npm run sync:approval -- list <DEALER_ID>
```

**Approve an item:**
```bash
npm run sync:approval -- approve <DEALER_ID> <ITEM_ID>
```

**In the operator portal:**
- Sync tab → **History** shows SyncEvent rows (SUBMISSION_SENT, RECEIPT_RECEIVED, etc.)
- Sync tab → **Accounts** shows platform account state per platform

---

## Step 6 — Performance insights

Performance benchmarks compare each vehicle's days-on-market against similar sold stock.

**In the operator portal:**
1. Navigate to the **Insights** tab.
2. Summary tiles show dealer-level movement (FAST / SLOW / STALE counts, stale risk alerts).
3. Vehicle table shows each vehicle with its movement signal and comparable benchmark.
4. Platform cards show observed assist summaries per platform.

**Refresh performance cache (after new sync events):**
```bash
npm run performance:compute -- <DEALER_ID>
```

Or trigger via the API:
```bash
curl -X POST http://localhost:3000/api/dealers/<DEALER_ID>/performance/compute \
  -H "x-operator-id: dev-operator"
```

> The demo `demo:reset` pre-seeds performance benchmarks with sold comparables. The Insights tab should show populated data immediately after reset. Platform cards include **`consumer-marketplace`** channel metrics (views, detail views, inquiries) from seeded first-party events.

**Language rules enforced in the UI:**
- "movement signal" — not "velocity score" or "sell-through rate"
- "observed assist" — not "sold by [platform]" or "attribution"
- "comparable benchmark" — not "predicted sell time" or "will sell in"

---

## Step 7 — Marketplace browse (public)

Open `http://localhost:5174` in a browser (no login required).

1. The vehicle list shows marketplace-eligible inventory across all dealers.
   After `demo:reset`, Prairie Ridge Motors' vehicles appear here.
2. **Filter** by make, model, or condition using the filter bar at the top.
3. **Click a vehicle card** to open the detail view:
   - Full image gallery (thumbnails + main view)
   - Price, mileage, condition, exterior color, listed date
   - Dealer info with a link to the dealer storefront
   - **Inquiry form** — name, email, phone, message. Submit sends an anonymous lead to the dealer (stored in `Lead` table, not exposed back to the browser).
4. **Click the dealer name** or navigate to `#/dealer/<DEALER_ID>` to see the dealer storefront index — all eligible vehicles from that dealer.
5. Confirm: no VIN, no sync state, no performance signals, no account status visible in any response.

**What the marketplace does NOT show:**
- VIN or internal vehicle IDs
- Platform publish status or sync queue state
- Performance / movement signals
- Dealer readiness scores or account state
- Any operator-internal field

---

## Full verification checklist

Run these in order. All must pass.

```bash
# 1. Validate OpenAPI specs
npm run openapi:validate              # operator spec → valid
npm run openapi:validate:marketplace  # marketplace spec → valid

# 2. Regenerate clients (idempotent — verifies spec → code alignment)
npm run client:generate
npm run client:generate:marketplace

# 3. Run all tests (861 backend + web)
npm run test

# 4. Marketplace boundary check
npm run marketplace:boundary:check    # 0 forbidden imports

# 5. Build all
npm run build:all                     # TypeScript compile + both Vite builds

# 6. Smoke test (requires running DB)
npm run smoke:test                    # 8/8 system checks
```

Or as two commands (steps 1–4, then step 5):

```bash
npm run verify:all && npm run build:all
```

Then `npm run smoke:test` separately (DB required).

**Expected output:**
- OpenAPI: `Woohoo! Your API description is valid.` (both specs)
- Tests: `# tests 861 / # pass 861 / # fail 0`
- Boundary: `Marketplace boundary OK — N file(s) scanned, no forbidden imports.`
- Smoke: `8/8 checks passed`
- Builds: Vite `✓ built in Xs` (both apps)

---

## Known limitations

These are by design for the current development phase.

| Limitation | Detail |
|-----------|--------|
| **No real authentication** | Operator auth is a dev header (`x-operator-id: dev-operator`). Any app with the matching `VITE_DEV_OPERATOR_ID` gets full operator access. No login, sessions, or roles. |
| **All platform dispatch is MOCK** | Every `SubmissionAttempt` has `environment: MOCK`. No real API calls to advertising platforms. Platform "responses" come from `mockPortalResponses.ts`. |
| **No OAuth source credentials** | Ingress polling uses mock responses for external inventory feeds. Real credentials would be set via `PlatformCredentialRef` rows, which do not exist in the demo. |
| **No background scheduler daemon** | `sync:scheduler` runs once and exits. There is no persistent cron process. Run it manually or wire to a system scheduler externally. |
| **No buyer accounts** | Marketplace inquiries are anonymous — name/email/phone only. No login, no saved vehicles, no inquiry history visible in the consumer app. The lead is stored in the `Lead` table and visible to the operator via the API. |
| **No financing, saved cars, or search ranking** | Marketplace is a browse-and-inquire surface only. |
| **Performance signals are cached, not real-time** | `VehiclePerformanceCache` is written by `performance:compute`. The Insights tab reads from cache — it does not recompute on load. Run `performance:compute` after new sync events to refresh. |
| **Email is mocked** | `DealerNotification` rows are written to the DB; no SMTP delivery. `nodemailer` transport is set to MOCK in all dev environments. |
| **Single demo dealer** | `demo:reset` creates one dealer. Multi-dealer demo requires running `npm run dealer:create` for additional dealers after the reset. |
| **No production auth guard** | The `DEV_OPERATOR_ID` mechanism is for local dev only. A real deployment requires replacing the `x-operator-id` middleware with proper session/JWT auth. |

---

## Troubleshooting

**`smoke:test` fails with "DB connection" error**
MySQL is not running or `DATABASE_URL` is wrong. Start WampServer and verify the connection string in `.env`.

**Operator portal shows empty dealer list**
Either `server:start` is not running, or `VITE_DEV_OPERATOR_ID` does not match `DEV_OPERATOR_ID`. Check both `.env` and `apps/web/.env.local`.

**Marketplace shows no vehicles**
Vehicles must have `priceCents > 0`, `soldAt = null`, `removedAt = null`. Run `npm run demo:reset` to restore clean demo data.

**Port already in use**
Kill the process using the port: `lsof -ti:3000 | xargs kill` (Mac/Linux) or check Task Manager for `node.exe` processes (Windows).

**`demo:reset` exits non-zero**
One of the in-memory POC checks failed. Run `npm run poc:green` and `npm run poc:risk` separately to identify the failing check.

**`verify:all` fails on `openapi:validate`**
A route was added without updating the OpenAPI spec. See `docs/handoff.md` → HTTP Route Contract for the required steps.
