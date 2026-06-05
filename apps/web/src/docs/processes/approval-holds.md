---
title: Approval Holds
summary: Platforms held for operator or dealer confirmation before listings go live.
keywords: approval, needs you, hold, pending, confirmation
updated: 2026-06-05
---

Some platform configurations require explicit approval before the first send or before a major feed change. Until released, the platform shows **Needs you** on Sync even when inventory is ready and the account is otherwise active.

## Typical cases

| Situation | Hold reason |
| --- | --- |
| First-time feed to a marketplace | Fraud or duplicate-dealer checks |
| Large lot refresh after long pause | Platform policy on bulk re-list |
| Price or photo policy flag | Manual review queue |

## What still syncs

Other platforms without a hold continue on [Auto-Sync](doc:processes/auto-sync). A hold on Platform A does not block Platform B.

## Clearing a hold

Resolve the item on Accounts or follow the platform’s review process outside this console. When the hold clears in this system, the next dispatch includes that destination.

Example: Store launches on a new classified channel; account is Active but first feed is held for duplicate listing review. Inventory shows 80 ready units; Sync shows **Needs you** for that channel only until approval completes.
