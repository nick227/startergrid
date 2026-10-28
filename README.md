# StarterGrid — Dealership Inventory & Online Sales Platform

StarterGrid is one platform for online automotive sales. Dealerships connect their vehicle inventory, publish across search, social, and third-party marketplaces, route buyer inquiries directly to their CRM, and see which channels actually sell cars.

Instead of trying to be a bloated DMS or an all-in-one dealership CRM, StarterGrid focuses on a specific operational problem:
- **Where should dealerships list and advertise their vehicles?**
- **Which platforms are actually generating qualified leads and confirmed sales?**
- **What do channels cost relative to the inquiries and sales we can actually observe?**
- **Which types of vehicles turn fastest on which marketing channels?**

Dealers connect their inventory once. The platform standardizes the data, runs pre-flight validation against channel-specific rules, handles automated syndication across 31+ online platforms, and records inquiries from channels that send them to StarterGrid, sales linked to a channel by evidence, and channel costs the dealership enters.

---

## What the System Does

1. **Inventory & Pre-flight Validation**: Ingests vehicle data, decodes VINs, inspects photos, and checks readiness against specific channel rules so dealers fix missing data before pushing feeds.
2. **Multi-Channel Syndication**: Formats and exports compliant feeds for search engines, social networks, and major third-party vehicle marketplaces.
3. **Channel Results**: Combines dealer-entered monthly fees and ad spend with recorded inquiries and evidence-linked sales. Cost per inquiry and cost per linked sale appear only when both inputs are known; unknown values are never shown as zero.
4. **Evidence-Based Attribution**: A sold vehicle is linked to a channel only when the dealership confirms the channel or marks exactly one channel's lead as sold. Marking a vehicle sold alone attributes nothing.
5. **Provenance on every figure**: Inquiries, costs and sale details carry their `SourceConfidence` (observed by StarterGrid, reported by the channel, or entered by the dealership). Sales are linked to a channel only by a documented rule; see `docs/v5/sales-data-integrity-handoff.md`.

---

## Monorepo Architecture & Applications

```
startergrid/
├── src/                    # Fastify API, sync engine, sale attribution and channel results
├── apps/
│   ├── web/                # Operator & dealership management interface
│   ├── marketplace/        # Consumer vehicle search and shopping frontend
│   └── splash/             # Public landing page
├── packages/
│   └── category-schemas/   # Shared schemas and validation for auto & adjacent verticals
├── prisma/                 # Database schema, migrations, and seeding scripts
└── openapi/                # OpenAPI 3 specification for all REST endpoints
```

### Application Port & Path Matrix

The platform is architected with strict port and path distinctions between backend services and frontend applications:

| Application | Workspace / Dir | Dev Port | Local Dev URL | Base / Mount Path | Public Railway Production URL | Role & Authentication Domain |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Core API & Engine** | `src/` | `3000` | `http://localhost:3000` | `/api/*`<br>`/health` | [API /api](https://auto-dealer-operator-ui-production.up.railway.app/api)<br>[Health /health](https://auto-dealer-operator-ui-production.up.railway.app/health) | Fastify REST API, sync queue, sale attribution, channel results |
| **Dealership & Operator Portal** | `apps/web/` | `5173` | `http://localhost:5173/app/` | `/app/` | [Portal /app/](https://auto-dealer-operator-ui-production.up.railway.app/app/) | Dealership staff & operator workspace (`op_session` cookie) |
| **Consumer Marketplace** | `apps/marketplace/` | `5174` | `http://localhost:5174/marketplace/` | `/marketplace/` | [Marketplace /marketplace/](https://auto-dealer-operator-ui-production.up.railway.app/marketplace/) | Public vehicle search, details & buyer lead intake (`mp_session` cookie) |
| **Public Splash Landing** | `apps/splash/` | `5175` | `http://localhost:5175/` | `/` | [Splash /](https://auto-dealer-operator-ui-production.up.railway.app/) | Marketing landing page & new dealership intake |

> **Live Railway Environment**:
> - **Production Host**: `https://auto-dealer-operator-ui-production.up.railway.app`
> - **Topology**: Consolidated single-service deployment running Fastify on Node 22, serving the backend REST API, static asset directories, and all three compiled SPA bundles.
>
> **Dual Routing Architecture (Local Dev vs. Production)**:
> - **Local Development**: Frontends run on dedicated Vite dev servers (`5173`, `5174`, `5175`). Because `apps/web` (`/app/`) and `apps/marketplace` (`/marketplace/`) define explicit Vite base paths, they must be visited with their respective subpaths (e.g. `http://localhost:5173/app/`). Dev servers automatically proxy `/api`, `/uploads`, and `/demo-assets` to the Fastify backend on port `3000`.
> - **Production Deployment (Railway)**: In production, the entire monorepo is consolidated into a single Fastify Node.js service on a single port (`PORT`, default `3000`). Fastify serves the compiled static SPA bundles partitioned by path (`/app/` for `apps/web`, `/marketplace/` for `apps/marketplace`, and `/` root fallback for `apps/splash`), routing all `/api/*` requests to the REST API.

### 1. Core API & Sync Engine (`src/`)
Built with **Node 22**, **Fastify**, and **Prisma ORM** (MySQL).
- **Port, Path & Live URLs**: Runs on port `3000` (configurable via `PORT`). Local dev at `http://localhost:3000`. Public Railway endpoints: [`https://auto-dealer-operator-ui-production.up.railway.app/api`](https://auto-dealer-operator-ui-production.up.railway.app/api) and [`https://auto-dealer-operator-ui-production.up.railway.app/health`](https://auto-dealer-operator-ui-production.up.railway.app/health). Uploaded photos are served at `/uploads/*`, and seeded vehicle media at `/demo-assets/*`.
- **REST Endpoints**: Comprehensive API secured by Role-Based Access Control (RBAC) separating internal staff, dealership managers, and consumer operations.
- **Syndication Engine**: Pre-flight validation, batch export generators, and sync history for 31+ external platforms.
- **Channel Results** (`channelRoiService`): Per channel and month — recorded inquiries, evidence-linked sales and dealer-entered cost, with cost-per figures only when both inputs exist.
- **Sale Attribution** (`saleAttribution`): Links a sale to a channel only when the dealership confirms the channel or marks exactly one channel's lead as sold; otherwise the sale stays unattributed. Sale price and date are recorded only when entered.
- **OpenAPI Alignment**: Enforces bidirectional contract consistency between Fastify route handlers, `openapi.yaml`, and route contract tests.

### 2. Dealership & Operator Web App (`apps/web/`)
Built with **React**, **Vite**, and **Tailwind CSS**. A single responsive application that adapts based on user permissions:
- **Port, Path & Live URL**: Local dev on port `5173` at `http://localhost:5173/app/` (`base: '/app/'`). Public Railway URL: [`https://auto-dealer-operator-ui-production.up.railway.app/app/`](https://auto-dealer-operator-ui-production.up.railway.app/app/).
- **Channel Results**: On the Channels page, a monthly table of recorded inquiries, linked sales and entered costs per channel, plus the month's sold vehicles with a form to record actual sale date, price and channel.
- **Inventory Workspace**: Full lot inventory management with photo gallery, VIN decoding, completeness checks, and a 1-click workflow to mark vehicles sold.
- **Syndication Sentry**: Real-time status of catalog syncs, pending approval queues, and error remediation guidance.
- **Internal Operator Workspace**: Multi-dealership oversight, credential management, and operational audit logs for support staff.

### 3. Consumer Marketplace (`apps/marketplace/`)
Built with **React**, **Vite**, and **Tailwind CSS**.
- **Port, Path & Live URL**: Local dev on port `5174` at `http://localhost:5174/marketplace/` (`base: '/marketplace/'`). Public Railway URL: [`https://auto-dealer-operator-ui-production.up.railway.app/marketplace/`](https://auto-dealer-operator-ui-production.up.railway.app/marketplace/).
- Aggregates active, eligible inventory across connected dealerships.
- Search and filtering by make, model, year, body style, price, and mileage.
- Clean vehicle detail pages with photo carousels, full specs, and buyer inquiry forms that route leads directly back into the dealer's dashboard.

### 4. Splash Page (`apps/splash/`)
Built with **React**, **Vite**, and **TypeScript**.
- **Port, Path & Live URL**: Local dev port `5175` at `http://localhost:5175/` (`base: '/'`). Public Railway URL: [`https://auto-dealer-operator-ui-production.up.railway.app/`](https://auto-dealer-operator-ui-production.up.railway.app/).
- Lightweight landing page explaining the StarterGrid service to prospective dealerships, with an intake form for new dealer onboarding.

### 5. Category Schemas (`packages/category-schemas/`)
- Shared TypeScript validation rules and metadata used by both the backend API and frontend apps to ensure consistent payload handling across automotive and adjacent specialty categories (e.g. trailers, boats).

---

## Supported Channels (31 Platforms)

Platforms are classified by how inventory is distributed:

| Classification | Count | Channels |
| :--- | :--- | :--- |
| **Owned Channels** | 2 | Dealer Storefront web feeds, Consumer Marketplace |
| **Search & Local** | 5 | Google Vehicle Ads, Microsoft Advertising Auto Ads, Google Business Profile, Apple Business Connect, Nextdoor Ads |
| **Social & Discovery** | 8 | Meta Automotive Inventory Ads, TikTok Automotive Ads, TikTok Shop, Pinterest Shopping, Reddit Dynamic Ads, Snapchat Dynamic Ads, X Dynamic Ads, LinkedIn Lead Gen |
| **Auto Marketplaces** | 7 | CarGurus, AutoTrader / Cox Automotive, Cars.com, eBay Motors, TrueCar Dealer Network, CARFAX for Dealers, Facebook Marketplace |
| **Specialty & Powersports** | 7 | RV Trader, Cycle Trader, ATV Trader, Trailer Trader, Boat Trader, YachtWorld, Boats.com |
| **CRM Routing** | 2 | ADF/XML Lead Routing, Assisted TrueCar integration |

---

## Database Seeding & Demo Environment

The repository includes a comprehensive seeding pipeline designed to recreate a fully populated development environment in seconds.

### What Gets Seeded

When running `npm run db:seed`, the system automatically provisions:
1. **Platform Profiles**: All 73 platform definitions and schema versions across automotive and specialty categories.
2. **Dealership Scenarios**:
   - **Pristine Dealer**: A clean reference dealer with fully verified inventory and published sync events.
   - **Austin Auto Group (`dealer_austin_auto`)**: A realistic mid-size dealership with active channels, queued vehicles, and full commercial data.
   - **Messy Motors (`dealer_messy_motors`)**: A dealer with edge cases (drafts, missing photos, rejected feeds) for testing validation and error handling.
   - **Premium Imports (`dealer_premium_imports`)**: High-end inventory requiring manager approvals before publishing.
   - **Specialty Dealers**: Trailers and boats dealerships for testing category extensibility.
3. **Commercial & Performance Demo Data** (`seedPerformanceBenchmarkDemo`):
   - Historical sold vehicles and sync events so movement benchmarks have comparables. No sale prices, costs or channel attributions are seeded.
4. **Default User Accounts**:
   - **Internal Operator** (Dealer & Operator Portal at `http://localhost:5173/app/` or [Railway Portal](https://auto-dealer-operator-ui-production.up.railway.app/app/)): `a@a.com` / `dev-change-me`
   - **Super Admin** (Dealer & Operator Portal at `http://localhost:5173/app/` or [Railway Portal](https://auto-dealer-operator-ui-production.up.railway.app/app/)): `admin@example.local` / `dev-change-me`
   - **Marketplace Consumer** (Marketplace at `http://localhost:5174/marketplace/` or [Railway Marketplace](https://auto-dealer-operator-ui-production.up.railway.app/marketplace/)): `buyer@example.local` / `dev-change-me`

### Resetting the Demo World

To wipe the database, apply pending migrations, seed all profiles and dealerships, and generate proof syndication artifacts:

```bash
npm run demo:reset
```

---

## Quick Start (Local Development)

### Prerequisites
- **Node.js** v22+
- **MySQL** 8.0+ running locally (e.g. port 3306)

### 1. Install & Configure
```bash
npm install

# Copy environment variables and configure your local MySQL connection string
cp .env.example .env
```

### 2. Initialize Database & Seed
```bash
npm run db:migrate
npm run db:seed
```

### 3. Start the Development Stack
To run the API server and all frontends concurrently:
```bash
npm run dev:all
```

Or run individual components by their specific port and path:
```bash
# Start API server only (port 3000 -> http://localhost:3000/api)
npm run server:start

# Start Operator / Dealer Web App only (port 5173 -> http://localhost:5173/app/)
npm run ui:dev

# Start Consumer Marketplace only (port 5174 -> http://localhost:5174/marketplace/)
npm run marketplace:dev

# Start Splash landing page only (port 5175 -> http://localhost:5175/)
npm run splash:dev
```

---

## Testing & Code Quality

The repository enforces strict typing and contract validation:

```bash
# Run all unit, integration, and UI tests
npm test

# Run TypeScript typechecks across backend and apps
npm run typecheck

# Validate OpenAPI schema against route definitions
npm run openapi:validate
```
