# Marketplace MVP Sprint Board

Synced from `cursor_marketplace_mvp_backlog.csv`. Update the CSV first; this board is the human view.

**Last sync:** 2026-06-08  
**MPF coverage:** 96 features in `apps/marketplace/marketplace-features.csv` — this backlog covers the highest-impact open P0/P1 buyer gaps.

---

## Summary

| Status | Count |
|--------|------:|
| Done | 6 backlog + 5 shipped reference |
| Partial | 3 |
| Ready | 6 |
| Blocked | 14 |
| P1-Deferred (Ready phase 4) | 2 |

---

## Done

| ID | Title | MPF |
|----|-------|-----|
| FILTER-01 | Schema-driven filter config | 015–018 |
| DONE-QUERY | ListingQuery semantic adapter | 029–030 |
| DONE-SPRINT-A | Share / recently viewed / sticky actions | 006, 056, 059, 060 |
| DONE-FUL | Fulfillment policy UI | 050 |
| DONE-AVAIL | Availability helpers (fail-closed) | 042, 072 |
| DONE-COMP | Compare hardening | 037, 061 |

---

## Partial (finish next when unblocked)

| ID | Title | Remaining | Blocked by |
|----|-------|-----------|------------|
| SEARCH-05 | Saved search edit | Rename/edit UI | — (can ship now) |
| FILTER-08 | New arrivals rail/sort | Rail + `newest-listed` sort path | — (can ship now) |
| FILTER-09 | Featured/pinned rail | Config-driven carousel | Backend config |

---

## Ready (start now — Phase 1)

No upstream blockers. **Recommended parallel tracks:**

### Track A — Geo API
| ID | Title | Owner layer |
|----|-------|-------------|
| GEO-01 | Geo query params + OpenAPI | Backend |

### Track B — Search API
| ID | Title | Owner layer |
|----|-------|-------------|
| SEARCH-01 | Keyword `q` on feed | Backend |

### Track C — Availability truth
| ID | Title | Owner layer |
|----|-------|-------------|
| API-AVAIL-01 | Honest availability on card/detail DTOs | Backend |

### Track D — Frontend (no backend)
| ID | Title | Owner layer |
|----|-------|-------------|
| FILTER-06 | Compact list view | Frontend |
| SEARCH-05 | Saved search rename (finish partial) | Frontend |

---

## Blocked

### Phase 1 → 2 (after API contracts)

| ID | Title | Blocked by |
|----|-------|------------|
| GEO-02 | Compute distanceMiles | GEO-01 |
| SEARCH-02 | Relevance sort | SEARCH-01 |
| GEO-03 | Nearby / nationwide controls | GEO-01 |
| SEARCH-03 | Feed search input + chip | SEARCH-01 |
| FILTER-02 | Seller type filter | sellerType API |
| FILTER-03 | Availability filter | API-AVAIL-01 |
| FILTER-04 | Fulfillment filter | fulfillment query param |
| FILTER-05 | Feature facets | FILTER-01 ✓ (can move to Ready after facet API design) |

### Phase 3 (after Phase 2)

| ID | Title | Blocked by |
|----|-------|------------|
| GEO-04 | Distance sort + labels | GEO-02, GEO-03 |
| GEO-05 | Geo empty-state recovery | GEO-03 |
| SEARCH-04 | Autocomplete | SEARCH-03 |
| FILTER-07 | Quick detail drawer | — (soft: FILTER-06) |

---

## Phase 4 — P1 polish (after core feed works)

| ID | Title | Status |
|----|-------|--------|
| SEARCH-06 | Search alerts honest placeholder | Ready |
| FILTER-10 | Value/payment guardrails | Ready |
| FILTER-08 | New arrivals rail (complete partial) | Partial |
| FILTER-09 | Featured/pinned rail | Partial |

---

## Recommended sprint order

```
Sprint N   Phase 1 API
  ├── GEO-01
  ├── SEARCH-01
  └── API-AVAIL-01

Sprint N+1 Phase 1 completion + Phase 2 FE/API
  ├── GEO-02 → GEO-03
  ├── SEARCH-02 → SEARCH-03
  ├── FILTER-02, FILTER-03, FILTER-04 (backend portions)
  ├── FILTER-06 (parallel)
  └── SEARCH-05 rename (parallel)

Sprint N+2 Phase 3
  ├── GEO-04, GEO-05
  ├── SEARCH-04
  ├── FILTER-05, FILTER-07
  └── FILTER-08 rail

Sprint N+3 Phase 4 P1
  ├── SEARCH-06
  ├── FILTER-09, FILTER-10
  └── FILTER-08 polish
```

---

## Explicitly out of this backlog

- MPF-008 lifestyle browse
- MPF-014 payment estimate filter (FILTER-10 guardrails only)
- MPF-028 best-value sort
- MPF-052/054/055 VDP commerce CTAs
- MPF-062–070 compare/research depth
- MPF-075+ account inbox
- MPF-076–096 seller/operator/trust (operator app scope)

---

## File path corrections (vs original backlog)

| Old reference | Current path |
|---------------|--------------|
| FilterBar | `ListingFilterBar.tsx` |
| FeedPage | `VehicleListPage.tsx` |
| SortSelect | `listingSortOptions.ts` + list page sort dropdown |
