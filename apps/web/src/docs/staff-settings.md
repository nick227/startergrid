---
visibility: public
id: staff-settings
feature: staff-administration
type: reference
audience: staff
title: Understand site administration settings
summary: Choose the site-wide tool that matches the issue without confusing it with dealership Settings.
tags: settings, administration, permissions
synonyms: system, staff accounts, audit, users, site admin
keywords: system, staff accounts, audit, users, site admin
related: staff-integration-setup, staff-dealership-assistance
implementation: apps/web/src/lib/adminConsole.ts, apps/web/src/pages/AdminSettingsIndex.tsx
updated: 2026-10-27
---

## Scope and access

Site administration Settings is for authorized site administrators. Dealership **Settings** controls one business's profile, people, and notifications. Internal support staff may not have access to site-wide administration.

| Site-wide tool | Use it for |
| --- | --- |
| Destinations we support | Shared destination availability and integration configuration |
| Is DealerGrid up | System status information |
| Who can sign in | Internal staff accounts and dealership assignments |
| Recent changes | Recorded staff changes across the site |

## Before changing a setting

Confirm whether the requested change affects one dealership or the entire service. Use the dealership record for dealership work. Review the action's scope and consequence before saving a site-wide change.

## Check the outcome

Read the save result and inspect the affected record or recent changes. A successful configuration save does not prove that a sign-in, send, or external integration has recovered; check that specific operation separately.
