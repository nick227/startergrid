---
title: Sync Status
summary: Run phases, summary tiles, and what the last activity line represents.
keywords: sync status, phases, idle, running, failed, tiles
updated: 2026-06-05
---

Sync status is a snapshot of inventory validation and platform eligibility for the selected dealer. It is not a full event log.

## Run phases

| Phase | Badge | Description |
| --- | --- | --- |
| Idle | Auto-Sync | No server work queued. Marketplaces may still be processing an earlier dispatch. |
| Scheduled | Updating | Save completed; run waiting on debounce window. |
| Running | Updating | Validate, prepare, or dispatch in progress. |
| Failed | Needs fix | Run exited with an error. Check blockers, correct data, save again. |

A price change at 2:14 PM may show **Updating** until debounce and dispatch complete; **Auto-Sync** returns when the server finishes, not when the listing visible on Cars.com updates.

## Summary tiles

**Cars ready** — count of vehicles that pass validation and can be included in dispatch. See [Inventory readiness](doc:inventory/inventory-readiness).

**Cars blocked** — units with at least one fail-severity issue. They remain in inventory but are withheld from outbound traffic.

**Platforms ready** — platforms with an active account and no approval hold, where at least one ready vehicle can be sent.

**Platforms blocked** — account, credential, partner, or approval gaps. See [Account states](doc:platforms/account-states). Vehicle corrections alone do not clear these.

## Last activity line

Reports the most recent outbound milestone (submission sent or artifact generated). It does not list every field edit. A morning photo swap on one unit may not appear if no dispatch completed after the change.
