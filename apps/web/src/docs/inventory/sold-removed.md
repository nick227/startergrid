---
visibility: public
id: inventory-sold-removed
feature: listing-removal
type: task
audience: user, staff
tags: listing removal, channels
synonyms: sold, removed, take down, availability, manual listing
aliases: inventory/sold-removed
related: troubleshooting-sold-listing-still-live
title: Mark a vehicle sold or removed
summary: Update availability, then check the removal result for each destination.
keywords: sold, removed, take down, availability, manual listing
updated: 2026-10-27
---

Update a vehicle’s status when it is no longer available. Lowering its price to zero does not mark it sold.

## Mark a vehicle sold

Open the vehicle in **Vehicles** and choose **Mark sold**. Confirm that its status changes to **Sold**. This changes availability in DealerGrid; inspect the downstream listing result separately.

## Choose the right status

- **Sold:** the vehicle has been sold. Keep its record for your team’s history.
- **Removed:** the vehicle is no longer available through this dealership, for example after a transfer.

If another inventory system shows the vehicle as sold, check that the change also appears in DealerGrid.

## Check the listings

DealerGrid requests removal from the destinations it manages. A request is not confirmation that the destination has removed the listing. Check its latest result and follow any next step shown.

Listings created manually or through a separate provider may need to be removed there. Pausing Autopilot does not remove existing listings; removal work for managed listings can continue while paused.

See [A sold vehicle is still listed](doc:troubleshooting/sold-listing-still-live).
