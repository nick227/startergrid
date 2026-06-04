# Auto Dealer Sales Portal — v4.0.0

A backend pipeline that onboards auto dealers onto 18 ad and marketplace platforms — validation, feed generation, artifact storage, and proof export — all from the CLI.

**Stack:** TypeScript (ESM) · Prisma 6 · MySQL · Node 22 · node:test

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

Owned (1): Dealer Storefront  
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
```

---

## Regression Contract

These 10 commands must always exit 0:

```
npm test                         121 tests
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
| `docs/technical-90-day-roadmap.md` | Phased build plan; weeks 1–6 marked complete |
| `docs/mvp-scope-and-milestones.md` | Milestones 1–4 complete; Milestone 5 is next sprint |
| `docs/ai-sprint-roadmap.md` | Sprint spec that drove the v4 DB-backed build |
| `docs/go-to-market-playbook.md` | Sales motion and ICP |
| `docs/pricing-and-unit-economics.md` | Revenue model |

---

## What's Working vs. What Isn't

**Working:**
- 18-platform readiness validation (pure, no DB)
- DB-backed dealer + inventory intake
- Readiness runs stored with version tracking
- Feed artifacts generated for all 18 platforms, stored, checksummed
- Proof folder ZIP export with manifest
- Full pipeline CLI (`dealer:create`, `dealer:status`, `dealer:proof`, `demo:reset`)

**Not built yet (in priority order):**
- Platform application lifecycle (status stays NOT_STARTED until apps are created)
- HTTP API and web UI
- Lead capture via live form (service exists, no HTTP endpoint)
- Assisted channel packet submission wired into `dealer:create`
- Inventory update propagation from real DB events
- Sandbox credential validation
- Monthly invoice generation

See `docs/handoff.md` for the full gap analysis and suggested next sprint.
