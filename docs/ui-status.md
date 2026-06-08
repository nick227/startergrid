# UI Status — Operator Console

**Updated:** 2026-06-08  
**Audience:** Project team (engineering, design, onboarding)  
**Related:** [UI roadmap](./plans/2026-06-06-operator-web-ui-roadmap.md) · [channel console architecture](./plans/2026-06-06-operator-channel-console-architecture.md)

---

## What this app is

The **Operator Console** (`apps/web/`) is a **channel operations console** — generic shell for managing **assets × channels** (queue, history, connectivity, inventory). Cars are the v1 vertical and north-star dataset; copy and adapters are vertical-neutral.

After picking an **organization**, operators land on **Platforms** and work across:

| Nav tab | Purpose |
|---------|---------|
| **Platforms** | Which channels are connected, blocked, or need setup |
| **Queue** | Pending publish/update/remove/delist tasks |
| **History** | Read-only activity log |
| **Reports** | Reference roll-ups (movement signals, channel assists) |
| **Inventory** | Asset source records, import, validation, bulk edit |
| **Help** | Knowledge base (client education articles) |

Legacy **Sync**, **Accounts**, and **Insights** hashes redirect to Platforms / Reports.

---

## Visual identity (target)

| Element | Current / target |
|--------|------------------|
| **Chrome** | Navy header (`navy-950`), orange CTAs — shipped |
| **Surfaces** | `surface-card-operator`, silver borders |
| **Layout** | Situation → control block → **OpsRowCard** list → drawer |
| **Legacy** | Emerald/slate removed from operator UI |

---

## Routing

Hash-based SPA (`useOperatorRoute`):

| URL | Screen |
|-----|--------|
| `#/` | Organization picker |
| `#/{orgId}/platforms` | Platforms (default home) |
| `#/{orgId}/queue` | Queue (all channels); optional `?ref=` / `?assetId=` |
| `#/{orgId}/history` | History (all channels); optional `?ref=` / `?assetId=` |
| `#/{orgId}/platforms/{slug}/queue` | Platform-scoped queue; optional asset query |
| `#/{orgId}/platforms/{slug}/history` | Platform-scoped history; optional asset query |
| `#/{orgId}/inventory` | Inventory; optional `?ref=` search prefill |
| `#/{orgId}/reports` | Reports |
| `#/{orgId}/help` | Help / KB |

Redirects: `#/{id}/sync`, `/accounts` → `platforms`; `/insights` → `reports`.

---

## Row actions (OpsRowCard)

Every core list page uses **`OpsRowCard`** with the same four action labels from `operatorCopy.channels.rowActions`.

| Action | Behavior |
|--------|----------|
| **Details** | Opens **local drawer** on the current page (asset detail, channel setup, queue task, or history event). No route change. |
| **Queue** | Navigates to **global Queue** or **platform Queue** with `?ref=` / `?assetId=` hash query; search field prefilled on arrival. |
| **History** | Navigates to **global History** or **platform History** with asset query; search prefilled (matches ref, vehicle id, payload). |
| **Inventory** | Navigates to **Inventory** with `?ref=` search prefill when row has a stock/ref number. |

Platform rows: Details · Queue · History (no Inventory — channel rows are not assets).  
Inventory rows: Details · Queue · History (no Inventory action — already on inventory).

---

## Page patterns (shipped)

All core pages: **PageSituation** + **ControlBlock** (search, filters, sort, refresh) + **OpsRowCard** list + **RowDetailDrawer** on Details.

| Page | List component | Drawer |
|------|----------------|--------|
| Platforms | `PlatformChannelList` | `PlatformDetailDrawer` (+ account setup) |
| Queue | `QueueListPanel` | `QueueDetailDrawer` |
| History | `HistoryListPanel` | `HistoryEventDrawer` |
| Inventory | `InventoryAssetList` | `AssetDetailPanel` |
| Reports | `ReportAssetList` / `ReportPlatformList` | `RowDetailDrawer` (movement / platform metrics) |

Search, filter, and sort logic unchanged from table era; only presentation is row-card.

---

## Copy and verticals

- Shell strings: `apps/web/src/lib/copy/operator.ts`
- Org category: `DealershipProfile.businessCategory` → `resolveCategorySchema()` via `useDealerCategorySchema(dealerId)`
- `CategoryProvider` syncs schema → `activeCategoryCopy` (inventory labels, task actions, platform filtering)
- Hooks: `useCategorySchema()`, `useInventoryLabels()`, `useVerticalCopy()`
- Presentation modules call `inventoryLabels()` / `taskActionLabel()` — synced from active org schema

---

## Implementation status

| Area | Status |
|------|--------|
| Layout primitives (situation, control block, drawer) | Shipped |
| Platforms row cards | Shipped |
| Queue + History row cards | Shipped |
| Inventory row cards (table removed) | Shipped |
| Generic operator copy | Shipped |
| Legacy Sync / Accounts redirect | Shipped |
| Queue approve/retry actions | Not exposed (read-only queue) |
| Asset-scoped Queue/History from row actions | **Shipped** — `?ref=` / `?assetId=` hash query + search prefill |
| Token / emerald purge | **Shipped** — navy + orange semantic tokens; slate/emerald removed from operator UI |
| Auth UI + route guards | **Shipped** — login page, session cookie, 401 → sign-in, scoped org picker |
| Org-scoped category loading | **Shipped** — `CategoryProvider` + schema-driven vertical copy per org |
| Reports row-card polish | **Shipped** — OpsRowCard lists, situation/control block, signal + section filters |
| Reports catalog (10 reports) | **All 10 reports shipped** — hub + detail pages; [design](./plans/2026-06-06-operator-reports-catalog-design.md) |

---

## Next priorities

1. Copy pass on import/ingest panels (plain-language labels)
2. Queue approve / retry + sticky bulk bar
3. Inventory ops layer (financial fields, sold outcomes, aging board)

---

## Tech stack

React + TypeScript + Vite · Tailwind · hash routing · OpenAPI client · KB markdown in `apps/web/src/docs/`

Run: `npm run ui:dev` (API on port 3000).

---

## Documentation split

| Location | Purpose |
|----------|---------|
| **`docs/`** | Status, roadmaps, architecture (this file) |
| **`apps/web/src/docs/`** | In-app Knowledge base (client-facing) |

Do not put implementation status in KB articles.
