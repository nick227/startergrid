# Deployment Checklist

> Use this before any environment change, operator handoff, or pilot engagement.

---

## Requirements

| Requirement | Version | Check |
|---|---|---|
| Node.js | 22+ | `node --version` |
| MySQL | 8.0+ | WampServer or standalone |
| npm | 9+ | `npm --version` |
| PM2 (optional) | 5+ | `pm2 --version` |

---

## Environment Variables

Create `.env` from `.env.example`. All required variables must be set before running any command.

### Always required

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` or `production` |
| `DATABASE_URL` | MySQL connection string | `mysql://root:@localhost:3306/dealer_poc` |
| `APP_BASE_URL` | Base URL for artifact URLs and lead links | `https://dealer.example.com` |

### Production-only required (`NODE_ENV=production`)

| Variable | Description | Example |
|---|---|---|
| `SESSION_SECRET` | Signed session key, min 32 chars | (generate with `openssl rand -hex 32`) |
| `PUBLIC_WRITE_RATE_LIMIT` | Max public-write requests per IP per window | `20` |
| `PUBLIC_WRITE_RATE_WINDOW_MS` | Rate limit window in milliseconds | `60000` |

> The server calls `validateEnv()` before binding the port and exits with an error listing every problem if any required var is missing or invalid.

### Production-forbidden (must be absent or empty)

| Variable | Reason |
|---|---|
| `DEV_OPERATOR_ID` | Dev auth fallback — rejected in production |
| `DEV_OPERATOR_DEALER_IDS` | Dev dealer scope — rejected in production |

### Optional (all environments)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `HOST` | `127.0.0.1` | HTTP server bind address |
| `DISPATCH_ENVIRONMENT` | `MOCK` | `MOCK` \| `SANDBOX` \| `PRODUCTION` — dispatch safety gate |
| `FEED_EXPORTS_DIR` | `./exports` | Feed artifact output directory |
| `MOCK_OUTBOX_DIR` | `./mock-outbox` | Mock email output (dev only; ignored when NODE_ENV=production) |
| `MOCK_RECEIPT_DIR` | `./mock-platform-receipts` | Mock receipt output (dev only) |

### Production-only SMTP (required when `NODE_ENV=production`)

Email is delivered via SMTP in production. All five vars are required; `validateEnv()` exits at startup if any are missing.

| Variable | Description | Example |
|---|---|---|
| `SMTP_HOST` | SMTP server hostname | `smtp.mailgun.org` |
| `SMTP_PORT` | SMTP server port (positive integer) | `587` |
| `SMTP_USER` | SMTP auth username | `postmaster@mg.example.com` |
| `SMTP_PASS` | SMTP auth password | (secret — use a secrets manager) |
| `SMTP_FROM` | From address for outgoing notifications | `no-reply@dealer.example.com` |

> **Note:** SMTP delivery requires wiring in a real library (e.g. nodemailer) in `src/services/dealer/emailTransport.ts`. The transport seam is in place and validated; the send call throws `SmtpNotImplementedError` until the library is added. See `docs/plans/production-readiness.md` Phase 4.

### Operator UI (dev only)

Create `apps/web/.env.local`:
```bash
VITE_DEV_OPERATOR_ID=dev-operator
```
`VITE_DEV_OPERATOR_ID` is sent as `x-operator-id` by the frontend during local development. Must match `DEV_OPERATOR_ID`. Dev placeholder only.

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

Expected smoke test output: `9/9 checks passed`

---

## Smoke Test

Run before every deployment and after any schema change:

```bash
npm run smoke:test
```

Checks:
1. DB connection reachable
2. 19/19 platform profiles seeded
3. At least 1 dealer in DB
4. All 19 platform profiles within the 180-day freshness window
5. `validate:pristine` passes (19/19 GREEN, 0 RED)
6. TypeScript compiles clean
7. Dev operator auth contract (401 unauthenticated, 200 authenticated)
8. `ingress:poll-sources --dry-run` exits 0
9. `validateEnv` rejects a known-bad config (env validation self-test)

---

## Build

Build TypeScript and both UIs before deploying:

```bash
npm run build:all
```

This is required before PM2 or any `node dist/...` invocation. The output goes to `dist/`.

---

## Regression Contract

All must pass before shipping any change:

```bash
npm test                          # 1127+ tests, 0 failing
npm run typecheck                 # TypeScript, no emit
npm run poc:green                 # 19/19 platforms GREEN
npm run poc:risk                  # 90/90 risk matrix expectations
npm run poc:portal                # 19/19 platforms reach ACTIVE
npm run validate:pristine         # 19/19 GREEN baseline, 0 RED strict
npm run validate:pristine:db      # same, reading from DB
npm run marketplace:boundary:check  # 0 forbidden imports in apps/marketplace/src/
npm run openapi:validate          # operator OpenAPI spec valid
npm run openapi:validate:marketplace  # marketplace OpenAPI spec valid
npm run smoke:test                # 9/9 system checks (DB, profiles, typecheck)
```

---

## Deploy Sequence

Order matters. Do not proceed past a failing step.

```bash
# 1. Pull code
git pull origin main

# 2. Install deps
npm install
npm run ui:install
npm run marketplace:install

# 3. Build
npm run build:all

# 4. DB: apply schema changes (additive only — never destructive in production)
npm run db:push

# 5. DB: seed if new platform profiles were added (upsert by slug, idempotent)
npm run db:seed

# 6. Validate live DB
npm run validate:pristine:db

# 7. Full smoke test
npm run smoke:test

# 8. Restart server and jobs
pm2 restart ecosystem.config.js --env production
# or: systemctl restart dealer-api dealer-sync-scheduler dealer-ingress-poll dealer-performance-compute

# 9. Post-restart health check
curl http://localhost:3000/health
```

### Rollback gate

If any step in 6–8 fails: stop, roll back to the previous tag. `db:push` is additive — no DB rollback needed unless columns were dropped (never drop columns in a pilot deploy).

---

## Recurring Jobs

Three jobs run on a fixed cadence. None run long-term — each starts, does work, and exits.

### Job summary

| Job | npm script | Dist entrypoint | Cadence | Exit behavior |
|-----|-----------|-----------------|---------|--------------|
| Sync scheduler | `sync:scheduler` | `dist/src/scripts/sync/syncScheduler.js` | Every 5 min | 0 on clean run; 1 on fatal config/DB error |
| Ingress poll | `ingress:poll-sources` | `dist/src/scripts/inventory/pollSources.js` | Every 5 min | 0 on clean run; 1 when any source check fails (non-dry-run) |
| Performance compute | `performance:compute` | `dist/src/scripts/performance/computePerformance.js` | Every 15 min | 0 on clean run; 1 when no dealers in DB or fatal error |

All three:
- Print a structured first line: `<JobName> started <ISO 8601 timestamp>` — parseable by log aggregators
- Call `prisma.$disconnect()` before every exit path
- Print a human-readable summary before exiting

### Structured start line (log parsing)

Every job emits this as its very first stdout line:

```
SyncScheduler started 2026-06-06T12:00:00.000Z
IngressPoll started 2026-06-06T12:05:00.000Z
PerformanceCompute started 2026-06-06T12:00:00.000Z
```

Use these to drive alerting: if a job's start line doesn't appear within `cadence + 60s`, the job failed to launch.

### PM2 setup

```bash
# Copy example config to project root
cp docs/examples/ecosystem.config.js ecosystem.config.js

# Edit ecosystem.config.js and fill in production env vars
# (DATABASE_URL, APP_BASE_URL, SESSION_SECRET, PUBLIC_WRITE_RATE_LIMIT, etc.)

# Start all processes
pm2 start ecosystem.config.js --env production

# Persist across reboots
pm2 save
pm2 startup   # follow the printed instructions to install OS startup hook

# Monitor
pm2 list
pm2 logs
pm2 logs sync-scheduler --lines 50
```

**PM2 cron mode** (`cron_restart` + `autorestart: false`) starts each job process on schedule and lets it exit naturally. PM2 does not restart on crash — the next cron tick launches a fresh process. This matches the job's design (one-shot scripts, not long-running daemons).

### Cron alternative (no PM2)

Add to `/etc/cron.d/dealer-sync` (adjust paths):

```cron
# Auto Dealer Sync Engine — recurring jobs
# Requires: NODE_ENV and other env vars exported in /etc/environment or sourced below.

SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin

# Sync scheduler — every 5 minutes
*/5 * * * * dealer /path/to/app/node dist/src/scripts/sync/syncScheduler.js >> /var/log/dealer/sync-scheduler.log 2>&1

# Ingress poll — every 5 minutes
*/5 * * * * dealer /path/to/app/node dist/src/scripts/inventory/pollSources.js >> /var/log/dealer/ingress-poll.log 2>&1

# Performance compute — every 15 minutes
*/15 * * * * dealer /path/to/app/node dist/src/scripts/performance/computePerformance.js >> /var/log/dealer/performance-compute.log 2>&1
```

Replace `/path/to/app` with the actual project root. Env vars must be available in the cron environment (export them in `/etc/environment` or use `dotenv-cli` as a wrapper).

### Alerting guidance

Monitor for non-zero exit codes. With PM2:

```bash
# PM2 exit code is visible in pm2 list "status" column.
# A non-zero exit sets status to "errored".
pm2 list
```

With cron, pipe output to a log and alert when the file's last line does not match the expected summary pattern within `cadence + 60s`.

**Dry-run verification (safe to run anytime):**

```bash
node dist/src/scripts/sync/syncScheduler.js --dry-run
node dist/src/scripts/inventory/pollSources.js --dry-run
node dist/src/scripts/performance/computePerformance.js --dry-run
```

All three must exit 0. Run these after deploy to verify job scripts are functional before the first scheduled execution.

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

## Ingress Source Polling

API inventory sources (`kind: API`) can be polled automatically. See `docs/ingress-polling.md` for full setup.

```bash
# Dry-run: show which sources are due without fetching
npm run ingress:poll-sources -- --dry-run

# Check all due sources across all dealers
npm run ingress:poll-sources

# Check one dealer's sources only
npm run ingress:poll-sources -- --dealer <dealershipId>

# Retry ERROR sources
npm run ingress:poll-sources -- --retry-errors
```

**Before enabling automated polling:**

- [ ] Source registered with valid HTTPS `feedUrl`
- [ ] `pollIntervalMinutes` set in operator UI
- [ ] Manual check verified: `npm run ingress:check-source -- <dealerId> <sourceId>`
- [ ] Dry-run passes: `npm run ingress:poll-sources -- --dry-run`
- [ ] External scheduler (PM2 or cron) configured at a cadence shorter than shortest source interval
- [ ] Alerts wired for non-zero exit code (feed failures)

---

## HTTP API Server

```bash
npm run server:start
# Listens on http://127.0.0.1:3000 by default (change via PORT/HOST env vars)
```

Health check: `curl http://localhost:3000/health` → `{"ok":true,"ts":"..."}`

**Production auth:** operator routes require a valid `op_session` HttpOnly cookie issued by `POST /api/auth/login`. The `x-operator-id` header and `DEV_OPERATOR_ID` env var are rejected in production.

**Dev/test auth:** `op_session` cookie (real session) takes priority. Falls back to `x-operator-id` request header, then `DEV_OPERATOR_ID` env var. `DEV_OPERATOR_DEALER_IDS` restricts dealer access in dev (comma-separated IDs; empty = unrestricted). Both dev vars are banned in production by `validateEnv()`.

Public storefront reads require no auth. Lead capture and marketplace events are public-write and rate-limited.

---

## Dispatch Environment

Every submission attempt, artifact, and credential reference carries an `environment` field:

| Value | Meaning |
|---|---|
| `MOCK` | No real API calls. Default. All current data. |
| `SANDBOX` | Sandbox credentials. Not customer-facing. (not yet implemented) |
| `PRODUCTION` | Live credentials. Real platform submissions. (not yet implemented) |

The `DISPATCH_ENVIRONMENT` env var controls the active environment. Invalid values fail `validateEnv()` at startup. `PRODUCTION` dispatches require both `DISPATCH_ENVIRONMENT=PRODUCTION` and a live adapter (not yet built).

---

## Known Constraints

- **Prisma pinned to `^6`** — v7 removed datasource URL and requires a driver adapter. Upgrade path exists but is deferred.
- **SMTP transport seam in place, not yet wired** — `emailTransport` routes to mock outbox in dev and to `smtpSend` in production. `smtpSend` throws `SmtpNotImplementedError` until nodemailer (or equivalent) is added. `DealerNotification.deliveryStatus` tracks PENDING → SENT / FAILED. Email failures are non-blocking — they never fail the triggering business operation.
- **No sandbox credentials** — `PlatformCredentialRef` model exists; no real keys stored.
- **No live platform dispatch** — all `SubmissionAttempt` rows carry `environment: MOCK`. Phase 3 (dispatch adapter) is implemented; live adapters are not.
- **In-memory rate limiting** — `checkPublicWriteAbuseLimit` uses a per-process `Map`. Buckets reset on restart and are not shared across instances. Single-instance pilot only; Redis/DB-backed for multi-instance.
- **Operator auth is session-cookie based** — `POST /api/auth/login` issues an `op_session` cookie (SHA-256 hashed token, 8-hour expiry, DB-backed). SUPER_ADMIN has global dealer access; OPERATOR is scoped to their `OperatorDealerAccess` rows. `x-operator-id` header is dev/test-only. Create operator accounts via `authSeedService` or a future admin UI.
- **Media URLs in demo data** — pristine fixture uses `example.com` placeholder URLs. URL validator flags these as WARN (not FAIL). Real dealer data should use production CDN URLs.
