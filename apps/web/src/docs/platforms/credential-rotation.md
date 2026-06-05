---
title: Credential Rotation
summary: When marketplace passwords or API tokens change and syndication stops.
keywords: credentials, password, token, expired, login
updated: 2026-06-05
---

Classified and API-based platforms authenticate the dealer or feed partner on each session or request. When credentials rotate without updating Accounts, the account state moves to **Credentials needed** and outbound traffic stops.

## Common triggers

| Event | Result |
| --- | --- |
| Dealer changes marketplace password | Token in this system is stale |
| Platform forces password reset | Same |
| API key rollover by partner | Feed auth fails |
| Staff turnover | Old login removed on platform side |

## Symptoms

Sync shows platforms **Blocked** with account detail pointing to credentials. Inventory readiness may be 100% ready. No new errors on individual vehicles.

## Resolution

Update the account record on Accounts with the current login or API credentials. State returns to **Active** after save. [Auto-Sync](doc:processes/auto-sync) includes that platform on the next run.

Do not re-import inventory to fix credential failures.
