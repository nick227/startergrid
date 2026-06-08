# Marketplace MVP Sprint Board

Synced from `cursor_marketplace_mvp_backlog.csv`. Update the CSV first; this board is the human view.

**Last sync:** 2026-06-08  
**MPF coverage:** 96 features in `apps/marketplace/marketplace-features.csv`

**Geo status:** Geo foundation, GEO-01 radius API, ZIP centroid lookup, buyer location UI, card distance labels, and geo empty-state recovery are shipped. **GEO-DATA** (dealer coordinate backfill + strict `geo:verify`) is the deploy gate before radius search works end-to-end. Distance sort (GEO-04) remains deferred.

See `docs/plans/geo-deploy-readiness.md` for acceptance criteria.

---

## Summary

| Status | Count |
|--------|------:|
| Done | 28+ backlog items |
| Ready | 2 |
| Partial | 2 |
| Blocked | 6 |
| Deploy gate | GEO-DATA |

---

## Done (recent)

| ID | Title |
|----|-------|
| DONE-SMOKE | Marketplace deploy smoke (`smoke:marketplace`, 11 checks) |
| FILTER-02a | Seller name filter (schema-backed) |
| FILTER-03 | Availability filter (query-side) |
| FILTER-05 | Schema-backed facets |
| FILTER-06 | Compact list view |
| FILTER-07 | Quick detail drawer |
| FILTER-08 | New arrivals rail |
| FILTER-10 | Value/payment badge guardrails |
| API-AVAIL-01 | Card + detail availabilityStatus |
| SEARCH-01–03 | Keyword search + relevance + feed input |
| SEARCH-05 | Saved search rename |
| SEARCH-06 | Alerts honest placeholder |
| GEO-00–00c | Foundation (audit, columns, backfill script, write-time geocode) |
| GEO-01 | Backend radius filtering |
| GEO-02 | distanceMiles on cards |
| GEO-03 | Buyer ZIP/radius/nationwide controls |
| GEO-03b | ZIP centroid lookup dataset |
| GEO-05 | Geo empty-state recovery |

---

## Deploy gate — Geo deploy readiness

| ID | Title | Action |
|----|-------|--------|
| GEO-DATA | Coordinate verification + backfill | `npm run geo:verify` → `geo:backfill` (needs `OPENCAGE_API_KEY`) → strict verify |

**Local blocker:** `OPENCAGE_API_KEY` not set; 0/3 dealers geocoded.

---

## Geo buyer UX polish (remaining)

| ID | Title | Status |
|----|-------|--------|
| GEO-04 | Distance sort | Blocked — no cursor pagination for distance |
| GEO-DATA | E2E radius search after backfill | Ready after API key + backfill |

---

## Search / alerts polish

| ID | Title | Status |
|----|-------|--------|
| SEARCH-04 | Autocomplete MVP | Blocked P1 |

---

## Category expansion

| Area | Status |
|------|--------|
| Multi-category enablement gate | Done (`marketplaceEnablement` + smoke) |
| Boats / trailers consumer live | Done |
| Additional placeholder categories | Disabled until `consumerEnabled` |

---

## Reports / operator (later)

Out of marketplace MVP scope: operator reports catalog, seller analytics, account inbox.

---

## Blocked

| ID | Title | Blocked by |
|----|-------|------------|
| FILTER-02b | Seller type filter | Product taxonomy + schema |
| FILTER-04 | Fulfillment mode filter | Cross-category sites browse |
| GEO-04 | Distance sort | Pagination constraint |
| SEARCH-04 | Autocomplete | P1 defer |

---

## Partial

| ID | Title | Remaining |
|----|-------|-----------|
| FILTER-09 | Featured/pinned rail | Editorial config owner |
| GEO-04 | Distance labels vs sort | Labels done; sort deferred |

---

## Recommended next tickets

1. **GEO-DATA** — backfill + strict verify in staging/production
2. **FILTER-09** — featured rail config (P1)
3. **SEARCH-04** — autocomplete (P1, when prioritized)
