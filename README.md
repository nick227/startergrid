# Auto Dealer Sales Portal

A backend pipeline and operator platform that onboards auto dealers onto 18 ad and marketplace platforms. The portal handles validation, feed generation, artifact storage, and proof export via CLI and the Operator Console web UI.

## Overview

The Auto Dealer Sales Portal completes the operator lifecycle loop: inventory can be ingested from the portal, authoritative snapshots run as safe dry-runs, missing vehicles can be reviewed and explicitly marked removed, lifecycle history records the source, and benchmarks refresh from reliable sold/removed exposure windows. 

It also includes **Performance Intelligence**: cached movement benchmarks embedded in Inventory and Sync so operators see whether vehicles are moving faster or slower than comparable stock and which platforms show observed activity.

## Key Architecture Designs

The system is built on a modern TypeScript stack: **TypeScript (ESM) · Prisma 6 · MySQL · Node 22 · node:test**. 

The architecture is split into three main areas:

### 1. Sync Engine (`src/`)
The core backend pipeline and source of truth. It manages:
- 18-platform readiness validation
- Feed artifact generation and checksums
- Vehicle update propagation and platform application lifecycles
- Fastify HTTP API for integrations

### 2. Operator Console (`apps/web/`)
The **operator-web** portal is the primary interface for managing dealers, built on top of the OpenAPI SDK. Key features include:
- Sync dashboard with readiness hero and platform list
- Inventory management with CSV/JSON import, days/signal columns, and lifecycle filters
- Platform account management and benchmark freshness states
- Knowledge base catalog and insights summary

### 3. Consumer Marketplace (`apps/marketplace/`)
The internal **marketplace** application serves as a multi-dealer consumer UI and ingest API. It acts as both a primary sync target and a main test harness for the platform, ensuring consumer-facing listing APIs and workflows operate flawlessly.

## The 18 Supported Platforms

- **Owned (1):** Dealer Storefront
- **Feedable (12):** Google Vehicle Ads, Meta, TikTok, Microsoft, Pinterest, Reddit, eBay Motors, X, Snapchat, LinkedIn, Nextdoor, Apple Business Connect
- **Assisted (3):** Cars.com, CarGurus, Autotrader/Cox
- **Partner-dependent (2):** TrueCar, ADF/XML Lead Routing

---

## Quick Start

```bash
npm install

# Copy and edit .env (MySQL credentials)
cp .env.example .env

# Apply migrations, then seed platform profiles + demo dealers
npm run db:migrate
npm run db:seed

# Full pipeline reset — use this to verify everything works
npm run demo:reset
```

After `demo:reset`:
- 18 platforms evaluated, all GREEN
- 18 feed artifacts written to `./exports/`
- Proof folder manifest built
- poc:green, poc:risk, poc:portal all pass

---

## Key Commands

```bash
# Run the pristine dealer through the full pipeline
npm run dealer:create:pristine

# Onboard a dealer from a JSON file
npm run dealer:create -- --dealer-file ./dealer.json

# Show DB status grid for a dealer
npm run dealer:status -- <dealershipId>

# Export proof folder ZIP
npm run dealer:proof -- <dealershipId>

# Full reset (wipe demo data → re-seed → re-run pipeline)
npm run demo:reset

# Local Development Environment (`dev:all`)

When running the full local stack via `npm run dev:all`, multiple UIs and the backend API start concurrently:

- **API Server** (`http://localhost:3000`)
  The backend Node.js pipeline powering all interfaces.
- **Operator Console** (`http://localhost:5173`)
  The internal administration portal. **"Operator" refers to our internal team**, who use this interface to manage auto dealer accounts, onboarding, and sync readiness.
- **Marketplace UI** (`http://localhost:5174`)
  The public consumer-facing shopping application where end-users browse and search vehicles across all onboarded dealers.
- **Splash UI** (`http://localhost:5175`)
  The public-facing marketing landing page for the platform.

To start all of these simultaneously:
```bash
npm run dev:all
```

Alternatively, to run just the API and Operator Console:
```bash
npm run server:start
npm run ui:dev

# Tests and typecheck
npm test
npm run typecheck
```

---

## Documentation

- `docs/handoff.md` - **Start here.** Current state, setup, architecture, what's next
- `docs/ui-status.md` - Operator Console screens, workflow, and UI implementation status
- `docs/technical-90-day-roadmap.md` - Phased build plan
- `docs/mvp-scope-and-milestones.md` - Milestones and revenue validation
- `docs/ai-sprint-roadmap.md` - Sprint spec that drove the DB-backed build
- `docs/go-to-market-playbook.md` - Sales motion and ICP
- `docs/pricing-and-unit-economics.md` - Revenue model
