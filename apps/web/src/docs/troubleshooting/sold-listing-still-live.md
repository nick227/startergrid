---
title: Sold Listing Still Live
summary: Why a funded unit can still appear on a marketplace after sold status was saved.
keywords: sold, still live, lag, removal, advertised
updated: 2026-06-05
---

Marking sold here triggers a priority removal dispatch. The consumer site updates only after the marketplace processes that request.

## Checklist

| Step | Action |
| --- | --- |
| 1 | Confirm unit is **sold** or **removed** in Inventory, not merely priced at $0 |
| 2 | Confirm correct [dealer context](doc:dealerships/dealer-context) |
| 3 | Check Sync — platform still **Live** is normal during lag |
| 4 | Allow one ingest cycle for feed-based sites (see [Syndication lag](doc:industry/syndication-lag)) |

## If still live after 24 hours

Account may be **Credentials needed** — removal never reached the platform. Or the listing was created outside this feed (manual post) and will not auto-delete.

## Example

Deal funds Friday 5 PM; status updated Friday 5:15 PM; dispatch completes 5:17 PM; Saturday morning ad still visible on a site that ingests overnight batches.

See [Sold & removed](doc:inventory/sold-removed).
