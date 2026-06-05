---
title: VIN Decode Limits
summary: When VIN decode fills fields and when manual entry is still required.
keywords: VIN, decode, trim, style, cab, incomplete
updated: 2026-06-05
---

A valid 17-character VIN can populate year, make, model, and sometimes trim from decode services. Decode is not exhaustive for every retail listing field platforms require.

## Often missing after decode

| Field | Why |
| --- | --- |
| Cab / bed (pickup) | Decode style may not match marketplace taxonomy |
| Package content | Optional equipment not in VIN build data |
| Color | VIN does not encode exterior paint |
| Mileage | Never from VIN |

## Validation impact

A unit can decode successfully and still be **blocked** for a platform that requires `bodyStyle` or eight photos. Fill gaps manually or via import columns.

## Example

2022 Ram 1500 — VIN decodes to Tradesman; platform profile requires Cab Type **Crew Cab**. Row is blocked until cab is set even though VIN is valid.

See [Inventory readiness](doc:inventory/inventory-readiness) and [Blocked but looks complete](doc:troubleshooting/blocked-but-complete).
