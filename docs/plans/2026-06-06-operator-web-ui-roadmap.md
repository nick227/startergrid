# Operator Web UI — Roadmap

**Created:** 2026-06-06  
**Updated:** 2026-06-08  
**Goal:** Channel ops console shell — connectivity, queue, history, reporting. Cars-first; vertical-agnostic structure.  
**Plans:** [design](./2026-06-06-operator-web-design.md) · [architecture](./2026-06-06-operator-channel-console-architecture.md) · [experience](./2026-06-06-operator-web-experience-design.md) · [UI status](../ui-status.md)

---

## Shipped (Sprints 1–4)

- Layout primitives (`PageSituation`, `ControlBlock`, `OpsRowCard`, `RowDetailDrawer`)
- **Platforms** home · **Queue** · **History** · platform drill-downs
- **Reports** hub + 10 report detail pages on row-card layout
- **Inventory** on `OpsRowCard` (table removed); `AssetDetailPanel`
- **Auth** — login, session cookie, 401 → sign-in, scoped org picker, sign-out in header
- **Token purge** — navy + orange semantic tokens; emerald/slate removed from operator UI
- **Org-scoped category** — `CategoryProvider` + schema-driven copy per tenant
- Generic copy + vertical adapters (`operator.ts`, `verticalFromSchema.ts`)
- Legacy Sync / Accounts / Insights hash redirects
- Unified row action labels (`operatorCopy.channels.rowActions`)
- Asset-scoped Queue/History deep links (`?ref=` / `?assetId=` + search prefill)

---

## Row action contract

Same four labels on asset and channel rows. See [UI status — Row actions](../ui-status.md#row-actions-opsrowcard).

| Action | Behavior |
|--------|----------|
| **Details** | Local drawer on current page (no route change) |
| **Queue** | Global or `{platformSlug}` queue route; `?ref=` / `?assetId=` prefills search |
| **History** | Global or `{platformSlug}` history route; asset query prefills search |
| **Inventory** | Inventory tab with `?ref=` search prefill |

Platform rows: Details · Queue · History (no Inventory).  
Inventory rows: Details · Queue · History (no Inventory — already on page).

---

## Next priorities

| # | Work | Notes |
|---|------|-------|
| 1 | **Copy pass (Phase 4)** | Plain labels on import/ingest panels — see [experience design](./2026-06-06-operator-web-experience-design.md) |
| 2 | **Queue approve / retry** | Read-only queue today; wire API + sticky bulk bar |
| 3 | **Inventory ops layer** | Financial fields, sold outcomes, aging board — see [design plan](./2026-06-06-operator-web-design.md) Phase G |
| 4 | **List + detail split** | Platforms has `lg:grid` split; extend persistent pane to Queue/History/Inventory |
| 5 | **`docs/ui-status.md`** | Keep in sync when shipping (ongoing) |
| 6 | **Asset naming cleanup** | `Vehicle` → `Asset` presentation rename — [checklist](./2026-06-08-layered-category-naming-rename-inventory.md) |

---

## Done when

- [x] Platforms is home — channels as row cards
- [x] Queue + History work cross-platform; platform drill-downs
- [x] Every core page: situation → controls → OpsRowCard → drawer
- [x] Inventory on row-card layout; Sync/Accounts redirected
- [x] Token purge complete; navy/orange chrome
- [x] Auth + scoped org picker
- [x] Asset-scoped row action deep links
- [x] Reports catalog (10 reports) on row-card layout
- [x] Org-scoped category copy via `CategoryProvider`
- [ ] Copy pass complete on all dealer-facing surfaces
- [ ] Queue bulk approve / retry

---

## Reference — layout primitives

- `PageSituation` · `ControlBlock` · `OpsRowCard` · `RowDetailDrawer` · `BulkActionBar` (Inventory only — queue bulk not built)
- Nav: **Platforms · Queue · History · Reports · Inventory · Help**
- Default route: `#/{orgId}/platforms`

---

## Reference — copy

- Shell: `apps/web/src/lib/copy/operator.ts`
- Category schema: `verticalFromSchema.ts` → `activeCategoryCopy.ts` via `CategoryProvider`
- Hooks: `useCategorySchema()`, `useInventoryLabels()`, `useVerticalCopy()`
- Automotive north star: car field labels on `automotive.ts`; generic default for shell

---

## Later (not blocking)

- QuickBooks export, deal packet, audit timeline, support view (P3)
- Full Storybook / component gallery
- Doc reader accent alignment with shared design system
