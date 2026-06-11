# System Architecture Introduction: Auto Dealer Sales Portal

## 1. Overview
The **Auto Dealer Sales Portal** is a comprehensive backend pipeline and syncing engine that manages auto dealer inventory across 19 different advertising and marketplace platforms. The system's primary responsibility is to act as the source of truth for inventory data, validate platform readiness, generate feed artifacts, queue and dispatch inventory updates, and track performance.

The architecture is composed of a core backend engine and two distinct frontend applications, each serving a separate audience with strict data boundaries.

## 2. Core Architecture & Components

The system follows a monorepo structure, cleanly dividing responsibilities across the backend syncing engine and the consumer/operator frontends.

### 2.1 Backend Sync Engine (`src/`)
The sync engine is the heart of the system. Built with **Node.js (Fastify)** and **Prisma**, it manages the core database and executes the heavy lifting.
- **Source of Truth:** Owns all inventory, platform readiness, ingress logic, platform dispatch, and performance caches.
- **Core Loop:** Validates vehicles against platform requirements, generates feeds/artifacts to be consumed by external marketplaces, and queues sync events.
- **Performance Intelligence:** Computes vehicle movement speeds against benchmarks (fast/slow/stale) to give dealers insight into inventory velocity.

### 2.2 Operator Portal (`apps/web/`)
A **React (Vite)** frontend application used by dealers and administrators to manage inventory and monitor platform syncs.
- **API Interaction:** Communicates with the backend exclusively via an OpenAPI-generated SDK (`@auto-dealer/api-client`).
- **Functionality:** Provides dashboards for sync readiness, inventory imports (CSV/JSON), vehicle status updates (sold/removed/price updates), and cross-platform performance metrics.
- **Boundary Rule:** This portal does *not* function as a CRM. It is solely focused on content operations and high-level platform performance comparison.

### 2.3 Consumer Marketplace (`apps/marketplace/`)
A multi-dealer public browsing application where end consumers search for vehicles and submit inquiries.
- **API Interaction:** Consumes curated, read-only marketplace index APIs using its own isolated SDK (`@dealer-marketplace/client`).
- **Strict Isolation:** The marketplace has no access to operator internal data (e.g., sync queues, account states, billing, or operator workflow data). It only queries eligible vehicles (`soldAt IS NULL`, `removedAt IS NULL`, `priceCents > 0`).

## 3. Data Flow & Source of Truth

The system relies on a unidirectional and highly observable data flow:
1. **Ingress:** Dealer inventory is pulled or pushed into the system (via JSON API polling, portal uploads, or CSVs).
2. **Reconciliation:** The sync engine handles "dry-runs", resolves removed/sold statuses, and updates the core database (`src/services/inventory`).
3. **Readiness Validation:** Vehicles are validated against the specific requirements of up to 19 different platforms (`src/validators`).
4. **Publishing:** Feed artifacts are generated and pushed out to platforms (Google, Meta, Cars.com, etc.).
5. **Performance Measurement:** Real-time events from the Consumer Marketplace and synced inventory lifecycle changes are fed back into the `Performance Intelligence` cache to recalculate movement benchmarks.

## 4. Key Domains

The backend is modularized by business domain rather than technical file types (`src/services/`):

- **`inventory/`**: Owns vehicle state, media validation, readiness snapshots, and lifecycle updates.
- **`publishing/`**: Handles the entire outbound pipeline: artifact generation, queuing, dispatch scheduling, and platform application lifecycles.
- **`performance/`**: Aggregates movement benchmarks and channel performance without touching the database directly during pure math computations.
- **`platform/`**: Manages the registry of 19 supported platforms, their risk matrices, and baseline readiness rules.
- **`commercial/`**: Handles dealer invoices and proof-of-delivery artifacts.

## 5. Technology Stack

- **Backend:** Node.js (v22), Fastify, TypeScript (ESM)
- **Database:** MySQL, managed via Prisma ORM (v6)
- **Frontends:** React, Vite, Tailwind CSS
- **API Contracts:** OpenAPI Specification (`openapi.yaml` and `openapi-marketplace.yaml`) with generated TypeScript SDKs
- **Testing:** `node:test` (pure logic testing) and Playwright for E2E tests.

## 6. API Boundaries and Security

To maintain a secure and loosely-coupled system:
- **Two separate OpenAPI specs** define the Operator API and the Marketplace API independently.
- **Consumer isolation:** The marketplace query services use strict Prisma `select` clauses to ensure operator data (like VINs, internal credentials, or sync events) never leaks to the public web.
- Compile-time and lint-time boundary checks (`scripts/check-marketplace-boundary.js`) ensure the frontend consumer app never inadvertently imports internal backend code.
