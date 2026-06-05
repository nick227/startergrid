---
title: Sold & Removed
summary: Status changes for funded deals and units that left the lot; dispatch priority and marketplace lag.
keywords: sold, removed, delete, availability, dispatch
updated: 2026-06-05
---

Retail units that have funded, wholesale units that have left the lot, and demo transfers should not remain advertised. Status must reflect reality before or as deals close.

## Status vs delete

| Action | Result |
| --- | --- |
| Mark sold | Unit stays in history; removal sent to platforms |
| Mark removed | Same dispatch path; use for wholesale, transfer, or error intake |
| Delete stock number | Breaks cross-reference to import batches and prior dispatches — not supported as normal practice |

## Dispatch priority

Sold and removed changes use a faster dispatch path than routine price or photo edits. The server still depends on platform processing time after send.

## Lag on marketplaces

Sync may show a platform **Live** while the listing still appears for a short period. Classified sites often purge within minutes; some OEM or aggregator feeds run on longer intervals.

Example: Unit marked sold at 4:00 PM; dispatch completes by 4:02 PM; consumer site may show the ad until the marketplace’s next ingest cycle.

## DMS alignment

If the DMS shows **S** but inventory here still shows available, syndication continues. Match status here to the DMS (or your chosen source) the same day the deal funds.

Advertising law and platform policy: [Advertising disclaimers](doc:law/advertising-disclaimers).
