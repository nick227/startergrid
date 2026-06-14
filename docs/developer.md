# Developer Guide

## Prerequisites

- Node.js 22+
- MySQL 8 (local instance or Docker)
- npm 10+ (workspaces required)

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

This installs all workspace packages (`apps/*`, `packages/*`) from the repo root.

### 2. Configure environment

```bash
cp .env.example .env
```

For local dev the defaults in `.env.example` work out of the box with the standard MySQL credentials. At minimum set:

```
DATABASE_URL="mysql://root@localhost:3306/dealer_poc"
NODE_ENV="development"
APP_BASE_URL="http://localhost:3000"
DEV_OPERATOR_ID="dev-operator"   # passwordless local login
```

### 3. Set up the database

```bash
npx prisma migrate dev       # applies all migrations + generates Prisma client
npm run db:seed              # seeds platform profiles + a demo admin account
```

Reset everything and re-seed:
```bash
npm run db:reset
```

### 4. Generate API clients

The frontend SDKs are generated from the OpenAPI specs. This runs automatically as part of `ui:dev` and `marketplace:dev`, but you can run it manually:

```bash
npm run client:generate              # operator SDK → packages/api-client/generated/
npm run client:generate:marketplace  # marketplace SDK → packages/marketplace-client/generated/
```

### 5. Start dev servers

**All services together (recommended):**
```bash
npm run dev:all
```
Starts the API server, operator portal, marketplace, splash, and corporate site concurrently.

**Individual services:**
```bash
npm run dev:server       # API only  → http://localhost:3000
npm run ui:dev           # Operator portal → http://localhost:5173
npm run marketplace:dev  # Marketplace → http://localhost:5174
```

---

## Project Scripts Reference

### Testing

```bash
npm test                     # build + all backend tests + frontend tests
npm run test:platforms       # platform readiness + feed contract tests only
npm run smoke:test           # end-to-end smoke against live local DB
npm run smoke:connectivity   # operator↔marketplace connectivity loop (C1–C12)
npm run smoke:marketplace    # marketplace API smoke
```

### Building

```bash
npm run build                # compile TypeScript backend to dist/
npm run build:all            # backend + all frontend apps
npm run verify:all           # OpenAPI lint + tests + boundary checks (pre-deploy gate)
```

### Database

```bash
npm run db:generate          # regenerate Prisma client (after schema changes)
npm run db:migrate           # create + apply a new migration (dev only)
npm run db:seed              # seed platform profiles + admin account
npm run db:reset             # wipe + re-migrate + re-seed
npm run db:baseline          # one-time baseline for prod DBs that used db:push
```

### Operator CLI Tools

These scripts require a running database. Build first with `npm run build`.

```bash
npm run dealer:create                         # create a dealership interactively
npm run dealer:create:pristine                # create the standard demo dealership
npm run dealer:status -- <dealershipId>       # print account + readiness summary
npm run dealer:proof -- <dealershipId>        # generate proof-of-delivery ZIP
npm run dealer:export -- <dealershipId>       # export full inventory ZIP
npm run publish:prepare -- <dealershipId>     # run prepare pipeline
npm run sync:scheduler                        # process sync queue (one run)
npm run ingress:poll-sources                  # poll all ingress sources
npm run performance:compute                   # recompute all performance caches
```

---

## API Contract Workflow

The backend is contract-first. The OpenAPI specs are the source of truth:

| Spec | Covers | SDK package |
|---|---|---|
| `openapi/openapi.yaml` | Operator API | `packages/api-client/` |
| `openapi/openapi-marketplace.yaml` | Marketplace API | `packages/marketplace-client/` |

**Never hand-edit the generated files** under `packages/*/generated/`. Always edit the YAML spec and regenerate.

Validate specs before committing:
```bash
npm run openapi:validate
npm run openapi:validate:marketplace
```

---

## Testing Patterns

Backend tests use `node:test` (no framework dependency). Tests live in `src/tests/*.test.ts` and compile to `dist/src/tests/*.test.js`.

Key test files:

| File | What it covers |
|---|---|
| `routeContract.test.ts` | Every operator route returns 401 with no auth |
| `dataSafetyBoundary.test.ts` | VIN exclusion, rate limits, scope isolation |
| `platformReadinessContract.test.ts` | Per-platform readiness rule validation |
| `envValidation.test.ts` | Startup env validation (bad configs exit 1) |
| `dispatchAdapter.test.ts` | MOCK/SANDBOX/PRODUCTION dispatch gate |

Frontend tests use Vitest. Run per workspace:
```bash
npm run test -w auto-dealer-operator-ui
npm run test -w auto-dealer-marketplace-ui
```

---

## Boundary Checks

Two static analysis scripts enforce the security boundary between frontend apps:

```bash
npm run marketplace:boundary:check   # ensures marketplace never imports operator internals
npm run operator:boundary:check      # ensures operator portal never leaks consumer paths
```

Run both before any PR that touches `apps/` or `packages/`. They are included in `verify:all`.

---

## TypeScript

The backend is pure ESM. Imports must use the `.js` extension (even for `.ts` source files):

```ts
import { myService } from './myService.js';
```

Typecheck all workspaces:
```bash
npm run typecheck
```

Typecheck a single workspace:
```bash
npm run typecheck -w auto-dealer-operator-ui
```
