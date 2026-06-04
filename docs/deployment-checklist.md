# Deployment Checklist

> Use this before any environment change, operator handoff, or pilot engagement.

---

## Requirements

| Requirement | Version | Check |
|---|---|---|
| Node.js | 22+ | `node --version` |
| MySQL | 8.0+ | WampServer or standalone |
| npm | 9+ | `npm --version` |

---

## Environment Variables

Create `.env` from `.env.example`. All variables required before running any command.

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | MySQL connection string | `mysql://root:@localhost:3306/dealer_onboarding_poc` |
| `APP_BASE_URL` | Base URL for lead capture links | `http://localhost:3000` |
| `FEED_EXPORTS_DIR` | Directory for artifact output | `./exports` (default) |
| `PORT` | HTTP server port | `3000` (default) |
| `HOST` | HTTP server bind address | `127.0.0.1` (default) |
| `DEV_OPERATOR_ID` | Local dev operator id accepted by protected API routes | `dev-operator` |
| `DEV_OPERATOR_DEALER_IDS` | Optional comma-separated dealership allowlist for the dev operator | blank = all seeded dealers |

For the Vite UI, create `apps/web/.env.local` and set:

```bash
VITE_DEV_OPERATOR_ID=dev-operator
```

`VITE_DEV_OPERATOR_ID` is sent as `x-operator-id` by the frontend during local development. It should match `DEV_OPERATOR_ID` for the API process. This is a dev placeholder only, not production login.

---

## First-Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Push schema to MySQL (safe, additive)
npm run db:push

# 3. Seed platform profiles + pristine dealer
npm run db:seed

# 4. Verify everything works
npm run smoke:test
```

Expected smoke test output: `6/6 checks passed`

---

## Smoke Test

Run before every deployment and after any schema change:

```bash
npm run smoke:test
```

Checks:
- DB connection reachable
- 18/18 platform profiles seeded
- At least 1 dealer in DB
- All 18 platform profiles within the 180-day freshness window
- `validate:pristine` passes (18/18 GREEN, 0 RED)
- TypeScript compiles clean

---

## Regression Contract (10 commands)

All 10 must pass before shipping any change:

```bash
npm test                          # 242 tests, 0 failing
npm run poc:green                 # 18/18 platforms GREEN
npm run poc:risk                  # 90/90 risk matrix expectations
npm run poc:portal                # 18/18 platforms reach ACTIVE
npm run validate:pristine         # 18/18 GREEN baseline, 0 RED strict
npm run validate:pristine:db      # same, reading from DB
npm run dealer:create:pristine    # exits 0, 18 GREEN, 18+ artifacts
npm run dealer:status <id>        # prints status grid from DB
npm run dealer:proof <id>         # exports ZIP with expanded manifest
npm run demo:reset                # full teardown + reseed + all checks
```

---

## Schema Changes

Always use additive-only changes:

```bash
# After editing prisma/schema.prisma:
npm run db:push

# Verify types regenerated:
npm run typecheck

# Run regression:
npm run smoke:test
```

**Never** use `prisma migrate reset` in an environment with real dealer data. Use `db:push` only.

---

## Fresh DB Reset (destructive — dev only)

```bash
npm run db:reset      # force-resets schema + re-seeds
npm run smoke:test    # verify clean state
```

---

## Operator: Onboard a New Dealer

```bash
# 1. Create dealer + inventory from JSON file
npm run dealer:create -- --dealer-file <path-to-dealer.json>

# 2. Verify status
npm run dealer:status -- <dealershipId>

# 3. Export proof folder
npm run dealer:proof -- <dealershipId>

# 4. Generate invoice
npm run dealer:invoice -- <dealershipId> <YYYY-MM>

# 5. Portable export (backup)
npm run dealer:export -- <dealershipId>
```

---

## Operator: Record Inventory Change

```bash
# Price change
npm run vehicle:update -- <dealershipId> <stockNumber> PRICE_CHANGE --price <cents>

# Mark sold
npm run vehicle:update -- <dealershipId> <stockNumber> SOLD

# Mark removed
npm run vehicle:update -- <dealershipId> <stockNumber> REMOVED
```

---

## HTTP API Server

```bash
npm run server:start
# Listens on http://127.0.0.1:3000 by default

# Routes:
GET  /health
GET  /api/dealers/:dealershipId/storefront
GET  /api/dealers/:dealershipId/vehicles/:stockNumber
POST /api/dealers/:dealershipId/leads
PATCH /api/dealers/:dealershipId/vehicles/:stockNumber/price
POST  /api/dealers/:dealershipId/vehicles/:stockNumber/sold
POST  /api/dealers/:dealershipId/vehicles/:stockNumber/removed
PATCH /api/dealers/:dealershipId/vehicles/:stockNumber/photos
```

Operator routes require `x-operator-id`, `Authorization: Bearer <operator>`, or `DEV_OPERATOR_ID`. Public storefront reads do not require auth. Lead capture is public-write and rate-limited.

---

## Environment Tags

Every submission attempt, artifact, and credential reference carries an `environment` field:

| Value | Meaning |
|---|---|
| `MOCK` | No real API calls. All current data. |
| `SANDBOX` | Sandbox credentials. Not customer-facing. |
| `PRODUCTION` | Live credentials. Real platform submissions. |

All data written today is `MOCK`. The gate before any real API call is switching to `SANDBOX`.

---

## Known Constraints

- **Prisma pinned to `^6`** — v7 removed datasource URL and requires a driver adapter. Migration path exists but is not on the critical path.
- **No real SMTP** — `DealerNotification` rows are written to DB; `deliveredAt` stays null in MOCK env.
- **No sandbox credentials** — `PlatformCredentialRef` model exists; no real keys stored.
- **Media URLs in demo data** — pristine fixture uses `example.com` placeholder URLs. URL validator flags these as WARN (not FAIL). Real dealer data should use production CDN URLs.
- **Port 3000 default** — change via `PORT` env var if conflicting with other local services.
