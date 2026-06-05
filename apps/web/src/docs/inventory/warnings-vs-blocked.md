---
title: Warnings vs Blocked
summary: Difference between advisory validation issues and fail-level exclusions from dispatch.
keywords: warning, blocked, severity, validation, partial sync
updated: 2026-06-05
---

Validation assigns each issue a severity. **Blocked** means the vehicle is withheld from all dispatch. **Warning** means the row may still send to some platforms while failing stricter profiles.

## Blocked

At least one fail-level rule: invalid VIN, zero price, below minimum photos, sold unit still marked available. The stock number does not appear in outbound packets until fixed.

## Warning

Advisory rules: high mileage vs asking price, missing optional trim, borderline photo count for lenient platforms. Strict marketplaces may reject the listing even when this system shows warning, not blocked.

## Example

Stock **N88201** — valid VIN, price set, five photos. Internal minimum is four → **Ready** with a warning on photo quality for one OEM program that requires eight → may fail on that program only.

## On Sync

Blocked units appear under **Inventory readiness**. Warnings increment the ready tile footnote (“with warnings”) but do not add to cars blocked.

See [Inventory readiness](doc:inventory/inventory-readiness).
