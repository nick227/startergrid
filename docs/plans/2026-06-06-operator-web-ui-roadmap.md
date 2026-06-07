# Operator Web UI — Roadmap

**Created:** 2026-06-06  
**Updated:** 2026-06-06  
**Goal:** Channel ops console shell — connectivity, queue, history, reporting. Cars-first; vertical-agnostic structure.  
**Plans:** [design](./2026-06-06-operator-web-design.md) · [architecture](./2026-06-06-operator-channel-console-architecture.md) · [experience](./2026-06-06-operator-web-experience-design.md) · [UI status](../ui-status.md)

---

## Shipped (Sprints 1–4)

- Layout primitives · Platforms home · Queue · History · platform drill-downs
- Generic copy + vertical adapters (`genericVertical` default)
- Inventory + Platforms + Queue + History on **`OpsRowCard`**
- Legacy Sync / Accounts / Insights hash redirects
- Unified row action labels (`operatorCopy.channels.rowActions`)

---

## Row action contract (important)

Same four labels on asset and channel rows. **Navigation only — no asset prefilter yet.**

| Action | Now | Later |
|--------|-----|-------|
| **Details** | Local drawer on current page | Same |
| **Queue** | Global or `{platformSlug}` queue route | + prefilter by asset/ref |
| **History** | Global or `{platformSlug}` history route | + prefilter by asset/ref |
| **Inventory** | Inventory tab | Asset drawer / search prefill |

See [UI status — Row actions](../ui-status.md#row-actions-opsrowcard).

---

## Next priorities

| # | Work |
|---|------|
| 1 | **Token / emerald purge** — navy + orange tokens; remove Sync-era emerald/slate |
| 2 | **`docs/ui-status.md`** — keep in sync with shipped IA (ongoing) |
| 3 | **Auth UI + route guards** — login, session, 401 → login, scoped org picker |
| 4 | **Dealer/org-scoped category loading** — `activeVertical` per tenant |
| 5 | **Reports row-card / reporting polish** |
| 6 | **Asset-scoped Queue/History** — row actions pass context into queue/history filters |

---

## Done when

- [x] Platforms is home — channels as row cards
- [x] Queue + History work cross-platform; platform drill-downs
- [x] Every core page: situation → controls → OpsRowCard → drawer
- [x] Inventory on row-card layout; Sync/Accounts redirected
- [ ] Token purge complete; nav/copy match design system doc
- [ ] Auth pilot; asset-scoped row action deep links

---

## Reference — layout primitives

- `PageSituation` · `ControlBlock` · `OpsRowCard` · `RowDetailDrawer` · `StickyActionBar` (Queue/Inventory bulk — partial)
- Nav: **Platforms · Queue · History · Reports · Inventory · Help**
- Default route: `#/{orgId}/platforms`

---

## Reference — copy

- Shell: `apps/web/src/lib/copy/operator.ts`
- Vertical: `apps/web/src/lib/copy/vertical.ts` + `index.ts` (`activeVertical`)
- Automotive north star: car field labels on `automotiveVertical`; generic default for shell

---

## Later (not blocking)

- Queue approve/retry API wiring
- Inventory ops backlog (lifecycle, cost, aging board)
- Full Storybook / component gallery
