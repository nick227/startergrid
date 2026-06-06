# Channel measurement — ChannelEvent, Lead, and performance cache

This document describes how engagement is stored and surfaced in **v4.3+**. It is the reference before partner metric imports (v4.4+).

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

## apps/web display rules

- Show counts with conservative labels: **observed**, **reported**, **imported**, **unavailable**.
- When all metrics share one confidence, use a compact line plus a single source note.
- When confidences differ within one platform, label each metric’s source; add a mixed-source footnote.
- No ROI, attribution, lead quality, or customer response claims.
- Insights / Sync / Inventory use the same formatters in `apps/web/src/lib/movementBenchmark.ts`.

## Demo data

`npm run demo:reset` seeds marketplace channel events on the pristine dealer so `consumer-marketplace` appears in platform performance with views, detail views, and inquiries. Re-run compute after reset if needed (`performance:compute` or Sync refresh).

## Out of scope (v4.3.x)

- Partner metric import jobs
- Dealer marketplace stats UI (`GET .../dealers/{id}/stats`)
- CRM workflow, pipeline, or customer records in `apps/web`
