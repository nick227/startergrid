---
title: Dealer Context
summary: Rooftop scoping for inventory, accounts, and sync — why dealer selection matters.
keywords: dealer, rooftop, group, legal entity, scope
updated: 2026-06-05
---

All inventory, accounts, validation, and sync results are scoped to one dealer record — one licensed selling entity or rooftop at a time.

Selecting a dealer reloads every page with that rooftop’s data.

## What is isolated

| Area | Per dealer |
| --- | --- |
| Vehicle rows | Yes |
| Platform accounts | Yes |
| Validation and readiness | Yes |
| Sync counts and outcomes | Yes |

A group with three rooftops has three separate account sets. Platform A may be Active for Store 1 and **Account needed** for Store 2.

## Rooftop and group

**Rooftop** — one physical location with its own stock and usually its own marketplace accounts.

**Group** — the operator that owns multiple rooftops. Legal name and DBA may differ per license.

**Legal entity** — the name on the dealer license. Syndication agreements often bind to this entity, not the group marketing name.

## Typical mistake

Inventory imported under Dealer ID **east-main** will not appear on platforms configured under **west-main**. Confirm the rooftop before import or account work.

## Sequence

Select dealer → load or correct inventory → verify Accounts → use Sync to confirm readiness and run state. No cross-rooftop batch view exists in this console.
