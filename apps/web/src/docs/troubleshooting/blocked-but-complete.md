---
title: Blocked but Looks Complete
summary: Why a vehicle row can appear filled in yet fail validation or one platform profile.
keywords: blocked, validation, missing field, platform profile, hidden
updated: 2026-06-05
---

Blocked means at least one fail-level rule fired. The grid may show year, make, model, price, and photos while a required syndication field is empty or invalid.

## Hidden requirements

| Check | Often missed |
| --- | --- |
| Expand row issues | Specific path (VIN, media, bodyStyle) |
| Platform-specific profile | Ready for one channel, blocked for another |
| VIN check digit | Typo passes visual review |
| Photo count | Interior not counted |

## Decode gaps

[VIN decode limits](doc:industry/vin-decode-limits) — cab type, bed length, drivetrain for trucks and SUVs.

## Example

**W12345** — six photos, $28,500, valid-looking VIN. Blocked for `bodyStyle` empty. Expand row shows fail on body style; fill **SUV** or correct trim, save, auto-sync retries.

See [Warnings vs blocked](doc:inventory/warnings-vs-blocked) and [Inventory readiness](doc:inventory/inventory-readiness).
