---
title: Platform
summary: How a marketplace destination is represented — profile, account, and sync outcome.
keywords: platform, feed, API, profile, marketplace
updated: 2026-06-05
---

In this system, a platform is a configured marketplace or advertising destination that receives inventory from a dealer rooftop — classified listings, OEM programs, social inventory ads, or aggregator feeds.

Each platform row on Sync and Accounts is one destination with its own profile, account, and status.

## What the system stores

| Record | Contents |
| --- | --- |
| Profile | Required fields, photo minimums, price display rules, VIN and odometer policy |
| Account | Dealer linkage, credentials, partner flags, standing |
| Sync outcome | Combined result of account state plus vehicle-level checks |

One lot file in inventory does not produce identical results on every platform. Profiles and account types differ by channel.

## How updates leave the server

**Feed-based.** Inventory is batched into XML, CSV, or JSON on a schedule. The marketplace ingests the file and refreshes listings on its own cycle. Lag of 15–60 minutes is common.

**API-based.** Each vehicle or small batch is posted over HTTPS. Rate limits and per-call validation apply. Errors surface per stock number.

Runners handle transport. Operators maintain inventory and accounts here; they do not manage feed filenames or API tokens on the Sync screen.

## Related topics

[Platform readiness](doc:processes/platform-readiness) — when a destination can receive stock. [Account states](doc:platforms/account-states) — when the dealer relationship allows sends.
