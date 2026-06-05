---
title: DMS Source of Truth
summary: How dealer management system data relates to inventory in this console.
keywords: DMS, source of truth, export, conflict, overwrite
updated: 2026-06-05
---

Dealers run inventory in a DMS (Dealertrack, Reynolds, Tekion, etc.), on the website, and in syndication tools. This console holds the copy used for outbound feeds configured here.

## After CSV import or edit here

This system’s row wins for syndication. A DMS price of $27,400 and a committed import price of $26,900 sends $26,900 to platforms until the next change.

## DMS still authoritative for

Floor planning, accounting, deal jackets, and in-store processes. Staff should align status (sold, hold, wholesale) between DMS and here the same business day.

## Common drift

| Drift | Risk |
| --- | --- |
| Sold in DMS, available here | Unit stays advertised |
| Price change in DMS only | Marketplace shows stale price |
| New unit not exported | Missing from feeds entirely |

## Practice

Schedule a regular DMS export to CSV (or future API feed) per rooftop. Manual edits here are appropriate for photo order, syndication-specific fields, or correcting decode gaps the DMS does not store.

See [CSV import](doc:inventory/csv-import) and [Price mismatch](doc:troubleshooting/price-mismatch).
