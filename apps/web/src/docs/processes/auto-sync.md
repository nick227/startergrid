---
title: Sending updates automatically
summary: Saving inventory can send ready vehicles to the destinations you turned on. There is no separate publish step on Channels.
keywords: autopilot, send, save, sold, import
updated: 2026-10-26
---

When you import, edit, or mark a vehicle sold, StarterGrid can send the change to connected destinations. You do not publish from a separate Sync screen.

## What starts a send

| What you did | What StarterGrid does |
| --- | --- |
| Imported a spreadsheet | Rechecks the lot and can send ready vehicles |
| Bulk-edited vehicles | Same |
| Changed one vehicle | Sends that vehicle when it is ready |
| Marked sold or removed | Sends a take-down first |

Quick edits a few seconds apart are grouped into one send.

## What happens inside a send

StarterGrid checks each vehicle, maps the details each destination needs, then sends. Vehicles that cannot be listed are held. Destinations that are not connected receive nothing.

A finished send means StarterGrid finished its work. It does not prove the site already shows the change.

See [When a vehicle can be listed](doc:inventory/inventory-readiness).
