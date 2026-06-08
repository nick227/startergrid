# GEO-00: Coordinate Source Audit

**Date:** 2026-06-08  
**Status:** Audit complete. All code through GEO-03 is shipped. See status breakdown below.  
**Scope:** Determine the safest, most honest source of truth for seller coordinates, buyer location, and distance sorting before any geo implementation begins

### Implementation status (as of 2026-06-08)

| Layer | Status | Notes |
|---|---|---|
| GEO-00a — `rooftopLat`/`rooftopLng` columns | ✅ Code complete | Migration `20260608000000` applied |
| GEO-00b — backfill script (`npm run geo:backfill`) | ✅ Code complete | **Data gap: has not run against any env; 0/3 local dealers geocoded** |
| GEO-00c — write-time geocoding on dealer create | ✅ Code complete | `geocodeDealerIfNeeded`; no-op when `OPENCAGE_API_KEY` absent |
| GEO-01 — bounding-box radius filter in API | ✅ Code complete | Fail-closed (nationwide) when dealer or buyer coords are null |
| GEO-02 — `distanceMiles` on card DTO | ✅ Code complete | Omitted from response when either side has null coords |
| GEO-03 — buyer location UI (ZIP + radius + nationwide) | ✅ Code complete | `BuyerLocationControls`, `useBuyerLocation`, sessionStorage `mp:buyerLocation` |
| GEO-03b — ZIP centroid lookup | ✅ Code complete | 33,791 ZCTA centroids bundled; unknown ZIPs show honest pending state |
| Data: dealers geocoded in local dev | ❌ Data gap | `geo:verify` shows 0/3. Run `npm run geo:backfill` with `OPENCAGE_API_KEY` set |
| Deploy gate: `geo:verify` strict | ❌ Would fail | Strict mode disabled; would report 0.0% geocoded |
| Distance *sort* option (GEO-04) | 🔲 Not yet built | Sort option not in `listingSortOptions`; offset pagination only when added |
| Geo empty-state recovery (GEO-05) | 🔲 Not yet built | Deferred to GEO-05 |

**Distance labels on cards are code-complete but invisible** until `geo:backfill` runs and at least one dealer has `rooftopLat`/`rooftopLng` populated. This is correct fail-closed behaviour — no fake distances are shown.

---

## Existing Data Sources

### Seller / Dealership

**`DealershipProfile.rooftopAddress`** — `Json` column in MySQL via Prisma.

All fixtures and seed data confirm a consistent structure:

```json
{ "street": "1400 Mockingbird Lane", "city": "Austin", "state": "TX", "postalCode": "78701", "country": "US" }
```

Fields present in every fixture: `street`, `city`, `state`, `postalCode`, `country`. No `latitude` or `longitude`. No `zip` (the key is `postalCode`).

**What the query service currently uses:**  
`extractAddress()` in `marketplaceQueryService.ts` reads only `city` and `state`. `postalCode` and `street` are discarded.

**What the detail mapper uses:**  
A separate `extractAddress()` in `marketplaceDetailMapper.ts` reads `city`, `state`, and `zip` — but there is a **pre-existing bug**: the field in the stored JSON is `postalCode`, not `zip`. As a result, `VehicleLocation.dealerZip` is always `null` even though the data exists.

**What is exposed on card DTOs:**  
`MarketplaceVehicleCard` exposes `dealerCity` and `dealerState`. No postal code, no coordinates. `VehicleLocation` (detail) exposes `dealerZip` (currently always null due to the bug above).

### Buyer / Consumer

**`MarketplaceUser`** — `email`, `displayName`, `passwordHash`, `isActive`, `lastLoginAt`. No location fields of any kind.

**`MarketplaceSession`** — `ipAddress` (up to 45 chars, IPv6-safe) and `userAgent`. The IP address is captured and stored at login, but it is not exposed to the marketplace query layer and has city-level accuracy at best.

**Browser state:**  
No `navigator.geolocation` calls exist anywhere in `apps/marketplace/src/`. No sessionStorage or localStorage keys for buyer location exist. There is no buyer location state today.

### Database / Schema

No `latitude`, `longitude`, `lat`, `lng`, or `coordinates` column exists anywhere in `prisma/schema.prisma`. No geocoding result table exists. No spatial index exists.

### External Providers

No geocoding provider is referenced anywhere in the codebase. No API key env vars for Google Maps, Mapbox, HERE, Nominatim, OpenCage, or any geocoding service are present in `railway.toml` or any `.env` file.

---

## Missing Data

| Need | Current State | Gap |
|---|---|---|
| Seller lat/lng | Not stored | Needs DB migration + geocoding write path |
| Seller postal code on card | In JSON, not extracted | `extractAddress()` needs to return `postalCode` |
| Seller zip on detail | In JSON, read as wrong key (`zip` not `postalCode`) | Bug in `marketplaceDetailMapper.ts:92` |
| Buyer coordinates | Not stored anywhere | Needs buyer location input model |
| Buyer postal code | Not stored anywhere | Needs buyer location input model |
| Geocoding provider | Not configured | Provider decision + Railway env var needed |
| Distance on card/detail | Not computed | Downstream of lat/lng gap |
| Spatial index | None | Needed for radius query performance at scale |

---

## Recommended Seller Coordinate Model

**Decision: Write-time geocoding, stored as two nullable Float columns on `DealershipProfile`.**

Add `rooftopLat Float?` and `rooftopLng Float?` to `DealershipProfile`. Geocode when a dealer saves or updates their `rooftopAddress`. Store the result immediately. Do not geocode at query time.

**Why not query-time geocoding:** Every feed page load would require a geocoding API call per dealer in the result set. Slow, expensive, and cache-dependent. Not viable.

**Why not postal code centroid lookup:** Postal code centroids can be 5–30 miles off for rural or large zipcodes. For radius filtering this produces false negatives at boundaries. Acceptable only as a fallback display label, not for distance sort.

**Why not in-app Haversine from postalCode:** Same accuracy problem. Postal codes are not point locations.

**Write-time geocoding flow (proposed):**
1. Dealer submits/updates `rooftopAddress` in the operator portal.
2. Platform calls geocoding provider with `street + city + state + postalCode + country`.
3. Result `{ lat, lng }` is stored in `DealershipProfile.rooftopLat` and `DealershipProfile.rooftopLng`.
4. If geocoding fails (rate limit, no match, provider error), store `null`. Never block the profile save.
5. A backfill script geocodes existing dealers in batches at the time of migration.

**Minimum Prisma migration required:**
```prisma
model DealershipProfile {
  // ... existing fields
  rooftopLat  Float?
  rooftopLng  Float?
}
```

No index decision yet — add a composite index only after the radius query shape is known.

---

## Recommended Buyer Location Model

**Decision: Manual postal code entry for MVP, stored in sessionStorage. Browser geolocation as a later upgrade.**

Do not call `navigator.geolocation` in MVP. The permission prompt is intrusive for browse-mode users who have not yet decided to use location features. It also requires HTTPS and produces confusing behavior on non-browser agents.

**MVP buyer location:**
- User types their zip code in a location input (new UI component, not in this ticket).
- Stored in `sessionStorage` under key `mp:buyerLocation` as `{ postalCode: string, enteredAt: string }`.
- Never persisted to `localStorage` — clears on tab close by design. This avoids "stale location" bugs when the user moves.
- Never sent to the server for non-geo queries. Only included in feed/list requests when the user has explicitly set a location.
- Never derived from the user's `MarketplaceSession.ipAddress` — IP-to-city accuracy is insufficient for radius filtering, and surfacing IP geolocation without user knowledge is a privacy antipattern.

**Future upgrade path:**  
After MVP, offer "Use my current location" button that calls `navigator.geolocation.getCurrentPosition`. On success, store `{ lat, lng, postalCode: null, enteredAt }`. The API query uses lat/lng directly. This upgrade is additive — the postal-code path continues to work.

**Why not store buyer location in the database:**  
MVP users may not be logged in. Even authenticated users should not have their location persisted server-side without explicit consent. Sessionbased storage avoids data retention obligations and GDPR/CCPA surface area.

---

## Recommended Geocoding Timing

**Write-time (at dealer profile save), not read-time.**

Geocoding happens once per address change, not on every feed request. This means:
- Feed queries never touch the geocoding provider.
- Failed geocoding does not block the feed.
- Stale lat/lng is only a problem when a dealer moves, which is rare and can be re-geocoded on profile update.

**Provider decision is deferred.** The implementation should accept a geocoding function as a parameter (`(address) => Promise<{ lat: number; lng: number } | null>`), making the provider swappable. The first integration can be any of: Google Maps Geocoding API, Mapbox, HERE, Nominatim (free/rate-limited), or OpenCage.

**Railway env var required:**  
One new variable: `GEOCODING_API_KEY` (or provider-specific name). This must be added to Railway before any geocoding code is deployed. The application must fail gracefully (null lat/lng) when the key is absent.

---

## Distance Calculation Strategy

**Once lat/lng columns exist on `DealershipProfile`:** Use Haversine formula in a Prisma raw SQL query for radius filtering. For distance values returned in results, compute in the same raw query.

**Radius filter approach (WHERE clause):**
Use a bounding box pre-filter first (cheap, index-friendly), then Haversine inside the box (expensive but bounded):

```sql
-- Step 1: bounding box (fast, uses lat/lng range index)
WHERE rooftopLat BETWEEN :latMin AND :latMax
  AND rooftopLng BETWEEN :lngMin AND :lngMax
-- Step 2: Haversine inside the box (accurate, bounded row count)
  AND (6371 * acos(cos(radians(:buyerLat)) * cos(radians(rooftopLat))
       * cos(radians(rooftopLng) - radians(:buyerLng))
       + sin(radians(:buyerLat)) * sin(radians(rooftopLat)))) <= :radiusMiles * 1.60934
```

This pattern avoids full-table Haversine scans. MySQL does not have native `ST_Distance_Sphere` with km-to-miles conversion as a first-class index predicate, so the bounding box is the practical approach.

**Distance value on response:**  
Compute `distanceMiles` in the same raw query using Haversine. Add as an optional field on `MarketplaceVehicleCard` and `VehicleLocation`. Omit when buyer has no location set (do not default to 0 or null with a label — omit the field entirely).

---

## Distance Sort and Pagination Risk

**This is the largest technical risk in the GEO epic.**

Current cursor pagination scheme in `getMarketplaceFeed`:
- Works only for `newest` sort (createdAt desc + id desc).
- Non-default sorts (price, mileage, year, relevance) already drop cursor pagination and serve the first page only. This is documented in the code: `"Non-default sorts can't use createdAt-based cursor pagination; serve first page only."`
- The cursor encodes `{ createdAt, id }` and uses `WHERE createdAt < :cursor.createdAt OR (createdAt = :cursor.createdAt AND id < :cursor.id)`.

**Distance sort breaks this cursor:** Distance is computed at query time from buyer coordinates, which are not stored in the DB. A distance-based cursor would need to encode `{ distanceMiles, id }`, but `distanceMiles` is a derived value — not a stored column — so a cursor predicate like `WHERE distance < :cursor.distance` requires the same raw-SQL computation in the WHERE clause. This is technically possible but adds significant complexity to the pagination layer.

**Recommended approach for GEO-01 MVP:**  
Distance sort uses **offset pagination only** (skip/take), matching the behavior of other non-default sorts. No cursor for distance-sorted feeds. This is honest, safe, and consistent with existing behavior. Document this limitation explicitly in the API response.

**Distance sort as a non-feed sort:**  
The list endpoint (`/api/marketplace/vehicles`) already uses offset pagination exclusively. Distance sort is safer to introduce there first, before attempting cursor pagination.

---

## Minimal MVP Path

The smallest path to a useful geo feature, ordered by dependency:

**Phase 0 — Data fixes (no new features, no migration yet):**
1. Fix the `dealerZip` bug in `marketplaceDetailMapper.ts`: change `addr['zip']` to `addr['postalCode']`.
2. Extend `extractAddress()` in `marketplaceQueryService.ts` to also return `postalCode` for use in future distance queries.

**Phase 1 — Schema + backfill (no API or UI changes):**
3. Add `rooftopLat Float?` and `rooftopLng Float?` to `DealershipProfile` (Prisma migration).
4. Write an offline backfill script that reads all `DealershipProfile` rows missing lat/lng, calls geocoding provider, and writes results. Run once against production after Railway env var is set.

**Phase 2 — API layer (GEO-01 + GEO-02):**
5. Add `location`, `radiusMiles`, `nationwide` params to feed/list endpoints. Fail closed when lat/lng unavailable on dealer records. Do not expose buyer coordinates in the response.
6. Compute and return `distanceMiles` on card when buyer coordinates are provided. Use Haversine. Distance sort uses offset pagination only.

**Phase 3 — Frontend (GEO-03 + GEO-04 + GEO-05):**
7. Buyer location input (zip code entry). Store in `sessionStorage`. Show location pill in filter bar.
8. Distance sort option, radius selector, nearby/nationwide toggle.
9. Geo-aware no-results relaxation.

---

## Tickets to Add or Update

**Add these tickets:**

| Ticket | Title | Blocked By | Priority |
|---|---|---|---|
| GEO-00-fix-zip | Fix `dealerZip` always-null bug (read `postalCode` not `zip` in detail mapper) | — | P0 (bug) |
| GEO-00-extract-postal | Extend `extractAddress()` in query service to return `postalCode` | — | P0 |
| GEO-00a | Add `rooftopLat`/`rooftopLng` nullable columns to `DealershipProfile` | Provider decision | P0 |
| GEO-00b | Backfill script: geocode existing dealer rooftop addresses in batches | GEO-00a + provider key in Railway | P0 |
| GEO-00c | Write-time geocoding: geocode on dealer profile save/update | GEO-00a | P0 |

**Update these tickets:**

| Ticket | Change |
|---|---|
| GEO-01 | Blocked by GEO-00a (lat/lng columns must exist first) |
| GEO-02 | Blocked by GEO-00a + GEO-00b (lat/lng must be populated for distance to be meaningful) |
| GEO-03 | Blocked by GEO-01 |
| GEO-04 | Add explicit note: distance sort uses offset pagination only, no cursor |
| GEO-05 | Blocked by GEO-03 |

---

## Tickets That Must Remain Blocked

All of **GEO-01 through GEO-05** must remain blocked until:

1. **Provider decision is made** — a geocoding provider is chosen and the API key is added to Railway. This is a product/infra decision, not an engineering one.
2. **GEO-00a migration lands** — `rooftopLat` and `rooftopLng` columns must exist in the DB before any geo query can be written.
3. **GEO-00b backfill runs** — without lat/lng data for existing dealers, a radius query returns zero results for all real inventory. Shipping GEO-01 before the backfill runs would appear broken.
4. **Distance sort pagination strategy is confirmed** — the team must explicitly accept that distance sort will not support cursor pagination in MVP before GEO-04 is implemented.

**FILTER-05** is independent — it works off category schema facets only, not geo. It must not be blocked by GEO work.

**SEARCH-04, FILTER-02, FILTER-03** are independent of geo.

---

## Privacy Considerations

- **Buyer location (sessionStorage only):** Storing only in sessionStorage minimizes retention. The value clears on tab close. It is never sent to the server except as a query parameter (`lat`, `lng`, or `postalCode`) in feed requests. No user ID is attached to the location. Logs that capture query parameters must treat `lat`/`lng` as PII-adjacent.
- **IP geolocation must not be used** for implicit location inference. The `MarketplaceSession.ipAddress` field must not be read by the marketplace query layer for location purposes. A user who has not provided location consent must never see location-derived results.
- **Seller lat/lng is public.** Dealer rooftop addresses are public business addresses. Geocoded lat/lng can be included in API responses with appropriate rounding (2 decimal places ≈ 1.1 km precision is sufficient for distance display and acceptable for a business address).
- **Distance on card:** Showing distance is a feature, not a disclosure. Only show it when the buyer has actively provided location. Never infer distance silently.
