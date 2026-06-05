---
title: Sync vs Accounts
summary: Which screen to use when vehicles look fine but platforms do not update.
keywords: sync, accounts, blocked, workflow, operator
updated: 2026-06-05
---

Sync reports whether inventory and platforms are in a state that allows outbound traffic. Accounts is where platform relationships are configured and repaired.

## Use Sync when

The question is whether stock is moving, what is blocked, or when the last dispatch completed. Start here after import or bulk edit.

| Symptom | Likely layer |
| --- | --- |
| Cars blocked count > 0 | Inventory — fix validation |
| Platforms blocked count > 0 | Accounts or listing rules |
| Updating badge stuck | Run phase — see [Sync status](doc:processes/sync-status) |

## Use Accounts when

The question is credentials, partner paperwork, account ID linkage, or account standing. Vehicle data can be perfect; a **Credentials needed** row still stops all sends for that marketplace.

## Order of work

1. Inventory — clear blocked vehicles.
2. Accounts — clear non-active platform rows.
3. Sync — confirm counts and run phase return to idle.

Fixing inventory alone does not change account state. Fixing accounts alone does not clear a missing VIN.
