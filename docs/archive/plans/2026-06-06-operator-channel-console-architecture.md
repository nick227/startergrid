# Operator Web — Channel Operations Console Architecture

**Created:** 2026-06-06  
**Status:** Direction — cars-first implementation, vertical-agnostic shell  
**Related:** [operator web design](./2026-06-06-operator-web-design.md) · [experience design](./2026-06-06-operator-web-experience-design.md) · [UI roadmap](./2026-06-06-operator-web-ui-roadmap.md)

---

## What Operator Web becomes

Not a dealer-only app.

**Operator Web is a channel operations console** — a system for managing **inventory (assets)** across many **online destinations (channels)**, tracking what was sent, what failed, what sold, and which channels performed.

Cars are the **first vertical**, not the product definition.

```
                    ┌─────────────────────────────┐
                    │   Operator Web (shell UI)   │
                    │  Platforms · Queue · History│
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
     Core platform engine    Vertical adapter      Channel registry
     (generic, reusable)      (cars, boats, …)      (Cars.com, Meta, …)
```

---

## Reusable page set

Same nav and row-card layout for every vertical. Only **labels, metadata, and adapters** change.

| Page | Generic purpose | Row represents |
|------|-----------------|----------------|
| **Platforms** | Which channels are connected, inactive, blocked, or live | One channel |
| **Queue** | Inventory actions waiting — editable, scheduled, failed | One task (post / update / remove / sold) |
| **History** | What happened to every asset across every channel | One transaction + signals |
| **Platform Queue** | Queue for one marketplace | One task on one channel |
| **Platform History** | History and performance for one marketplace | One event on one channel |
| **Inventory** | Source records for assets | One asset |
| **Reports** | Channel comparison, sell-through, aging, performance | Summary / drill link |

**UI pattern (unchanged):** situation → control block → operational row cards → drawer → sticky actions.

---

## Vertical examples

| Vertical | Inventory asset | Example channels | Key metadata (adapter-defined) |
|----------|-----------------|------------------|--------------------------------|
| **Cars** (v1) | Vehicle | Cars.com, Google, Facebook, AutoTrader | VIN, mileage, price, photos |
| Furniture | Product | Facebook, Chairish, Etsy, eBay | Dimensions, material, condition, delivery |
| Boats | Vessel | Boat Trader, YachtWorld, Facebook | Hull ID, length, engine hours, location |
| Trailers / RVs | Unit | RVTrader, Facebook, Craigslist | VIN, weight, length, sleeps, tow type |
| Homes | Property | Zillow, Realtor, MLS feeds | Address, beds, baths, sqft, price |
| Equipment | Machine | MachineryTrader, eBay, Marketplace | Hours, model, serial, condition |
| Music | Release | Spotify, Apple, Amazon, YouTube | ISRC, artwork, rights, release date |

Operator shell never hard-codes “vehicle” in component names for core pages. Vertical copy and field schemas come from the **active adapter**.

---

## Two-layer architecture

### 1. Core platform engine (reusable)

Backend + UI shell. Same for all verticals.

| Module | Responsibility |
|--------|----------------|
| **Asset registry** | Generic inventory records (id, type, status, attributes blob or typed extension) |
| **Channel registry** | External platforms / marketplaces (slug, class, connection requirements) |
| **Connection state** | Inactive · connected · blocked · paused · updating |
| **Queue engine** | Create / update / remove / sold tasks per asset × channel |
| **History ledger** | Immutable log of what was sent and outcome |
| **Performance signals** | Views, calls, leads, saves, sales — channel-reported or first-party |
| **Reporting layer** | Channel comparison, asset aging, sell-through |

Today in repo: sync engine + publish queue + channel events + performance cache ≈ engine. Cars schema is embedded — extraction is the long-term refactor.

### 2. Vertical adapters (pluggable)

One adapter per industry (or tenant config). Swaps behavior without changing shell pages.

| Adapter | Handles |
|---------|---------|
| **Schema adapter** | Asset fields, validation, display columns, drawer sections |
| **Readiness adapter** | What makes an asset publishable to a channel |
| **Marketplace adapter** | Per-channel field mapping and feed shape |
| **Copy adapter** | Plain language: “vehicle” vs “product” vs “release”; situation lines |
| **Reporting adapter** | Metrics that matter: days online, gross, royalties, inquiries |

**Rule:** Core pages call adapter interfaces for **lead line**, **meta line**, **status labels**, and **drawer sections**. They do not import car-specific types.

---

## UI shell conventions (vertical-agnostic)

| Shell element | Generic | Cars v1 (today) |
|---------------|---------|-----------------|
| Scope picker | **Account** / org | Dealer picker |
| Asset nav label | **Inventory** | Inventory |
| Channel nav label | **Platforms** | Platforms |
| Queue task verbs | Post · Update · Remove · Sold | Same |
| Connection states | Inactive · Connected · Blocked · Updating | Same |
| Row lead | `adapter.assetLead(record)` | `{year} {make} {model}` |
| Row meta | `adapter.assetMeta(record)` | Mileage · price · readiness |
| Channel row lead | Channel display name | Platform name |
| Reports | Channel + asset performance | Movement + platform ROI |

Introduce `VerticalContext` in UI when second vertical nears — until then, **code as if it exists**: centralize car strings in `copy/automotive.ts`, not scattered in page components.

---

## Code organization (target)

```
apps/web/src/
  shell/              # PageSituation, ControlBlock, OperationalRowCard, PageShell
  pages/              # PlatformsPage, QueuePage, … — vertical-neutral
  adapters/
    automotive/       # schema, copy, readiness, row formatters (cars v1)
    types.ts          # VerticalAdapter interface
  lib/
    channel/          # connection state, platform presentation (generic)
```

**Do now (cars, no big refactor):**

- Keep building Queue/History/Inventory on row-card shell
- Add `lib/copy/operator.ts` + `lib/copy/automotive.ts` split
- Name new components by **role** (`OperationalRowCard`), not domain (`VehicleRowCard`)
- Use “asset” and “channel” in new docs and APIs where “vehicle” / “platform” is not accurate

**Do later (multi-vertical):**

- Extract `VerticalAdapter` interface
- Move car field defs out of `inventoryConfig` into `adapters/automotive`
- Tenant/vertical selector on scope picker

---

## Product boundaries (unchanged)

Channel ops console — **not**:

- CRM / buyer pipeline
- F&I / lending
- Accounting ledger
- Vertical-specific ERP (full DMS, property MLS back-office, music rights admin)

Adapters may add **asset-scoped** cost, lifecycle, and sold outcome — not customer or deal workflow.

---

## Success criteria (architecture)

- [ ] All seven shell pages work without car-specific component names
- [ ] Row lead/meta on Inventory and Queue driven by formatter functions, not inline YMM
- [ ] Copy adapter can swap “listing site” / “marketplace” / “channel” per vertical
- [ ] Second vertical can ship with new adapter only — no new core pages
- [ ] Channel registry and queue/history APIs are asset-type agnostic in naming

---

## Implication for current roadmap

| Sprint | Cars work | Keep generic |
|--------|-----------|--------------|
| 1 Platforms | ✅ Car channels | Connection states, row shell |
| 2 Queue | Car publish queue | Task types: post/update/remove/sold |
| 3 Inventory | Car import/readiness | Row-card + drawer pattern |
| 4 Copy | `automotive` copy module | `operator` shell strings |
| Future | — | `VerticalAdapter` interface + second vertical pilot |

Cars remain the implementation path. The shell is the product.
