---
title: Syndication Lag
summary: Time between dispatch from this system and visible listing changes on marketplaces.
keywords: lag, delay, feed schedule, propagation, ingest
updated: 2026-06-05
---

Dispatch from this server is not the same moment a consumer sees the update. Each platform ingests on its own schedule.

## Feed-based platforms

Bulk files are picked up every 15–60 minutes on many classified networks. OEM and aggregator programs may run overnight batches.

| Stage | Typical duration |
| --- | --- |
| Dispatch from this system | Seconds to minutes |
| Platform ingest | 15 min – several hours |
| Search index refresh | Additional delay on some sites |

## API-based platforms

Per-vehicle posts can appear in minutes when rate limits allow. Heavy lot updates may queue on the platform side.

## What Sync shows

**Updating** ends when server work completes. **Live** means the last dispatch was accepted — not that every field is already public.

Example: Price dropped at 9:00 AM; dispatch at 9:01 AM; classified site still shows old price at 9:20 AM during normal ingest lag.

See [Sold listing still live](doc:troubleshooting/sold-listing-still-live).
