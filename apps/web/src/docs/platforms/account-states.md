---
title: Account States
summary: Platform account states that permit or block outbound syndication.
keywords: account, active, credentials, partner, blocked, suspended
updated: 2026-06-05
---

A platform account is the dealer’s relationship with a specific marketplace or feed endpoint. Syndication does not start until the account record allows outbound traffic.

Vehicle readiness does not override a closed account.

## States

| State | Effect on syndication |
| --- | --- |
| Active | Outbound feeds or API calls permitted |
| Account needed | No dealer ID or listing account linked for this rooftop |
| Credentials needed | Account exists; password, token, or API key invalid |
| Partner required | OEM or marketplace contract not recorded |
| Pending review | Held until internal or platform review completes |
| Blocked | Policy or billing stop; no sends |
| Suspended | Platform-side suspension; no sends |

Example: **Credentials needed** often follows a password rotation on the dealer’s classifieds login. Inventory can be perfect; nothing posts until Accounts is updated.

## Account class

Class describes who operates the marketplace relationship, not whether the account is active.

| Class | Typical setup |
| --- | --- |
| Owned | Dealer staff logs into the marketplace directly |
| Feedable | Inventory sent via approved third-party feed (dealer still owns listings) |
| Assisted | Agency or BDC posts on dealer behalf |
| Partner dependent | Listing requires a certified partner contract before activation |

## Clearing blockers

Resolve account rows on the Accounts page. Changing stock data or photos does not change account state. After Active is restored, the next [Auto-Sync](doc:processes/auto-sync) run includes that platform.
