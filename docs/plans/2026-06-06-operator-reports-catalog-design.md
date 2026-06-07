# Operator Reports Catalog — Design

**Created:** 2026-06-06  
**Status:** Approved  
**Audience:** Engineering, product, design  
**Related:** [UI status](../ui-status.md) · [operator web roadmap](./2026-06-06-operator-web-ui-roadmap.md)

---

## Goal

Replace the current Reports page (two flat performance lists) with a **catalog of ten named reports** split into **Inventory** and **Platform** families.

Reports are **category-agnostic** in structure — only copy/titles and optional calculation facets adapt per org `businessCategory`. Calculations use generic fields (`stockNumber`/ref, `priceCents`, `daysOnline`, `platformSlug`, readiness issues, events).

---

## Audience model (Choice C)

| Priority | Who | Job to be done |
|----------|-----|----------------|
| **Primary** | Daily operator | *What needs action today?* |
| **Secondary** | Weekly manager | Trend visibility and review |

**UI rule:** Operator-first. Action reports are pinned at the top with summary counts, clear next steps, and row actions (Details · Queue · History · Inventory). Management reports sit below — summary-first, drill-down second.

**Product rule:** Every report must answer **one concrete decision**, not decorate charts.

---

## Report catalog (ordered)

### Tier 1 — Action (operator, top of page)

| # | Report | Family | Default range | Decision it answers |
|---|--------|--------|---------------|-------------------|
| 1 | **Movement & Aging** | Inventory | **As of now** | *Which active assets are stale or slow vs similar stock — reprice, rephoto, or review today?* |
| 2 | **Readiness & Publish Blockers** | Inventory | **As of now** | *Which assets cannot reach channels yet — and what issue type should I fix first?* |
| 3 | **Publish Throughput & Reliability** | Platform | **Last 7 days** | *Which channels are failing or stalling sends — where is the pipe broken?* |
| 4 | **Observed Demand by Asset** | Inventory | **Last 7 days** | *Which assets got interest (and from where) — and which aged assets got none?* |

### Tier 2 — Management (below fold)

| # | Report | Family | Default range | Decision it answers |
|---|--------|--------|---------------|-------------------|
| 5 | **Channel Exposure & Coverage** | Platform | **As of now** | *How much of active inventory is actually live on each channel?* |
| 6 | **Observed Assist & Engagement** | Platform | **Last 30 days** | *Which channels show the strongest engagement signals per listed asset?* |
| 7 | **Sync Activity Summary** | Platform | **Last 30 days** | *What operational volume hit each channel — audit digest, not row-by-row history?* |
| 8 | **Lifecycle Flow** | Inventory | **Last 30 days** | *Did inventory grow or shrink healthily — intake vs sold vs removed in period?* |
| 9 | **Merchandising Activity** | Inventory | **Last 30 days** | *Which assets were actively worked — and which were neglected?* |
| 10 | **Channel Velocity & Outcomes** | Platform | **Last 90 days** | *For assets that sold or were removed, which channels had the best median time-to-exit?* |

---

## Default time ranges (by report class)

| Class | Range | Reports |
|-------|-------|---------|
| Snapshot / action | **As of now** | 1, 2, 5 |
| Ops activity | **Last 7 days** | 3, 4 |
| Management / performance | **Last 30 days** | 6, 7, 8, 9 |
| Velocity / outcomes (cohort) | **Last 90 days** | 10 |

Global time picker at Reports hub:

- Presets: **As of now · 7d · 30d · 90d** (+ custom later)
- Per-report default applies on first open; picker overrides for session
- Snapshot reports: picker shows **As of now** only (or dims other presets with tooltip: *Point-in-time report*)

---

## Information architecture

### Hub layout (`#/{orgId}/reports`)

```
PageSituation — Reports
TimeRangeBar (context-aware defaults)

── Action reports ──────────────────────────
[1 Movement & Aging]      summary strip + top N rows + "View full"
[2 Readiness & Blockers]  ...
[3 Publish Throughput]    ...
[4 Demand by Asset]       ...

── Management reports ────────────────────────
[5 Exposure & Coverage]   collapsed card or section
[6 Observed Assist]       ...
...
[10 Channel Velocity]     ...
```

### Detail routes (shareable)

```
#/{orgId}/reports/inventory/movement
#/{orgId}/reports/inventory/readiness
#/{orgId}/reports/inventory/demand
#/{orgId}/reports/inventory/lifecycle
#/{orgId}/reports/inventory/merchandising

#/{orgId}/reports/platform/throughput
#/{orgId}/reports/platform/exposure
#/{orgId}/reports/platform/engagement
#/{orgId}/reports/platform/sync-summary
#/{orgId}/reports/platform/velocity
```

Query: `?range=7d|30d|90d|now` (and later `from`/`to`).

Hub shows **teaser + decision line + primary metric**; full report opens on detail route with ControlBlock (search, filters, refresh) + OpsRowCard list + drawer — same pattern as Queue/Inventory.

---

## Data sources per report

| Report | Primary data | Range handling |
|--------|--------------|----------------|
| 1 Movement & Aging | `VehiclePerformanceCache`, movement signals | Snapshot (cache `computedAt`) |
| 2 Readiness & Blockers | Publish readiness (`VehicleReadinessItem`, issue codes) | Snapshot |
| 3 Publish Throughput | `PublishQueueItem`, `SyncEvent` (DISPATCH_*, SUBMISSION_SENT) | Filter by `createdAt` / `sentAt` |
| 4 Demand by Asset | `Lead`, `ChannelEvent` (asset-scoped), perf assists | Filter by event `createdAt` / `occurredAt` |
| 5 Exposure & Coverage | `PlatformPerformanceSummary.vehiclesListed`, active inventory count, account/app state | Snapshot |
| 6 Observed Assist | Platform cache + period `Lead` / `ChannelEvent` aggregation | Mixed: listed = snapshot, activity = period |
| 7 Sync Activity Summary | `SyncEvent` grouped by `kind` × `platformSlug` | Filter by `createdAt` |
| 8 Lifecycle Flow | `VehicleLifecycleEvent`, sold/removed timestamps, ingress/import runs | Filter by transition / exit dates |
| 9 Merchandising Activity | `VehicleUpdate` (PRICE/PHOTO/DETAILS), `INVENTORY_CHANGE` events | Filter by `createdAt` |
| 10 Channel Velocity | Sold/removed cohort + first `SUBMISSION_SENT` per vehicle × platform | Outcome cohort in 90d window |

**Language contract (unchanged):** observed assist / engagement — never “sold by” or causal attribution. Confidence labels gate display.

---

## UI patterns (operator-first)

Each report card / detail page includes:

1. **Decision line** — one sentence: the question this report answers (from table above)
2. **Primary metric** — the number that drives action (e.g. stale count, failed send count, zero-lead stale assets)
3. **Action strip** — top rows as OpsRowCards with row actions; link to Inventory/Queue/History with asset scope where applicable
4. **Empty / low-data state** — what to do next (refresh benchmarks, fix blockers, open Platforms)

Management reports add a **summary strip** (2–4 KPIs) before the list; avoid chart-only views unless the chart IS the decision (e.g. lifecycle waterfall counts).

---

## Build phases

### Phase 1 — Existing cache (minimal backend)

Ship detail routes + hub teasers for reports backed by performance cache and publish status:

- **1** Movement & Aging *(refactor current asset list)*
- **2** Readiness & Blockers *(from publish/prepare readiness)*
- **5** Exposure & Coverage *(refactor current platform list)*
- **6** Observed Assist & Engagement *(platform cache + existing channel metrics)*

### Phase 2 — Light event aggregation (shipped)

- **3** Publish Throughput & Reliability — `GET .../reports/publish-throughput`
- **7** Sync Activity Summary — `GET .../reports/sync-activity`
- **4** Observed Demand by Asset — `GET .../reports/observed-demand`

Query: `?range=7d|30d|90d`. Hub teasers + detail pages with live range picker shipped in operator web UI.

### Phase 3 — Heavier period / cohort reports

- **8** Lifecycle Flow
- **9** Merchandising Activity
- **10** Channel Velocity & Outcomes *(sold/removed cohort math)*
- **4** Demand by Asset *(full ChannelEvent grain)*

Do not paginate full history client-side for period reports.

---

## Category / copy

- Shell strings: `operatorCopy.reports.*` + per-report `decisionLine`, `primaryMetricLabel`
- Vertical adapter: `useInventoryLabels()` for asset singular/plural; ref label from category schema
- Calculations unchanged across categories; optional future rollups on `categoryPayload` facets

---

## Migration from current Reports

| Current | Becomes |
|---------|---------|
| Assets section + signal filters | Report **1** detail |
| Platforms section | Reports **5** + **6** detail |
| Summary strip (active/fast/stale/low) | Hub teaser for report **1** |
| Refresh benchmarks button | Stays on hub + report **1** / **6** |

Legacy route `#/{orgId}/reports` remains hub; no breaking hash change.

---

## Success criteria

- Operator can open Reports and see **action count + next step** without scrolling past management sections
- Each of the 10 reports has a documented **one-line decision** and **default range**
- Time picker behavior matches report class (snapshot vs period vs cohort)
- Phase 1 shippable without new Prisma models; period reports do not scrape unbounded history in the browser

---

## Out of scope (this design)

- Historical performance cache snapshots (trend lines from cache over time)
- PDF/export
- Cross-org roll-ups
- Predictive / ML scoring
