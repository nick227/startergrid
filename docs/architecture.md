# System Architecture

## Overview

Auto Dealer Sales Portal is a multi-tenant SaaS platform that manages dealer inventory across advertising platforms and marketplaces. It is a monorepo with a single Fastify backend and multiple frontend applications, all sharing a MySQL database via Prisma.

The system has two distinct security domains: the **operator surface** (internal staff + dealer operators) and the **consumer marketplace** (public buyers). These domains have separate auth models, separate OpenAPI specs, and generated SDKs that enforce the boundary at compile time.

---

## Monorepo Layout

```
/
├── src/                        # Fastify API server + all backend logic
│   ├── scripts/                # Runnable CLI scripts (server, jobs, operator tools)
│   ├── server/                 # App bootstrap, route registration, security middleware
│   ├── services/               # Domain services (inventory, publishing, performance, auth, …)
│   └── tests/                  # Backend test suite (node:test)
├── apps/
│   ├── web/                    # Operator portal (React + Vite)
│   ├── marketplace/            # Consumer marketplace (React + Vite)
│   ├── splash/                 # Marketing splash page
│   └── corporate/              # Corporate site
├── packages/
│   ├── api-client/             # Generated TypeScript SDK for operator API
│   ├── marketplace-client/     # Generated TypeScript SDK for marketplace API
│   ├── category-schemas/       # Shared category-specific inventory schemas
│   └── design-tokens/          # Shared Tailwind design tokens
├── openapi/
│   ├── openapi.yaml            # Operator API spec (source of truth)
│   └── openapi-marketplace.yaml # Marketplace API spec (source of truth)
└── prisma/
    ├── schema.prisma           # DB schema
    └── migrations/             # Migration chain (apply via migrate deploy in prod)
```

---

## Applications

### Backend API (`src/`)

Built with **Node.js 22, Fastify 5, TypeScript (ESM), Prisma 6, MySQL**.

The server is the single source of truth for all data. Frontends never touch the DB directly — they consume generated SDK clients.

Domain services are organized by business concern under `src/services/`:

| Domain | Responsibility |
|---|---|
| `auth/` | Operator + consumer session management, password hashing (argon2id) |
| `inventory/` | Vehicle state, VIN decode/validate, media, readiness snapshots, import/ingest |
| `publishing/` | Feed artifact generation, sync queue, dispatch scheduling, platform lifecycle |
| `performance/` | Vehicle movement benchmarks, platform performance summaries |
| `platform/` | Platform registry, readiness rules, OAuth flows, catalog sync |
| `dealer/` | Dealership profiles, notifications, buyer outreach, leads |
| `admin/` | Operator accounts, dealer access grants, admin reporting |

### Operator Portal (`apps/web/`)

React + Vite SPA. Authenticated via `op_session` HttpOnly cookie. Communicates with the backend exclusively through `@auto-dealer/api-client` (generated from `openapi.yaml`).

Used by internal operators and SUPER_ADMINs to: manage dealership accounts, monitor platform sync readiness, review inventory, manage leads, and configure platform connections.

### Consumer Marketplace (`apps/marketplace/`)

React + Vite SPA. Public browsing surface. Communicates via `@dealer-marketplace/client` (generated from `openapi-marketplace.yaml`).

Consumers can browse vehicles, submit leads, register/login (`mp_session` cookie), and save favorites.

---

## Data Flow

```
Ingress
  └─ CSV import / VIN entry (portal UI)
  └─ JSON snapshot ingest (API)
  └─ Automated poll (pollSources.js, every 5 min)
        │
        ▼
Inventory reconciliation
  └─ VIN decode, vehicle state, readiness snapshot written to DB
        │
        ▼
Publishing pipeline
  └─ POST /dealers/:id/publish/prepare
  └─ Feed artifacts generated, sync queue populated
        │
        ▼
Sync dispatch (syncScheduler.js, every 5 min)
  └─ Processes READY / SCHEDULED / FAILED queue items
  └─ DISPATCH_ENVIRONMENT gate: MOCK → SANDBOX → PRODUCTION
        │
        ▼
Performance compute (computePerformance.js, every 15 min)
  └─ Reads inventory + sync events, writes VehiclePerformanceCache
```

---

## API Boundary Enforcement

Two separate OpenAPI specs produce two separate generated SDKs. This is not just a convention — compile-time boundary checks enforce it:

```bash
npm run marketplace:boundary:check   # ensures marketplace app never imports operator internals
npm run operator:boundary:check      # ensures operator app never leaks consumer data paths
```

The marketplace API never returns VINs, internal sync state, operator credentials, or billing data. Enforced at both the Prisma query layer (explicit `select` clauses) and the OpenAPI spec level.

---

## Background Jobs

Three recurring scripts run as separate processes (PM2 or OS cron). See `docs/examples/ecosystem.config.js` for PM2 config.

| Job | Script | Cadence |
|---|---|---|
| Sync scheduler | `sync:scheduler` | Every 5 min |
| Ingress poll | `ingress:poll-sources` | Every 5 min |
| Performance compute | `performance:compute` | Every 15 min |

All three: exit 0 on clean run, exit 1 on fatal error, always call `prisma.$disconnect()` before exit.

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| API framework | Fastify 5 |
| Language | TypeScript (ESM modules) |
| ORM | Prisma 6 |
| Database | MySQL 8 |
| Frontend | React, Vite, Tailwind CSS |
| Password hashing | argon2id (`@node-rs/argon2`) |
| File storage | Local disk (dev) or S3-compatible (prod, via `STORAGE_DRIVER`) |
| Email | Nodemailer (SMTP transport, dev falls back to `mock-outbox/`) |
| SMS | Twilio (optional, falls back to console.log) |
| API contracts | OpenAPI 3, codegen via `openapi-typescript-codegen` |
| Testing | `node:test` (backend), Vitest (frontend), Playwright (E2E) |
| Process manager | PM2 (self-hosted) or Railway (cloud) |
