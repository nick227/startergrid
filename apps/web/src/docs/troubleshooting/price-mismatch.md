---
title: Price Mismatch
summary: When the price on a marketplace does not match Inventory in this console.
keywords: price, wrong price, stale, mismatch, internet price
updated: 2026-06-05
---

The price on a live listing reflects the last successful dispatch the platform applied — not necessarily the current DMS screen or website widget if those systems diverge.

## Causes

| Cause | What to verify |
| --- | --- |
| Edit only in DMS | Re-import or update price here |
| Dispatch not yet run | Sync badge **Updating** or recent save within debounce |
| Ingest lag | [Syndication lag](doc:industry/syndication-lag) |
| Platform fee display rules | Site shows payment estimate, not asking price |
| Wrong rooftop | [Dealer context](doc:dealerships/dealer-context) |

## This system’s price field

Bulk and row edit change the syndication asking price. Document fees and conditional rebates belong in disclaimer text per [Advertising disclaimers](doc:law/advertising-disclaimers) — not as a hidden offset in the base price field.

## Example

Internet price $31,995 here; Cars.com shows $31,995 after ingest; dealer website still $32,495 because the website CMS is not fed from this path.

See [DMS source of truth](doc:industry/dms-source-of-truth).
