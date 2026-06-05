---
title: Inventory Readiness
summary: Ready, warning, and blocked validation states for vehicle rows.
keywords: readiness, blocked, warning, validation, VIN, photos
updated: 2026-06-05
---

Readiness is the validation outcome for a vehicle row: whether it may be included in outbound syndication for the current dealer.

Saved inventory and ready inventory are not the same. A unit can sit in the grid with missing photos and never leave the server.

## States

| State | Dispatch | Notes |
| --- | --- | --- |
| Ready | Included | Passes all fail-level checks |
| Warning | May partial | Issue is advisory; strict platforms may still reject |
| Blocked | Excluded | At least one fail-level issue |

## Frequent fail reasons

| Issue | Common source |
| --- | --- |
| Invalid VIN | Typo, import truncation, pre-1981 format on a modern unit |
| Photo count | Recon photos not yet uploaded; only title scan images |
| Price | Zero, placeholder, or outside configured band |
| Status | Retail sold in DMS but still **available** here |
| Trim / body | Base model only after decode; platform requires style or cab |

Example: **W12345** shows ready on Inventory but blocked on Sync for one platform if that platform’s profile requires `bodyStyle` and the row has it blank after VIN decode.

## After a fix

Saving the corrected row schedules [Auto-Sync](doc:processes/auto-sync) for that stock number. Blocked units listed on Sync under **Inventory readiness** mirror the fail set here.
