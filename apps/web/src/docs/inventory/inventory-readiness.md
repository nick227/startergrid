---
title: Inventory Readiness
summary: Platform connection, vehicle readiness, selection, and live publishing states.
keywords: readiness, blocked, warning, validation, VIN, photos, storefront, publish, platforms
updated: 2026-06-12
---

Readiness is the validation outcome for a vehicle row: whether it may be included in outbound syndication for the current dealer. It is a gate, not a publish action.

Saved inventory and ready inventory are not the same. A unit can sit in the grid with missing photos and never leave the server.

## Platform first

Dealership Platforms controls which destinations are connected for the rooftop. A dealer may be signed up for five platforms but only actively run three. Only connected platforms are eligible in Inventory and vehicle item controls.

Dealer Storefront is the canary because it is the owned first-party surface. If Storefront is not connected, inventory controls should teach the operator to fix Platforms first. Once connected, the vehicle still has to move through Ready, selected, and live.

## Vehicle flow

| State | Meaning | Action |
| --- | --- | --- |
| Connected | Platform account can receive inventory for this dealership | Manage on Dealership Platforms |
| Ready | Vehicle passes fail-level checks | Toggle Draft/Ready on the vehicle |
| Eligible | Connected platform plus vehicle data passes platform rules | Fix required fields, photos, price, and lifecycle status |
| Selected | Vehicle is allowed on that channel | Per-channel checkbox; unchecking is an opt-out |
| Live | Listing, post, feed, or catalog entry is visible or sent | Publish, queue dispatch, or catalog sync completes |

Checking a channel is not the same as publishing. It only removes a vehicle-level veto. Marking Ready is also not publishing.

## Readiness states

| State | Dispatch | Notes |
| --- | --- | --- |
| Ready | May be included | Passes all fail-level checks |
| Warning | May partial | Issue is advisory; strict platforms may still reject |
| Blocked | Excluded | At least one fail-level issue |

## Dealer Storefront online

1. Connect Dealer Storefront on Dealership Platforms.
2. Open the vehicle and mark it Ready.
3. Leave Dealer Storefront selected for that vehicle.
4. Use the vehicle publish control to create the active storefront listing.

Sold, removed, or zero-price vehicles are hidden regardless of readiness, selection, or prior publish state.

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

Saving the corrected row schedules [Auto-Sync](doc:processes/auto-sync) for external platform machinery such as publish queue, catalog sync, and reconciliation. The owned marketplace still requires its explicit publish step before a vehicle becomes live on Dealer Storefront.
