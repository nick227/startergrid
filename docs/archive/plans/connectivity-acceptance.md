# Operator ↔ Marketplace Connectivity — Acceptance Baseline

**Scope:** the minimum loop that proves operator-web and the consumer marketplace
are actually connected, using only public HTTP contracts (no direct DB writes,
no service imports across the boundary).

**Automation:** `npm run smoke:connectivity` (`scripts/smoke-connectivity.mjs`).
Requires the API server (`npm run server:start`) against a seeded dev DB
(`npm run db:seed`). The script is idempotent — it restores the listing state it
found, so it can run repeatedly against the same DB.

## The loop under test

```
operator-web                        marketplace
────────────                        ───────────
seeded dealership + READY vehicle
        │  POST /api/dealers/:id/platforms/consumer-marketplace/listings
        ├──────────────────────────►  listing ACTIVE
        │                             GET /api/marketplace/vehicles/:listingId   (live)
        │                             GET /api/marketplace/sellers/:dealerId     (matching dealership)
        │                             POST /api/marketplace/events               (detail view)
        │                             POST /api/marketplace/vehicles/:id/leads   (buyer inquiry)
        │                             POST /api/marketplace/vehicles/:id/sold    (sale event)
        ◄──────────────────────────┤
GET /api/dealers/:id/leads          (lead arrived)
GET /api/dealers/:id/notifications  (sold notification arrived)
GET /api/dealers/:id/reports/observed-demand
GET /api/marketplace/dealers/:id/stats
inventory lifecycleScope=sold       (sold round-trip landed)
```

## Acceptance checkpoints

A run is **green** only if every checkpoint passes:

| # | Checkpoint | Contract |
|---|-----------|----------|
| C1 | API reachable | `GET /health` → 200 `{ok:true}` |
| C2 | Seeded dealership exists in operator-web | `GET /api/dealers` → ≥1 dealer (dev operator auth via `x-operator-id`) |
| C3 | Publishable unit exists | dealer inventory has a vehicle with `listingStatus=READY`, price > 0, active lifecycle |
| C4 | Negative baseline | before push, `GET /api/marketplace/vehicles/:vehicleId` → 404 |
| C5 | Push (operator → marketplace) | `POST …/platforms/consumer-marketplace/listings` → 201, `listing.status=ACTIVE` |
| C6 | Marketplace serves the product | `GET /api/marketplace/vehicles/:vehicleId` → 200, `dealerId` matches the operator dealership |
| C7 | Matching dealership page | `GET /api/marketplace/sellers/:dealerId` → 200, contains the listing |
| C8 | Engagement event (marketplace → operator) | `POST /api/marketplace/events` (`vehicle_detail_view`) → 202; dealer stats `vehicleDetailViews` +1 |
| C9 | Lead (marketplace → operator) | `POST …/leads` → 201 `leadId`; same lead visible in `GET /api/dealers/:id/leads` with `platformSlug=consumer-marketplace` |
| C10 | Lead in operator reporting | `GET …/reports/observed-demand` lists the vehicle with `observedLeads ≥ 1` |
| C11 | Sold round-trip | `POST /api/marketplace/vehicles/:id/sold` → 200; listing gone from marketplace (404); vehicle in operator inventory `lifecycleScope=sold`; `VEHICLE_SOLD_MARKETPLACE` notification visible at `GET /api/dealers/:id/notifications` (skippable: `--no-sold`) |
| C12 | Restore / idempotency | relist + end listing → end state equals the C4 baseline (vehicle active, not live on marketplace) |

## Known gaps (accepted for the minimum baseline)

- **Events and leads accumulate.** The smoke restores listing/lifecycle state
  but intentionally leaves the `ChannelEvent`/`Lead`/`DealerNotification` rows it
  created — they are append-only event history. Assertions therefore use deltas
  (C8) or unique IDs (C9), never absolute counts.
- **Dealer-level suspension** is not part of the eligibility gate yet
  (`DealershipProfile` has no `dealerStatus`), so there is no checkpoint for it.
