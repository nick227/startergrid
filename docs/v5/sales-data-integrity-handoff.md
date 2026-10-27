# Sales data integrity — handoff to the ROI / sales-attribution owner

Date: 2026-10-27. Owner: the agent implementing ROI and sales attribution (it holds uncommitted edits to `src/server/routes/inventory.ts` and `src/server/security.ts`, so these follow-ups are assigned to it rather than edited concurrently). Context: `channel-performance-data-inventory.md`.

The ROI and attribution work should not ship, and no further intelligence dashboards should be built, until the acceptance criteria below hold. That work will be reviewed against this list once it is committed.

## Acceptance criteria

1. Every sale follows one consistent inventory lifecycle.
2. Unknown sale price remains unknown (`null`); an asking price is never copied into a sale price.
3. Unknown sale date is not fabricated; `soldAt` comes only from an explicitly recorded sale event.
4. Channel attribution requires explicit supporting evidence; without it a sale stays unattributed.
5. Public observations are never presented as verified buyers.
6. Route classification and authorization tests cover the sold endpoint.

## Model principle — lifecycle is not attribution

A vehicle marked sold is an inventory event. It does not establish the sale price, buyer, lead source or channel responsible. Keep these as distinct facts:

- **Inventory outcome:** vehicle marked sold, with source and timestamp of the status change.
- **Sale details:** actual transaction date and sale price, only when provided.
- **Attribution:** channel association, only when an explicit matching rule supports it.
- **Evidence:** where each recorded or inferred fact originated.

This matters most for DMS integrations, which often update availability without transaction details: the lifecycle event is recorded, sale details stay empty, attribution stays absent. Avoid collapsing them into single `Vehicle` columns (`soldAt` doubling as transaction date, `salesAttributedChannel` with no evidence record).

## P0 — One lifecycle path for every sale

`POST /api/marketplace/vehicles/:listingId/sold` (`src/server/routes/marketplace.ts`) is now dealership-authorized (commit `40383d8`) but still writes `vehicle.soldAt` directly, ends the marketplace listing and creates a notification. It records no `VehicleLifecycleEvent`, no `VehicleUpdate` and no `SyncEvent`, so downstream channels are not told to remove the vehicle.

The authenticated Vehicles routes already go through `applyLifecycleByVehicleId(..., 'SOLD', ...)` in `src/server/routes/inventory.ts`; feed/DMS ingest goes through `salesStatusReconcileService` → `applyVehicleUpdate`. Expected change:
- Move the sold transition into one exported service function (or export the existing path) and call it from the marketplace route, the Vehicles routes and ingest alike.
- Keep the marketplace route's current authorization (`requireOperator` before any lookup, then `requireDealerAccess` on the vehicle's dealership) and its listing-end and notification side effects, or fold them into the shared function.
- Record `source` / `triggerKind` so analytics can tell a manual mark, a feed `availability: 'sold'` row and a marketplace action apart. A vehicle missing from a full feed snapshot stays a removal candidate, not a sale.

## P0 — Sale facts in `salesAttributionService`

From the uncommitted `src/services/attribution/salesAttributionService.ts`:
- `soldAt = input.soldAt ?? vehicle.soldAt ?? new Date()` — drop the `new Date()` fallback.
- `soldPriceCents = input.soldPriceCents ?? vehicle.soldPriceCents ?? vehicle.priceCents` — drop the `priceCents` fallback.
- The function defaults `evidenceTier` to `DEALER_REPORTED` before knowing whether any value was entered by the dealer. A value only gets a tier when there is evidence for it.
- Attribution from lead matching (a lead on the same vehicle before `soldAt`) may be shown as *attributed* with its rule stated, never as observed or dealer-reported. No lead, no attribution.
- Demo seed values (`performanceDemoSeed.ts`) must not leak into non-demo dealerships or be the only data behind an ROI screen.

## P1 — Route classification for the sold endpoint

`POST /api/marketplace/vehicles/:listingId/sold` is not in `routeClassifications` or `marketplaceRouteClassifications` in `src/server/security.ts`. Add it under a classification that the contract tests enforce as operator-authenticated (it is the only operator-authenticated route under `/api/marketplace`, so it may need its own entry), and make the route-contract/auth-boundary tests fail if it ever becomes reachable anonymously. Existing behavioral coverage: `src/tests/marketplaceSoldAuthorization.test.ts` (anonymous, invalid session, production dev header, cross-dealership → no writes; dealership operator and staff → allowed).

## P1 — Provenance for public engagement

Public marketplace events (`POST /api/marketplace/events`) and inquiries (`POST /api/marketplace/vehicles/:listingId/leads`) are rate-limited but unauthenticated, so a client can inflate them. Today they are stored as `ChannelEvent.sourceConfidence = OBSERVED_FIRST_PARTY` and `Lead.source = PLATFORM_FORM`.
- Keep them as *recorded observations*. Do not count them as verified buyers or validated interactions.
- A validated interaction needs a stated signal (for example a lead the dealer moved past `NEW`, a confirmed contact or an appointment). Store which signal validated it rather than a bare flag.
- Reuse or extend the existing `SourceConfidence` vocabulary for this. Do not add the parallel `OBSERVED | DEALER_REPORTED | ATTRIBUTED | ESTIMATED` tier set from `src/services/attribution/evidenceModel.ts` without reconciling the two into one model.
