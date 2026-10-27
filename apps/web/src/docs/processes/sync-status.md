---
visibility: public
id: processes-sync-status
feature: listing-delivery
type: reference
audience: user, staff
tags: listing delivery, channels
synonyms: send status, idle, updating, failed
aliases: processes/sync-status
related:
title: How to read send status
summary: Distinguish a scheduled or running update from a failed run and from a confirmed live listing.
keywords: send status, idle, updating, failed
updated: 2026-10-27
advanced: true
---

Send status is a snapshot for the selected dealership. It is not a full event log.

## Run phases

| Phase | State | Meaning |
| --- | --- | --- |
| Idle | No active send | No send is queued. Destinations may still be processing an earlier update. |
| Scheduled | Updating | A save just finished; the send is about to start. |
| Running | Updating | Checking vehicles or sending now. |
| Failed | Needs fix | The run stopped. Fix the vehicle or destination, then save again. |

Updating ends when DealerGrid finishes — not when Cars.com already shows the new price.

## Counts

**Ready to send** — vehicles that pass checks and can be included.

**Cannot list** — vehicles with a required problem. They stay in inventory but are not sent.

**Destinations ready** — connected destinations that can receive at least one ready vehicle.

**Destinations blocked** — connection, sign-in, partner, or approval gaps. Vehicle edits alone do not clear these.

The last-activity line is the most recent send milestone, not every field edit.
