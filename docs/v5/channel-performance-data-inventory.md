# Channel Performance Intelligence — observable data inventory

Date: 2026-10-27. Scope: what StarterGrid can actually observe today for the three starting questions:

1. Which channels are generating buyer inquiries?
2. Which vehicles attract inquiries on each channel?
3. Which channels are associated with confirmed sales?

Each data point is classed as **Provider event** (received from a channel or buyer action StarterGrid hosts), **Dealer-entered** (typed, imported or confirmed by the dealership), **Derived** (computed from the above by a rule), or **Unavailable**. Demo seeds (`performanceDemoSeed.ts`, `channelDemoSeed.ts`) are excluded: they write realistic-looking rows that no production path writes.

## Summary

| Question | What is real today | Main gap |
|---|---|---|
| 1. Inquiries by channel | Leads from 3 channels: consumer marketplace, dealer storefront, LinkedIn Lead Gen Forms | Third-party marketplaces (Cars.com, AutoTrader, CarGurus, Facebook, eBay, …) send inquiries to the dealer's email/CRM, not to StarterGrid |
| 2. Vehicles by channel | Marketplace (always linked), storefront (linked when stock number resolves) | LinkedIn leads never set `vehicleId`; no third-party vehicle-level data |
| 3. Sales by channel | Sold date per vehicle (feed/DMS ingest or manual); dealer can mark a lead `SOLD` | No channel on the sale unless a dealer marks a lead SOLD; feed disappearance is ambiguous between sold and removed |

So the honest first version answers question 1 for StarterGrid-hosted and form-sync channels, question 2 for the marketplace and storefront, and question 3 only where a dealer closes the loop on a lead. Every other channel should show "not reported to StarterGrid", not zero.

## 1. Buyer inquiries (`Lead`)

| Source | Written by | Class | `platformSlug` | `vehicleId` |
|---|---|---|---|---|
| Consumer marketplace inquiry form | `marketplaceLeadService.captureMarketplaceLead` | Provider event (first-party) | `consumer-marketplace` | Always set |
| Dealer storefront contact form | `routes/storefront.ts` → `persistLead` | Provider event (first-party) | `dealer-storefront` | Set when the submitted stock number resolves |
| LinkedIn Lead Gen Forms sync | `routes/leadSync.ts` (only bridge in `LEAD_SYNC_BRIDGE_REGISTRY`) | Provider event (platform API) | `linkedin-lead-gen-forms` | Never set; vehicle only in `vehicleInterest` JSON |
| ADF/XML | `captureAdfLead` only parses ADF that StarterGrid generated itself | — | — | No inbound ADF endpoint exists |
| Manual entry | `LeadSource.MANUAL` exists in the enum | Dealer-entered | — | No production writer found |

Also observed per lead: `createdAt`, contact fields, and lead-delivery outcome (`LeadDeliveryAttempt`: sent/failed per destination), which tells us StarterGrid handed the inquiry to the dealer, not that the dealer responded.

Dealer-entered per lead: `workflowStatus` (`NEW → CONTACTED → APPOINTMENT → SOLD | LOST`), assignee and notes. This is the only place a channel and a sale are connected by a person today.

Known data-quality issues:
- LinkedIn dedupe stores the external response id in `Lead.message` (`leadSync.ts`), so a buyer's real message is overwritten and dedupe breaks if a message is ever present. A dedicated `externalId` column is needed before counting these leads.
- LinkedIn sync is pull-on-request, not scheduled, so counts are only as fresh as the last manual sync.

## 2. Engagement before the inquiry (`ChannelEvent`)

| Event | Class | Production writer |
|---|---|---|
| `VEHICLE_IMPRESSION`, `VEHICLE_DETAIL_VIEW`, `DEALER_PAGE_VIEW` | Provider event, `OBSERVED_FIRST_PARTY` | `POST /api/marketplace/events` (consumer marketplace only) |
| `INQUIRY_SUBMITTED` | Provider event, `OBSERVED_FIRST_PARTY` | Marketplace lead capture |
| `REPORTED_VIEW`, `REPORTED_CLICK`, `REPORTED_CONTACT` (`PLATFORM_REPORTED`) | Would be provider-reported | **None** (demo seed only) |
| `MANUAL_IMPORTED` | Would be dealer-entered | **None** |

Views and impressions for every external channel are therefore unavailable. The schema is ready for them; no adapter imports them.

## 3. Listing delivery and verification

These answer "is the vehicle actually advertised there", which is the denominator for questions 1 and 2.

| Data | Class | Notes |
|---|---|---|
| Vehicle eligibility (`listingStatus`, `VehicleChannelSelection`) | Dealer-entered | Intent, not delivery |
| `PublishQueueItem`, `SyncEvent` (`SUBMISSION_SENT`, `DISPATCH_FAILED`, …) | Derived from StarterGrid's own dispatch | HTTP success is `SUBMITTED`, not live |
| `DistributionTarget` evidence (`VERIFIED_LIVE` / `VERIFIED_REMOVED`) | Provider event | Per `distribution-contract.md`, only the first-party marketplace qualifies today |
| `MarketplaceListing` (external listing/offer ids, `ACTIVE`/`ENDED`/`FAILED`) | Provider event (API response) | Only for API-listing channels such as eBay |
| `PlatformCatalogSync` (`lastSyncAt`, `lastSyncCount`) | Provider event (API response) | Catalog channels (Meta etc.): count accepted, not per-vehicle live state |
| Feed channels (Cars.com, AutoTrader, CarGurus, …) | — | StarterGrid knows the feed was generated, not what the channel displays |

"Vehicles advertised on channel X" can only be stated as verified for the marketplace; elsewhere it is "submitted" or "included in feed".

## 4. Sales outcomes (`Vehicle`, `VehicleLifecycleEvent`)

| Data | Class | Notes |
|---|---|---|
| `soldAt` via ingest row `availability: 'sold'` (`salesStatusReconcileService`) | Dealer-entered (feed/DMS/CSV) | Trustworthy as "sold", carries no channel |
| Vehicle missing from a full feed snapshot | Derived | Ambiguous: sold, wholesaled or removed. Should not count as a sale |
| Manual mark-sold (`POST /api/dealers/:id/inventory/vehicles/:vehicleId/sold`) | Dealer-entered | Authenticated |
| `POST /api/marketplace/vehicles/:listingId/sold` | — | **Unauthenticated demo endpoint**, see "Open issues" |
| Lead `workflowStatus = SOLD` | Dealer-entered | The only real channel→sale link |
| Sold price, unit cost, buyer location | Unavailable today | Columns are being added in uncommitted work (below), with no ingest path yet |

Derived today in `VehiclePerformanceCache` / `PlatformPerformanceSummary`: days online, comparable-based movement signal, leads per vehicle per platform, vehicles sold per platform. "Vehicles sold per platform" counts vehicles that were *listed* there and later sold; it is exposure, not attribution, and should be labelled that way.

## 5. Unavailable, and what would unlock it

| Metric | Unlock |
|---|---|
| Inquiries from third-party marketplaces | Inbound ADF/XML email address per dealer (most US marketplaces can send ADF), or CRM read access |
| Views/clicks on external channels | Provider reporting APIs where they exist (Meta, Google, eBay), written as `PLATFORM_REPORTED` events |
| Channel of a sale | Dealer confirmation at mark-sold time, or lead-to-sale matching (lead on the same vehicle before `soldAt`) shown as *attributed*, never as observed |
| Sold price, gross, cost | DMS/feed fields or dealer entry |
| Advertising cost | Dealer-entered monthly cost per channel; provider spend APIs for ads channels later |

## Recommended first slice

1. Per channel: inquiries in period (Lead counts by `platformSlug`, first-party sources only), with "not reported to StarterGrid" for channels that have no lead path.
2. Per channel × vehicle: inquiries for leads with `vehicleId`, plus marketplace views/detail views from `ChannelEvent`.
3. Per channel: sales where a lead on that channel reached `SOLD`, labelled dealer-confirmed; separately "listed here and sold" as exposure.
4. Keep the three dimensions from the review separate on the channel page: connection health, delivery/verification, business performance.

Prerequisites: give `Lead` a real `externalId`, set `vehicleId` on synced leads when the form carries a stock number or VIN, and add an inbound ADF intake so third-party inquiries can enter at all — that single path changes question 1 from three channels to most of them.

## Open issues found during the inventory

- Fixed: `POST /api/marketplace/vehicles/:listingId/sold` (`src/server/routes/marketplace.ts`) had no authentication, so anyone holding a public listing id could mark a vehicle sold. It now requires an operator session with access to the vehicle's dealership (`src/tests/marketplaceSoldAuthorization.test.ts`). It still writes `soldAt` directly rather than through the inventory lifecycle, so it records no `VehicleLifecycleEvent`; sales analytics should not treat it as a recorded sale event.
- Audit of the other marketplace mutations: listing/category-listing routes check dealership access and item ownership; favorites are scoped to the `mp_session` user; leads, reports and events are public by design, rate-limited and append-only. Public events and leads can still be inflated by a determined client, so engagement counts from them are first-party observations, not verified buyers.
- Uncommitted work in the shared tree (another agent, 2026-10-27) adds `ChannelMonthlyCost`, `Vehicle.costCents/soldPriceCents/salesAttributedChannel/buyerPostalCode/buyerRegion`, `salesAttributionService`, `channelRoiService` and `demandInsightService`. This is ahead of the agreed sequence (inquiries → vehicles → confirmed sales before ROI). Points to reconcile before it ships:
  - `attributeSaleForVehicle` defaults sold price to the list price and `soldAt` to now when unknown; those values are estimates and must not be stored or shown as dealer-reported.
  - Its evidence tiers (`OBSERVED | DEALER_REPORTED | ATTRIBUTED | ESTIMATED`) overlap the existing `SourceConfidence` enum (`OBSERVED_FIRST_PARTY | PLATFORM_REPORTED | MANUAL_IMPORTED | UNAVAILABLE`); one vocabulary should win.
  - ROI/cost-per-sale screens need the real sale-channel link first, otherwise they divide real costs by seeded or inferred sales.
