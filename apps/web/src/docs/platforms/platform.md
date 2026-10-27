---
title: How a destination is stored
summary: Each destination has a profile, an account, and a send result. Those three are not the same record.
keywords: destination, profile, account, feed, API
updated: 2026-10-26
advanced: true
---

A destination is a marketplace or advertising site that can receive this dealership’s vehicles.

## What StarterGrid stores

| Record | Contents |
| --- | --- |
| Profile | Required fields, photo minimums, price rules |
| Account | This rooftop’s connection, sign-in, and standing |
| Send result | Combined outcome of the account plus each vehicle |

The same vehicle can pass on one destination and fail on another.

## How updates leave the server

**They receive a file.** Vehicles are batched and picked up on that company’s schedule. Delay of 15–60 minutes is common.

**We send directly.** Each vehicle or small batch is posted. Errors come back per stock number.

Dealership users connect the destination and keep vehicle details current. File names and tokens stay with support.

See [When a destination can receive vehicles](doc:processes/platform-readiness).
