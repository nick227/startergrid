# Auto Dealer Sales Portal — v4.5.0

A backend pipeline that onboards auto dealers onto 18 ad and marketplace platforms — validation, feed generation, artifact storage, and proof export — via CLI and the Operator Console web UI.

**v4.1** adds **Performance Intelligence**: cached movement benchmarks embedded in Inventory and Sync so operators see whether vehicles are moving faster or slower than comparable stock and which platforms show observed activity — without a separate analytics product.

**v4.1.1** wires benchmarks operationally: performance compute runs after import/sync reconcile (non-blocking on failure), auto-sync exposes refresh-pending/freshness, and demo seed includes sold comparables so FAST/SLOW/STALE show in the portal.

**v4.2** polishes vehicle-level operations in Inventory: expandable detail panel (movement, platform comparison, marketplace-safe preview), movement signal filters/sort, and cleaner Sync hierarchy. Insights stays reference-only.

**v4.2.1** hardens marketplace preview loading/error/empty states, operator-only ineligibility copy, composed inventory filters, responsive detail layout, and UI tests for preview isolation.

**v4.3** adds neutral `ChannelEvent` storage, marketplace event capture, and `consumer-marketplace` rows in platform performance aggregates.

**v4.3.1** polishes confidence-aware channel metric display in the operator UI, seeds demo marketplace events on `demo:reset`, and documents the measurement model in `docs/channel-measurement.md`.

**v4.4** strengthens sold/removed lifecycle handling, closes platform exposure windows on status change, ingests sales status from JSON ingress, and recomputes movement benchmarks from inventory state — not partner metric imports.

**v4.4.1** adds authoritative feed snapshot reconcile (dry-run candidates + explicit commit), lifecycle audit events, and compact platform exposure copy in Sync/Insights.

**v4.5** polishes operator workflow in Inventory: snapshot review UI, lifecycle filters and vehicle history, benchmark freshness states, and a dismissible inventory walkthrough.

**Stack:** TypeScript (ESM) · Prisma 6 · MySQL · Node 22 · node:test

**Architecture:** `src/` = sync engine (source of truth). `apps/web` = operator portal (OpenAPI SDK). `apps/marketplace` = consumer app (marketplace index APIs only — planned). See `docs/handoff.md` for the HTTP route contract.

---

## Quick Start

```bash
npm install

# Copy and edit .env (MySQL credentials)
cp .env.example .env

# Push schema to DB, seed platform profiles + pristine demo dealer
npm run db:push
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

## The 18 Platforms

Owned (1): Dealer Storefront (sync feed → internal marketplace, not per-dealer public sites)  
Feedable (12): Google Vehicle Ads, Meta, TikTok, Microsoft, Pinterest, Reddit, eBay Motors, X, Snapchat, LinkedIn, Nextdoor, Apple Business Connect  
Assisted (3): Cars.com, CarGurus, Autotrader/Cox  
Partner-dependent (2): TrueCar, ADF/XML Lead Routing

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

# API + Portal (ports 3000 / 5173)
npm run server:start
npm run ui:dev

# Tests and typecheck
npm test
npm run typecheck

# Fixture-based validation (no DB required)
npm run validate:pristine
npm run poc:green
npm run poc:risk
npm run poc:portal

# DB-mode validation
npm run validate:pristine:db

# Populate movement benchmarks for a dealer (after inventory + sync history exist)
npm run performance:compute -- <dealershipId>
```

---

## Regression Contract

These 10 commands must always exit 0:

```
npm test                         824 backend + 11 web UI tests
npm run smoke:test               6/6 system checks
npm run poc:green                18/18 GREEN
npm run poc:risk                 90/90 expectations
npm run poc:portal               18/18 → ACTIVE
npm run validate:pristine        18/18 GREEN baseline, 0 RED strict
npm run validate:pristine:db     same, from DB
npm run dealer:create:pristine   exits 0, 18 GREEN, 18 artifacts
npm run dealer:status <id>       prints status grid
npm run dealer:proof <id>        ZIP exported
npm run demo:reset               exits 0
```

---

## Documentation

| Doc | What it covers |
|---|---|
| `docs/handoff.md` | **Start here.** Current state, setup, architecture, what's next |
| `docs/ui-status.md` | Operator Console screens, workflow, and UI implementation status |
| `docs/technical-90-day-roadmap.md` | Phased build plan; weeks 1–6 marked complete |
| `docs/mvp-scope-and-milestones.md` | Milestones 1–6 complete; revenue validation shipped |
| `docs/ai-sprint-roadmap.md` | Sprint spec that drove the v4 DB-backed build |
| `docs/go-to-market-playbook.md` | Sales motion and ICP |
| `docs/pricing-and-unit-economics.md` | Revenue model |

---

## What's Working vs. What Isn't

**Working:**

*Core pipeline (CLI)*
- 18-platform readiness validation (fixture + DB modes)
- DB-backed dealer + inventory intake
- Readiness runs stored with version tracking
- Platform application lifecycle — auto-created on `dealer:create`, FEEDABLE → SUBMITTED, ASSISTED packets + MOCK submission attempts
- Feed artifacts for all 18 platforms, stored and checksummed
- Prepare & Publish pipeline (dry-run + execute), queue, scheduler, approval workflow
- Vehicle update propagation (price, photos, sold, removed) via CLI and API
- Proof folder ZIP export and full dealer data export
- Invoice computation (`dealer:invoice`) from subscription + usage records
- Full pipeline CLI (`dealer:create`, `dealer:status`, `dealer:proof`, `publish:prepare`, `demo:reset`)

*HTTP API (Fastify, port 3000)*
- Dealer list; white-label listing feed JSON (`dealer-storefront` channel artifact)
- Inventory list, CSV import preview/commit, bulk edit, JSON ingest, import batch history
- Vehicle price/photo/sold/removed updates
- Publish prepare, status, history, queue, auto-sync, platform accounts
- Platform account read/update per slug
- Ingress feed sources, source check, run history

*Portal (`apps/web/`, port 5173) — dealer + admin roles*
- Dealer picker with search
- Sync dashboard — readiness hero, platform list, sync history, movement context, manual benchmark refresh
- Inventory — CSV import, **Days / Signal** column (`12 days · Similar avg 19 · Fast`), row expand with comparable group + observed assists
- Platform accounts — list, filter, inline edit (state, account ID, rep, next action)
- Knowledge base catalog + in-app doc reader (client-facing articles)
- Insights tab — reference summary only (reads cached benchmarks; refresh is explicit)
- OpenAPI-generated API client; dev auth via `x-operator-id`

*Performance Intelligence (v4.1)*
- Cached vehicle movement signals vs similar sold stock (make/model, year ±3, price ±5%)
- Per-platform observed assists and avg move times (low confidence when sample is small)
- Five operator performance API routes + `npm run performance:compute`

**Not built yet (in priority order):**
- Internal marketplace (`apps/marketplace/`) — multi-dealer consumer UI + ingest API as a sync target and primary test harness
- Production auth — no login, sessions, roles, or identity provider (dev operator header only)
- Sandbox / production platform API calls — all submission attempts are MOCK
- Real SMTP delivery — notifications persist to DB only
- Background scheduler daemon — sync runs on-demand via CLI/API, not a persistent worker
- Dealer-facing self-service portal — UI is operator-only
- Feed file download from the browser — exports remain CLI/ZIP path
- Dealer onboarding wizard in the browser — dealer creation stays CLI-side

See `docs/handoff.md` and `docs/ui-status.md` for full gap analysis and suggested next sprint.
