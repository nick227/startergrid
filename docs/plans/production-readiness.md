# Production Readiness Hardening Plan

**Created:** 2026-06-06  
**Status:** Plan only — no implementation yet  
**Scope:** What must change before the first controlled dealer pilot. Does not include live platform dispatch, real SMTP, or marketing-facing features.

---

## Guiding Principle

The system is architecturally sound. The gaps are operational: auth is a dev header, dispatch is MOCK, email is a local file, and process runners are manual CLI invocations. This plan closes those gaps in phases ordered by blocking risk. Nothing here requires new product features — it is plumbing, safety gates, and startup discipline.

---

## Current State Snapshot

| Layer | Today | Pilot Requirement |
|-------|-------|-------------------|
| Operator auth | `x-operator-id` dev header or `DEV_OPERATOR_ID` env fallback | Real session/token — dev header removed from production |
| Dealer scoping | `DEV_OPERATOR_DEALER_IDS` env comma-list | DB-backed operator→dealership mapping |
| Marketplace auth | None (public GET, rate-limited POST) | Same — GETs stay public; dealer inbox requires auth (deferred) |
| Dispatch environment | All `SubmissionAttempt` rows are `MOCK` | Hard gate blocks non-MOCK execution without explicit env flag |
| Email / notifications | `writeMockEmail` → `mock-outbox/` local files | Real SMTP transport behind env-controlled adapter |
| Scheduler | Manual CLI: `npm run sync:scheduler` | Cron or process manager on a fixed interval |
| Ingress poll | Manual CLI: `npm run ingress:poll-sources` | Same — cron on per-source `pollIntervalMinutes` cadence |
| Performance compute | Manual CLI or in-process post-reconcile | Cron or triggered job; not a request-path concern |
| Env vars | `DATABASE_URL`, `DEV_OPERATOR_ID` | Validated at startup; process exits on missing required vars |
| Rate limits | In-memory bucket map (per-IP, per-process) | Must survive restart; Redis or DB-backed for multi-instance |

---

## Phase 1 — Startup Safety and Environment Validation ✅ Implemented (2026-06-06)

**Implemented in:** `src/server/env.ts` (new), `src/scripts/server.ts`, `src/server/app.ts`. Tests: `src/tests/envValidation.test.ts` (39 tests).

**Goal:** The server refuses to start if it is misconfigured. No silent fallbacks to dev values in production.

### 1.1 — Required env var manifest

Define a canonical list of required and optional vars. Validate at server startup before binding the port.

```
Required (always):
  DATABASE_URL            MySQL connection string
  NODE_ENV                "development" | "production" | "test"
  APP_BASE_URL            Used in feed artifact URLs and storefront links

Required in production (NODE_ENV=production):
  SESSION_SECRET          Min 32 chars; used by future session layer
  PUBLIC_WRITE_RATE_LIMIT Integer; default 20 in dev, must be explicit in prod
  PUBLIC_WRITE_RATE_WINDOW_MS  Integer; default 60000

Optional (dev-only, must be absent or ignored in production):
  DEV_OPERATOR_ID         Dev auth fallback — rejected if NODE_ENV=production
  DEV_OPERATOR_DEALER_IDS Dev dealer scope list — rejected if NODE_ENV=production

Optional (all environments):
  MOCK_OUTBOX_DIR         Defaults to ./mock-outbox; unused when real SMTP is wired
  MOCK_RECEIPT_DIR        Defaults to ./mock-platform-receipts
  FEED_EXPORTS_DIR        Defaults to ./exports
  DISPATCH_ENVIRONMENT    "MOCK" | "SANDBOX" | "PRODUCTION" — default MOCK; gate on this
```

### 1.2 — Startup validation implementation

Add a `validateEnv()` function called before `buildApp()` in `src/scripts/server.ts`. It must:

1. Check all required vars are non-empty strings.
2. In `NODE_ENV=production`, reject `DEV_OPERATOR_ID` and `DEV_OPERATOR_DEALER_IDS` if present.
3. Validate `DATABASE_URL` is parseable as a URL (does not test connectivity — DB check is a separate smoke step).
4. Validate `DISPATCH_ENVIRONMENT` is one of the allowed enum values if set.
5. Exit with code 1 and a clear error message listing every missing/invalid var. Do not start partially.

**Acceptance criteria:**
- `NODE_ENV=production` server with no `SESSION_SECRET` exits before binding port.
- `NODE_ENV=production` server with `DEV_OPERATOR_ID` set exits with an explicit rejection.
- `NODE_ENV=development` server with `DEV_OPERATOR_ID` starts normally.
- Smoke test adds a check: `validateEnv()` throws on a known-bad config object.

### 1.3 — Dev-only endpoints gated at startup

`/dev/demo-feed` in `src/server/app.ts` must not be registered when `NODE_ENV=production`. Wrap with a `NODE_ENV !== 'production'` guard before registration.

---

## Phase 2 — Operator Auth ✅ Implemented (2026-06-06)

**Implemented in phases:**
- **B1** (`src/services/auth/passwordService.ts`, `sessionService.ts`): Password hashing (argon2id) + session token primitives (SHA-256 hashed, 8-hour expiry, DB-backed). Tests: `src/tests/operatorAuth.test.ts` (session service layer, no routes).
- **B2** (`src/server/routes/auth.ts`): Login (`POST /api/auth/login`), logout (`POST /api/auth/logout`), identity (`GET /api/auth/me`) routes. op_session HttpOnly cookie with `Secure` flag in production. Tests: `src/tests/operatorAuthRoutes.test.ts`.
- **B3** (`src/server/security.ts`): Production operator guard migration — `requireOperator` and `requireDealerAccess` migrated to real session auth. Tests: `src/tests/operatorGuardMigration.test.ts` (17 tests). Total suite: 1256 tests green.

**Goal:** Replace the dev header with a real session-cookie identity layer. Dealer scoping moves from env var to DB.

### 2.1 — Auth model decision ✅

Session cookie chosen over JWT: trivial revocation, standard for web portals, DB-backed `OperatorSession` table. Session token is 32 random bytes (raw), stored as SHA-256 hash. Raw token sent via `op_session` HttpOnly cookie.

### 2.2 — Operator identity model ✅

`request.operator` is now `OperatorContext = OperatorIdentity & { devHeader: boolean }` — includes `id`, `email`, `role`, `dealerAccessIds`, and a flag indicating whether auth came from the dev `x-operator-id` header. Real sessions populate all fields from the DB.

DB tables in `prisma/schema.prisma`:
- `OperatorAccount` (id, email, passwordHash argon2id, role, isActive, lastLoginAt)
- `OperatorDealerAccess` (operatorAccountId, dealershipId, grantedAt, grantedBy)
- `OperatorSession` (tokenHash SHA-256, operatorAccountId, expiresAt, revokedAt, ipAddress, userAgent)

### 2.3 — `requireDealerAccess` ✅

Production: SUPER_ADMIN → global access. OPERATOR → `dealerAccessIds` from session (loaded via `OperatorDealerAccess` at session creation, embedded in `OperatorIdentity`). No env var used.

Dev/test: `x-operator-id` path uses `DEV_OPERATOR_DEALER_IDS` restriction (empty = unrestricted). `DEV_OPERATOR_DEALER_IDS` is banned in production by `validateEnv()`.

### 2.4 — Login and session endpoints ✅

```
POST /api/auth/login    { email, password } → { id, email, role, dealerAccessIds } + op_session cookie
POST /api/auth/logout   op_session cookie → revokes session row; clears cookie
GET  /api/auth/me       op_session cookie → { id, email, role, dealerAccessIds }
```

### 2.5 — Marketplace dealer-only routes (deferred — plan only)

The planned `apps/marketplace/dealer` area needs a separate auth path. Options:

1. Same operator JWT with a `role: DEALER` variant — simpler, single token system.
2. Separate dealer magic-link email auth — better for dealers who will not manage passwords.

**Decision deferred.** The public marketplace routes (`GET /api/marketplace/*`) and rate-limited POSTs require no auth change. The dealer inbox is not built; do not design its auth until the surface is defined.

**Acceptance criteria for Phase 2:**
- `POST /api/auth/login` with valid credentials returns a signed JWT.
- `GET /api/dealers` with no token returns 401.
- `GET /api/dealers` with a valid token scoped to dealer A returns only dealer A (if scoped).
- `DEV_OPERATOR_ID` env path still works in `NODE_ENV=development`.
- Auth contract test (`src/tests/routeContract.test.ts`) updated and green.

---

## Phase 3 — Dispatch Safety Gates ✅ Implemented (2026-06-06)

**Implemented in:** `src/services/publishing/dispatchAdapter.ts` (new), `schedulerService.ts`, `applicationActivationService.ts`, `lifecyclePersistenceService.ts`, `scripts/sync/syncScheduler.ts`. Tests: `src/tests/dispatchAdapter.test.ts` (36 tests, 1056 suite total green).

**Goal:** It must be structurally impossible to send a real platform API call unless `DISPATCH_ENVIRONMENT=PRODUCTION` is explicitly set by an operator with appropriate access.

### 3.1 — Current state

All `SubmissionAttempt` rows carry `environment: MOCK`. `mockReceiptService.ts` writes to `mock-platform-receipts/`. No real HTTP is made anywhere.

### 3.2 — Dispatch environment gate

Add a `getDispatchEnvironment()` helper that reads `DISPATCH_ENVIRONMENT` and validates it is one of `MOCK | SANDBOX | PRODUCTION`. Default to `MOCK`.

The scheduler (`schedulerService.ts`) must pass the dispatch environment into every `SubmissionAttempt` write and log it at run start. The gate is enforced in the adapter layer, not the scheduler — the scheduler just records what environment was active.

### 3.3 — Platform adapter boundary

The dispatch path currently ends at `mockReceiptService.ts`. The future live adapter pattern should be:

```
schedulerService → dispatchAdapter(platformSlug, environment, payload)
                        ├── environment=MOCK    → mockReceiptService (current)
                        ├── environment=SANDBOX → sandboxAdapter (future)
                        └── environment=PRODUCTION → liveAdapter (future, gated)
```

`dispatchAdapter` is the single insertion point. It must:

1. Reject any `PRODUCTION` call if `DISPATCH_ENVIRONMENT !== 'PRODUCTION'` (belt and suspenders — the env var is the gate, not just a label on the record).
2. Log the environment and platform slug for every dispatch attempt regardless of environment.
3. Not exist yet for SANDBOX/PRODUCTION — those are stub throws until implemented per-platform.

### 3.4 — Pre-dispatch safety checklist (required before enabling SANDBOX for any platform)

Before any platform adapter is implemented beyond MOCK:

- [ ] Platform credential storage (`PlatformCredentialRef`) must be encrypted at rest, not stored as plaintext JSON.
- [ ] A `SANDBOX` environment for that platform must be confirmed available and tested manually.
- [ ] A rate-limit / daily-cap guard for that platform's API must be wired.
- [ ] The operator must explicitly mark a dealership as `SANDBOX_ELIGIBLE` — no accidental sandbox calls.

**Acceptance criteria for Phase 3:**
- Scheduler logs `[MOCK]` at run start; changing env var to a bad value exits non-zero.
- A `dispatchAdapter` function exists and routes to `mockReceiptService` for `MOCK`.
- Any call with `environment=PRODUCTION` where `DISPATCH_ENVIRONMENT !== 'PRODUCTION'` throws a typed `DispatchSafetyError` and creates no `SubmissionAttempt`.

---

## Phase 4 — Notification / Email ✅ Transport seam implemented (2026-06-06)

**Implemented in:** `src/services/dealer/emailTransport.ts` (new — `emailTransport`, `SmtpNotImplementedError`), `dealerNotificationService.ts` (rewritten — non-blocking, injectable transport, `deliveryStatus` tracking), `prisma/schema.prisma` (`deliveryStatus` added to `DealerNotification`), `src/server/env.ts` (SMTP vars validated in production). Tests: `src/tests/emailTransport.test.ts` (transport routing, non-blocking contract) + `src/tests/envValidation.test.ts` (SMTP validation). Total: 1166 tests green.

**Remaining step before pilot:** Wire a real SMTP library (e.g. nodemailer) into `smtpSend()` in `emailTransport.ts`. The seam, env validation, and status tracking are all in place.

**Goal:** Operator notifications reach a real inbox in production. Dev workflow is unchanged.

### 4.1 — Current state

`writeMockEmail` in `mockEmailService.ts` writes JSON to `MOCK_OUTBOX_DIR`. `DealerNotification` rows are written to the DB. No SMTP is involved anywhere.

### 4.2 — Email adapter pattern (mirrors dispatch pattern)

```
notificationService → emailTransport(to, subject, body, options)
                          ├── NODE_ENV !== 'production' → writeMockEmail (current)
                          └── NODE_ENV=production       → smtpTransport (future)
```

`smtpTransport` reads from env:
```
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
```

All five must be present and non-empty when `NODE_ENV=production`. Validation in `validateEnv()`.

### 4.3 — Failure handling

Email failure must never fail the operation that triggered it. The pattern:

```ts
try {
  await emailTransport(...)
} catch (err) {
  await logNotificationFailure(prisma, notificationId, err)
  // continue — the operation (publish, proof, etc.) is already committed
}
```

A `DealerNotification.deliveryStatus` column tracks `PENDING | SENT | FAILED`. A retry job (separate, not in the request path) can re-attempt failed notifications.

### 4.4 — Proof / export emails

`dealer:proof` and `dealer:export` currently write ZIP files to local disk. They do not email. For pilot:

- The ZIP file path is returned to the CLI and logged — no email required.
- A future enhancement can attach or link the export in a notification email.
- Do not add email to these scripts as part of this hardening pass.

**Acceptance criteria for Phase 4:**
- `NODE_ENV=development` path writes to `MOCK_OUTBOX_DIR` (no change).
- `NODE_ENV=production` with `SMTP_*` vars set routes to `smtpTransport`.
- `NODE_ENV=production` without `SMTP_*` vars fails `validateEnv()` before server start.
- Email failure does not roll back the triggering operation; `DealerNotification.deliveryStatus` set to `FAILED`.

---

## Phase 5 — Scheduler and Process Operations ✅ Implemented (2026-06-06)

**Implemented in:** `src/lib/jobLog.ts` (new — `jobStarted`/`jobStartedLine` helpers), `syncScheduler.ts`, `pollSources.ts`, `computePerformance.ts` (structured start lines + disconnect-before-exit fix), `docs/examples/ecosystem.config.js` (PM2 config), `docs/deployment-checklist.md` (recurring jobs section). Tests: `src/tests/jobLog.test.ts` (8 tests).

**Goal:** The three recurring jobs run on a predictable cadence without manual CLI invocations.

### 5.1 — Jobs and their natural cadence

| Job | Script | Cadence | Notes |
|-----|--------|---------|-------|
| Sync scheduler | `sync:scheduler` | Every 5 minutes | Processes `READY` + `SCHEDULED` + `FAILED`-with-backoff queue items |
| Ingress poll | `ingress:poll-sources` | Every 5 minutes | Respects per-source `pollIntervalMinutes`; the script itself skips non-due sources |
| Performance compute | `performance:compute` | Every 15 minutes or on-demand | Reads DB; writes to cache tables. CPU-light. |

### 5.2 — Process manager setup (recommended: PM2)

```bash
# ecosystem.config.js (not yet in repo)
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: 'dist/src/scripts/server.js',
      instances: 1,
      env_production: { NODE_ENV: 'production' }
    },
    {
      name: 'sync-scheduler',
      script: 'dist/src/scripts/sync/syncScheduler.js',
      cron_restart: '*/5 * * * *',
      autorestart: false,   // cron-mode — PM2 restarts on schedule, not crash
      env_production: { NODE_ENV: 'production' }
    },
    {
      name: 'ingress-poll',
      script: 'dist/src/scripts/inventory/pollSources.js',
      cron_restart: '*/5 * * * *',
      autorestart: false,
      env_production: { NODE_ENV: 'production' }
    },
    {
      name: 'performance-compute',
      script: 'dist/src/scripts/performance/computePerformance.js',
      cron_restart: '*/15 * * * *',
      autorestart: false,
      env_production: { NODE_ENV: 'production' }
    }
  ]
}
```

Alternatively, use OS-level cron with `node dist/src/scripts/...` commands and redirect output to a log file. PM2 is preferred because it captures stdout/stderr per process.

### 5.3 — Job safety requirements

Each job script must:

1. Exit with code 0 on clean run (even if zero items were processed).
2. Exit with code 1 on fatal error (DB connection failure, uncaught exception).
3. Exit with code 1 on partial failure only when the job explicitly opts in (e.g., `pollSources` exits 1 if `failed > 0`).
4. Always call `prisma.$disconnect()` before exit — no hanging connections.
5. Include a structured first log line: `<JobName> started YYYY-MM-DDTHH:mm:ssZ` for log parsing.

All three scripts already satisfy most of these. The missing piece is the structured start line; add it before pilot.

### 5.4 — What stays on the request path

`POST /api/dealers/:id/performance/compute` triggers a manual recompute from the portal. This is intentional and must stay. It does not conflict with the cron job.

`POST /api/dealers/:id/publish/prepare` runs the prepare-and-publish pipeline inline. For pilot this is fine. At scale it should move to a background job queue, but that is not in scope here.

**Acceptance criteria for Phase 5:**
- All three job scripts exit 0 on a clean environment with an empty queue.
- `ecosystem.config.js` (or equivalent cron entries) is committed and documented.
- Smoke test verifies `ingress:poll-sources --dry-run` exits 0 (already passes).

---

## Phase 6 — Data Safety Boundaries ✅ Implemented (2026-06-06)

**Implemented in:** `src/tests/dataSafetyBoundary.test.ts` (new, 63 tests across 9 suites). Full suite: 1119 tests green.

**Accepted limitation — single-instance rate limiting:** `checkPublicWriteAbuseLimit` uses an in-memory `Map` keyed by `scope:ip`. Buckets reset on process restart and are not shared across server instances. Acceptable for a single-instance pilot. Multi-instance requires Redis or a DB-backed bucket table (deferred). Documented below.

**Goal:** Validate that privacy and access boundaries are enforced structurally, not just by convention.

### 6.1 — Marketplace VIN boundary (already implemented — verify only)

The VIN boundary is enforced at two layers:

1. **DB layer:** `VEHICLE_CARD_SELECT` and `VEHICLE_DETAIL_SELECT` in `marketplaceQueryService.ts` use explicit Prisma `select` — VIN is never fetched.
2. **Feed artifact layer:** `generateMarketplaceListingJson` does not include VIN; covered by `consumerMarketplacePlatform.test.ts`.
3. **Type assertion layer:** `apps/marketplace/src/lib/marketplace-boundary.check.ts` compile-time assertions.

For pilot: run `npm run marketplace:boundary:check` and confirm 0 violations. Add this to the deployment checklist.

### 6.2 — Operator auth boundary

All `operator`-classified routes in `security.ts` call `requireOperator` + `requireDealerAccess`. Verify no route in `routeClassifications.operator` skips this call. Add a route contract test that exhaustively checks every `operator` route returns 401 with no auth header.

Currently the route contract test exists in `src/tests/routeContract.test.ts`. Extend it to:

- Assert every `operator` route in `routeClassifications` returns 401 with no `x-operator-id` header.
- Assert every `public` and marketplace route returns something other than 401 with no auth.

### 6.3 — Public-write rate limits

Current implementation uses an in-memory `Map` in `security.ts`. This is per-process — if the server restarts, all buckets reset. For a single-instance pilot this is acceptable.

**Known limitation:** if two server instances run, rate limits are not shared. For single-instance pilot, document this and proceed. For multi-instance, use Redis or a DB-backed bucket table.

For pilot: verify that `POST /api/marketplace/vehicles/:listingId/leads` with 21 rapid requests from the same IP returns 429 on the 21st.

**✅ Rate limit enforcement is now tested** in `src/tests/dataSafetyBoundary.test.ts`: 3 requests with limit=2 → first two pass, third returns 429 with `Retry-After` header. Independent-bucket behavior (different listing IDs don't share counts) also verified. `PUBLIC_WRITE_RATE_LIMIT` and `PUBLIC_WRITE_RATE_WINDOW_MS` env vars are read at call time and respected.

Rate limit configuration must be in env vars, not hardcoded:
- `PUBLIC_WRITE_RATE_LIMIT` (default 20)
- `PUBLIC_WRITE_RATE_WINDOW_MS` (default 60000)

Already implemented in `checkPublicWriteAbuseLimit`. Add to `validateEnv()` validation in production to ensure they are set explicitly.

### 6.4 — Export and proof privacy

`dealer:proof` and `dealer:export` produce ZIP files written to local disk. For pilot:

- Exported ZIPs are accessible to anyone with server shell access — acceptable for a single-operator pilot.
- ZIPs must not include VIN data in any marketplace-facing artifact. The feed artifact in the proof folder uses `generateMarketplaceListingJson` which excludes VIN — already correct.
- Add a smoke check: unzip a generated proof and assert no `"vin"` key appears in `marketplace-listings.json`.

**Acceptance criteria for Phase 6:**
- `marketplace:boundary:check` passes in CI.
- Route contract test covers 401 for all operator routes.
- Rate limit behavior tested with a rapid-fire integration test.
- Proof ZIP marketplace artifact verified VIN-free in smoke test.

---

## Phase 7 — Deployment Checklist

The ordered sequence for every new deployment, including the first pilot deployment.

### 7.1 — Pre-deploy (run locally or in CI before shipping)

```bash
npm run verify:all          # OpenAPI validate (both specs) + tests + boundary check
npm run typecheck           # TypeScript, no emit
npm run ui:build            # Operator portal Vite build
npm run marketplace:build   # Marketplace Vite build + client generate
```

### 7.2 — Deploy sequence (on the target server)

```bash
# 1. Pull code
git pull origin main

# 2. Install deps (backend + UI)
npm install

# 3. Build
npm run build:all

# 4. DB: apply schema changes (additive only — never destructive in production)
npm run db:push

# 5. DB: seed platform profiles if new profiles were added
#    Safe to run multiple times — seed is idempotent on platformProfiles (upsert by slug)
npm run db:seed

# 6. Validate the live DB matches expectations
npm run validate:pristine:db

# 7. Full smoke test (requires DB connectivity)
npm run smoke:test

# 8. Restart server and job processes
pm2 restart ecosystem.config.js --env production
# or equivalent systemd / cron restart

# 9. Post-restart health check
curl http://localhost:3000/health
```

### 7.3 — Rollback gate

If any step from 6–8 fails:

- Do not proceed to the next step.
- Roll back to the previous git tag.
- `db:push` is schema-additive only — no rollback needed for DB unless the deploy added columns. Dropped columns require a manual migration; do not drop columns as part of a pilot deploy.

### 7.4 — First-time pilot setup (additional steps)

```bash
# Create the pristine demo dealer (if no dealer exists in the target DB)
npm run dealer:create:pristine

# Verify the end-to-end publish pipeline
npm run publish:prepare -- <dealer-id> --dry-run
npm run publish:prepare -- <dealer-id>
npm run sync:queue -- <dealer-id>
npm run sync:scheduler -- <dealer-id> --dry-run
```

---

## Phase 8 — Exit Criteria for First Controlled Dealer Pilot

The pilot is ready when all of the following are true. Each maps to a phase above.

### Auth and access

- [x] Operator cannot authenticate with a plain `x-operator-id` header in production — `requireOperator` rejects all non-cookie auth when `NODE_ENV=production` (Phase 2 B3)
- [x] `DEV_OPERATOR_ID` env var is absent from the production environment — `validateEnv()` rejects it (Phase 1)
- [x] Operator can log in with email + password and receive a session cookie — `POST /api/auth/login` (Phase 2 B2)
- [x] Operator is scoped to specific dealership(s) via DB — `OperatorDealerAccess` rows enforce scope in production; SUPER_ADMIN has global access (Phase 2 B3)

### Safety gates

- [ ] Server refuses to start with missing required env vars (Phase 1)
- [ ] `/dev/demo-feed` is not registered in production (Phase 1)
- [ ] All `SubmissionAttempt` rows are `MOCK` — no live API calls are possible (Phase 3)
- [ ] `DISPATCH_ENVIRONMENT=PRODUCTION` is explicitly absent from production env (Phase 3)
- [ ] Changing `DISPATCH_ENVIRONMENT` to an invalid value fails startup (Phase 1)

### Data boundaries

- [ ] `npm run marketplace:boundary:check` passes (Phase 6)
- [x] Route contract test covers 401 for all operator routes — exhaustive HTTP-level test in `dataSafetyBoundary.test.ts` (Phase 6)
- [x] VIN does not appear in any marketplace API response or feed artifact — verified in `marketplaceContract.test.ts` + `dataSafetyBoundary.test.ts` (Phase 6)
- [x] Rate limits configured via env vars, enforced and tested — `PUBLIC_WRITE_RATE_LIMIT`, `PUBLIC_WRITE_RATE_WINDOW_MS`; in-memory, single-instance limitation documented (Phase 6)

### Operations

- [x] Sync scheduler deployable via PM2 cron or OS cron — `ecosystem.config.js` + cron example in deployment-checklist (Phase 5)
- [x] Ingress poll deployable via PM2 cron or OS cron — same config (Phase 5)
- [x] Performance compute deployable via PM2 cron or OS cron — same config (Phase 5)
- [x] All three jobs: structured start line, `prisma.$disconnect()` on all exit paths, exit 0 clean / exit 1 fatal (Phase 5)

### Deployment

- [ ] Deployment sequence from Phase 7.2 executes without error on the target server
- [ ] `npm run smoke:test` passes against the live DB
- [ ] `npm run validate:pristine:db` passes against the live DB
- [ ] `POST .../publish/prepare --dry-run` returns a valid response for the pilot dealer
- [ ] `/health` returns `{ ok: true }` after deploy

### Notifications

- [x] SMTP env vars validated at startup — `validateEnv()` requires all five in production; 11 test cases cover it (Phase 4)
- [ ] A test notification email is sent and received — requires wiring nodemailer into `smtpSend()` (Phase 4, remaining step)
- [x] Email failure non-blocking — `notifyLeadCaptured` catches all transport errors; `DealerNotification.deliveryStatus` set to SENT or FAILED; 8 contract tests green (Phase 4)

---

## What This Plan Does Not Cover

These are explicitly deferred and must not be implemented as part of this hardening pass:

- **Live platform dispatch** — any real HTTP call to Google, Meta, eBay, etc. Remains MOCK.
- **Dealer self-service portal** — dealers do not log in to `apps/web`; that is operator-only for pilot.
- **Marketplace dealer inbox** (`apps/marketplace/dealer`) — auth for that surface is deferred.
- **Multi-instance rate limiting** — single-instance pilot; Redis or DB-backed buckets deferred.
- **Credential encryption at rest** — `PlatformCredentialRef` plaintext is acceptable for MOCK environment; required before SANDBOX.
- **Background job queue** (BullMQ, etc.) — CLI jobs suffice for pilot scale.
- **CRM / lead workflow** — outside scope entirely; see handoff.md product boundaries section.

---

## Implementation Order

| Priority | Phase | Blocking? | Effort estimate |
|----------|-------|-----------|-----------------|
| 1 | Phase 1 — Env validation | Yes — must ship before any real server | Small (1–2 days) |
| 2 | Phase 3 — Dispatch gates | Yes — safety invariant | Small (1 day) |
| 3 | Phase 6 — Data safety verification | Yes — correctness check | Small (1 day testing) |
| 4 | Phase 5 — Scheduler cron setup | Yes — operational | Small (config only) |
| 5 | Phase 4 — Email adapter | Yes — pilot comms | Medium (2–3 days) |
| 6 | Phase 2 — Operator auth | Yes — pilot must have real auth | Large (1–2 weeks) |
| 7 | Phase 7 — Deployment checklist | Yes — final gate | None (doc only) |

**Start with Phase 1.** It is the cheapest safety win and makes every subsequent phase easier to validate.
