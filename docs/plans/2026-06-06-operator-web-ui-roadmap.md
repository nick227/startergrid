# Operator Web UI — Roadmap

**Created:** 2026-06-06  
**Goal:** Channel ops console shell — connectivity, queue, history, reporting. Cars-first; vertical-agnostic structure.  
**Plans:** [design](./2026-06-06-operator-web-design.md) · [architecture](./2026-06-06-operator-channel-console-architecture.md) · [experience](./2026-06-06-operator-web-experience-design.md)

---

## 1. Layout primitives

Build once, reuse everywhere.

- `PageSituation` — headline + one sentence
- `ControlBlock` — search, filter, sort, refresh
- `OperationalRowCard` — lead, status, meta, action
- `RowDetailDrawer` — side pane desktop, full sheet mobile
- `StickyActionBar` — bulk actions (Queue, Inventory)
- Update `PageShell` nav: **Platforms · Queue · History · Reports · Inventory · Help**
- Remove workflow strip (Inventory → Accounts → Sync)
- Default route after dealer pick: `#/{dealerId}/platforms`

---

## 2. Core five pages

Ship in this order. Reuse existing APIs and components; change IA and presentation.

| Step | Page | Source / API |
|------|------|----------------|
| **2a** | **Platforms** | `SyncPlatformList` + account state → row cards + setup drawer |
| **2b** | **Queue** | `GET /api/dealers/:id/publish/queue` → editable task rows |
| **2c** | **History** | Sync events + channel metrics → read-only rows |
| **2d** | **Platform Queue** | Queue filtered by `{platformSlug}` |
| **2e** | **Platform History** | History filtered by `{platformSlug}` |

Deprecate tabs: Sync, Accounts, Insights (redirect or remove).

---

## 3. Supporting pages

| Page | Work |
|------|------|
| **Inventory** | Same row-card pattern; collapse import/feeds above list; drawer for blockers + preview |
| **Reports** | Replace Insights; roll-ups from History; reference-only |
| **Help** | Rename Knowledge Base in nav; keep doc reader |

---

## 4. Copy and vertical adapters

Parallel with steps 2–3.

- Shell copy: `apps/web/src/lib/copy/operator.ts` (channel, queue, connection — generic)
- Automotive copy: `apps/web/src/lib/copy/automotive.ts` (vehicle, VIN, dealer — v1 vertical)
- Plain status words on every row
- Purge emerald/slate; navy + orange tokens
- **Later:** `VerticalAdapter` interface — schema, readiness, copy, reporting formatters

---

## 5. Auth and admin (pilot)

When production pilot needs it.

- Login, logout, session guard, 401 → login
- Dealer picker scoped to `dealerAccessIds`
- Admin-only: Support View, Audit (later)

---

## 6. Later (not blocking core UI)

- Inventory ops: lifecycle, cost fields, sold outcomes, aging
- QuickBooks export, deal packet, light lead handoff
- Full token/storybook polish

---

## Done when

- [ ] Platforms is home — 18+ sites as row cards
- [ ] Queue + History work cross-platform; drill-downs per site
- [ ] Every core page: situation → controls → rows → drawer
- [ ] Inventory and Reports on new layout; old Sync/Accounts/Insights gone
- [ ] Nav and copy match experience design doc

---

## Start here

**Sprint 1 (in progress):** Layout primitives + **Platforms** page — **shipped** · Queue/History stubs — **partial**

**Sprint 2:** **Queue** + **History**.  
**Sprint 3:** Platform drill-downs + Inventory row-card migration + Reports.  
**Sprint 4:** Copy pass, token purge, auth if needed.
