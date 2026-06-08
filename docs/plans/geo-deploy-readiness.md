# Geo Deploy Readiness

**Status:** Geo foundation, GEO-01 radius API, ZIP centroid lookup, buyer location UI, card distance labels, and geo empty-state recovery are shipped. **Dealer coordinate backfill is the deploy gate before radius search works end-to-end in production.**

---

## Current geo wording

Geo foundation and GEO-01 backend radius filtering are complete. Geo verification (`npm run geo:verify`) is available as a read-only deploy check. Distance sort remains future work.

---

## GEO-DATA — coordinate verification and backfill gate

### Commands

```bash
npm run geo:verify
npm run geo:backfill          # requires OPENCAGE_API_KEY
npm run geo:backfill -- --dry-run
```

Strict gate (run after backfill):

```powershell
$env:GEO_VERIFY_STRICT="true"
$env:GEO_VERIFY_MIN_PERCENT="80"
npm run geo:verify
```

### Acceptance criteria

- [ ] `npm run geo:verify` reports addressable dealer profiles
- [ ] `geocoded profiles` ≥ 80% of `addressable profiles` (or org threshold)
- [ ] Strict verify exits 0 with `GEO_VERIFY_STRICT=true` and `GEO_VERIFY_MIN_PERCENT=80`
- [ ] No coordinates faked in production data (test fixtures only)

### Local blocker (2026-06-08)

| Blocker | Detail |
|---------|--------|
| `OPENCAGE_API_KEY` not set | `geo:backfill` cannot run; dealer `rooftopLat`/`rooftopLng` remain null |
| Verify output | 3 addressable profiles, 0 geocoded (0.0%), strict gate **FAIL** |

**Unblock:** Set `OPENCAGE_API_KEY` in environment, run `npm run geo:backfill`, re-run strict `geo:verify`.

---

## GEO-UX — distance labels + radius empty-state recovery

### Shipped

- Card/list distance label when `distanceMiles` is present (omitted otherwise)
- `BuyerLocationControls` on category feed (ZIP, radius, nationwide)
- `GeoNoResultsRelaxation` when nearby search returns zero results

### Not in scope

- Distance sort (GEO-04)
- Pagination changes
- Raw SQL

### Acceptance criteria

- [x] Cards show distance only when `distanceMiles` exists
- [x] Buyer ZIP/radius control mounted on feed
- [x] Radius no-results suggests expand radius or nationwide
- [ ] End-to-end radius search verified after GEO-DATA gate passes

---

## Remaining work buckets

| Bucket | Items |
|--------|-------|
| **Geo deploy readiness** | GEO-DATA backfill + strict verify in each environment |
| **Geo buyer UX polish** | GEO-04 distance sort (deferred) |
| **Search/alerts polish** | SEARCH-04 autocomplete (P1), real SEARCH-06 notifications (future) |
| **Category expansion** | Additional consumer categories beyond automotive/boats/trailers |
| **Reports/operator** | Operator reports catalog, seller analytics — out of marketplace MVP |
