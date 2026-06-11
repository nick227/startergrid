# Channel measurement — ChannelEvent, Lead, and performance cache

This document describes how engagement is stored and surfaced in **v4.3+**. **v4.4** focuses on **sales status sync** and exposure-window accuracy — not partner metric imports.

## Product stance

- We do **not** ask dealers to maintain analytics.
- We **infer movement** from inventory status (listed / sold / removed) and platform exposure (sync submission events).
- We **measure** first-party marketplace activity directly (`observed_first_party`).
- We **only add** partner engagement metrics when a **direct integration** can supply them automatically.
- CSV imports, manual report uploads, and fabricated click/view parity are **out of scope** until real APIs exist.

## Three layers

| Layer | Model / table | Role |
|-------|----------------|------|
| Raw events | `ChannelEvent` | Append-only engagement facts per dealership, platform slug, and optional vehicle |
| Lead capture | `Lead` | Observed inquiry/contact rows (marketplace form, storefront, partner forms) |
| Aggregates | `PlatformPerformanceSummary` | Cached per-slug rollups for `apps/web` — move times, lead counts, **channelMetricsJson** |

Marketplace public pages **emit** events only. They do **not** display analytics.

## ChannelEvent

Neutral storage for any platform slug (`consumer-marketplace`, `cargurus-dealer`, `google-vla`, …).

**Event types**

| DB enum | Typical source |
|---------|----------------|
| `VEHICLE_IMPRESSION` | List/card impression (marketplace browse) |
| `VEHICLE_DETAIL_VIEW` | Vehicle detail page view |
| `DEALER_PAGE_VIEW` | Dealer storefront/index page view |
| `INQUIRY_SUBMITTED` | Inquiry form submitted (also written when a marketplace lead is captured) |
| `REPORTED_CLICK` | Partner-reported or imported click count |
| `REPORTED_VIEW` | Partner-reported view/impression count |
| `REPORTED_CONTACT` | Partner-reported contact count |

**Source confidence** (required on every row)

| Value | Meaning |
|-------|---------|
| `OBSERVED_FIRST_PARTY` | Measured on our surfaces (marketplace, storefront) |
| `PLATFORM_REPORTED` | Imported from a partner API or automated feed |
| `MANUAL_IMPORTED` | Operator/dealer CSV or portal paste |
| `UNAVAILABLE` | Placeholder only — never fabricate counts |

First-party marketplace capture: `POST /api/marketplace/events` → `recordMarketplaceChannelEvent` → `platformSlug: consumer-marketplace`, confidence `OBSERVED_FIRST_PARTY`.

## Lead

`Lead` rows are **observed inquiries**, not CRM customers. Each row may include `platformSlug` (e.g. `consumer-marketplace`, `cargurus-dealer`).

Relationship to channel events:

- Marketplace lead capture creates a `Lead` **and** an `INQUIRY_SUBMITTED` `ChannelEvent` on `consumer-marketplace`.
- Performance jobs count leads per slug for move-time rows (`totalLeads`, `platformAssistsJson`).
- Channel metrics and lead counts are **separate fields** — do not treat them as the same metric.

## PlatformPerformanceSummary

One row per `(dealershipId, platformSlug)` after `performance:compute` / aggregate jobs.

| Field | Content |
|-------|---------|
| `vehiclesListed`, `vehiclesSold`, `avgDaysToMove`, … | From sync submission events + sold vehicles |
| `totalLeads` | Count of `Lead` rows for that slug |
| `channelMetricsJson` | Normalized rollup from `ChannelEvent` rows (see below) |

**channelMetricsJson shape** (API: `channelMetrics` on platform performance items)

```json
{
  "views": { "count": 1240, "confidence": "observed_first_party" },
  "detailViews": { "count": 86, "confidence": "observed_first_party" },
  "inquiries": { "count": 12, "confidence": "observed_first_party" },
  "reportedClicks": { "count": 320, "confidence": "platform_reported" }
}
```

Aggregation rules (`aggregateChannelMetrics`):

- Sum quantities per metric bucket for the slug.
- Merge confidence with **highest rank wins** per bucket: observed_first_party > platform_reported > manual_imported > unavailable.
- Omit zero-count buckets entirely.
- Do **not** infer unavailable partner metrics.

**Platform row inclusion:** a slug appears when it has sync submissions **or** channel events. Leads alone do not create a platform row.

## Vehicle lifecycle (v4.4)

Internal states: **`AVAILABLE`**, **`SOLD`**, **`REMOVED`**, **`REACTIVATED`** (derived from `soldAt`, `removedAt`, `reactivatedAt`).

| Transition | Effect |
|------------|--------|
| `SOLD` | Sets `soldAt`, clears `removedAt` / `reactivatedAt`; stops days-online accumulation |
| `REMOVED` | Sets `removedAt`; closes platform exposure without a sale |
| `RELISTED` | Clears sold/removed; sets `reactivatedAt` for a new exposure window |

Ingress JSON may include optional `availability` (`available` \| `sold` \| `removed`) and `statusChangedAt`. Performance jobs recompute after lifecycle changes.

**Snapshot reconcile (v4.4.1):** set `snapshotMode: true` on JSON ingest. Missing active vehicles are returned as `snapshotRemovedCandidates` (dry-run by default). Commit via `commitSnapshotRemovals` or `POST .../ingest/snapshot/commit`. Removals are labeled *Missing from latest feed* — not sold.

**Audit trail:** `VehicleLifecycleEvent` records `AVAILABLE → SOLD`, `AVAILABLE → REMOVED`, `SOLD → REACTIVATED`, `REMOVED → REACTIVATED` with source (`manual`, `ingress_row`, `feed_snapshot`).

## apps/web display rules

- Show counts with conservative labels: **observed**, **reported**, **imported**, **unavailable**.
- When all metrics share one confidence, use a compact line plus a single source note.
- When confidences differ within one platform, label each metric’s source; add a mixed-source footnote.
- No ROI, attribution, lead quality, or customer response claims.
- Insights / Sync / Inventory use the same formatters in `apps/web/src/lib/movementBenchmark.ts`.

## Demo data

`npm run demo:reset` seeds marketplace channel events on the pristine dealer so `consumer-marketplace` appears in platform performance with views, detail views, and inquiries. Re-run compute after reset if needed (`performance:compute` or Sync refresh).

## Out of scope (v4.3.x – v4.4)

- CSV / manual partner metric imports
- Dealer marketplace stats UI (`GET .../dealers/{id}/stats`)
- CRM workflow, pipeline, or customer records in `apps/web`

**v4.4** adds sales status sync and sold/removed reconciliation to sharpen movement benchmarks — see **`docs/handoff.md`** § v4.4.
