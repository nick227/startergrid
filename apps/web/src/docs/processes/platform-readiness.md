---
title: Platform Readiness
summary: Account and listing gates that determine whether a marketplace can receive a vehicle.
keywords: platform readiness, account, listing, live, blocked
updated: 2026-06-05
---

Platform readiness is evaluated per dealer and per marketplace. A vehicle can be ready for syndication in general but still fail one platform’s profile rules.

## Account gate

The dealer must have a platform account in a state that allows outbound traffic. Credential expiry, missing partner paperwork, or suspension stops all listings for that platform regardless of vehicle quality.

## Listing gate

Each ready vehicle is checked against that platform’s required fields, photo count, price rules, and policy flags. Profiles differ: one channel may require eight exterior photos; another accepts four with a placeholder.

## Example

Stock **U24156** — 2021 F-150, valid VIN, six photos, price entered. Account on Platform A is Active; listing passes → **Will sync**. Same unit on Platform B requires eight photos → readiness **Blocked** for B only until two more images are added.

## Outcomes on Sync

| Outcome | Typical cause |
| --- | --- |
| Live | Account active; recent dispatch accepted |
| Will sync | Account active; vehicles ready; awaiting next run |
| Needs you | Operator or dealer approval held in this system |
| Blocked | Account state, partner requirement, or listing fail |

Account detail: [Account states](doc:platforms/account-states). Transport and profiles: [Platform](doc:platforms/platform).
