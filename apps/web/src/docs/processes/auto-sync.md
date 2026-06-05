---
title: Auto-Sync
summary: How inventory saves trigger validation, prepare, and dispatch without a manual publish step.
keywords: auto-sync, debounce, reconcile, dispatch, validate, prepare
updated: 2026-06-05
---

Auto-Sync is the automatic path from saved inventory changes to outbound syndication. Inventory is written when you import, edit, or bulk-update; the server then validates, prepares listing data, and dispatches to platforms that pass account and vehicle checks.

There is no separate “publish” step on the Sync screen.

## What starts a run

| Event | Run type |
| --- | --- |
| CSV import committed | Full reconcile (all ready stock) |
| Bulk edit saved | Full reconcile |
| Single-field save (price, photos, odometer) | Dispatch for affected stock only |
| Sold or removed status set | Priority dispatch for that stock |
| First Sync load with inventory, no prior outbound data | Bootstrap reconcile |

Full reconcile re-validates the lot and rebuilds outbound packets. Field-level saves skip a full lot pass when only one vehicle changed.

## Debounce

Edits within about two seconds are grouped into one run. Example: correcting asking price on twelve units in quick succession produces one reconcile, not twelve.

## Steps inside a run

**Validate.** Each vehicle is checked against required fields, photos, price rules, and platform-specific constraints. Failures mark the unit blocked or warning; blocked units are withheld from dispatch.

**Prepare.** Passing vehicles are mapped to each eligible platform’s field set (trim, drivetrain, photo order, price display).

**Dispatch.** Prepared data is handed to platform runners (feed generation or API submission). Runner timing and retries are outside this screen.

## Badge on Sync

| Badge | Condition |
| --- | --- |
| Auto-Sync | Idle — no run queued or active |
| Updating | Scheduled or running — detail in [Sync status](doc:processes/sync-status) |
| Needs fix | Last run stopped on inventory or account blockers |

## When sync does not move

Blocked vehicles stay in inventory but are excluded from dispatch until fixed. Platforms in a non-active account state receive nothing for that dealer until Accounts is corrected. Fixing either side and saving inventory again schedules the next run.
