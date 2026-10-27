---
visibility: public
id: staff-problems
feature: problem-diagnosis
type: troubleshooting
audience: staff
title: Diagnose an operational problem
summary: Identify the affected scope, take an available recovery action, and check the recorded outcome.
tags: problems, errors, support
synonyms: failed, retry, reauthenticate, responsibility, incidents
keywords: failed, retry, reauthenticate, responsibility, incidents
related: staff-dealership-assistance, staff-integration-setup
implementation: apps/web/src/features/operations/ActivityIssuesSurface.tsx, apps/web/src/features/operations/api.ts
updated: 2026-10-27
---

## Start with the scope

Site administrators use **Problems → Actionable Issues** for issues across dealerships. Staff with a narrower workspace use the affected dealership and its activity or channel details. A missing site-wide menu does not grant permission to access it another way.

## Diagnose before retrying

1. Confirm the dealership, vehicle or destination associated with the issue. The scope tells you whether you are looking at one record or all dealerships.
2. Read the failure and available action. Missing inventory details require an inventory correction; expired authorization requires reconnection. Repeating a send does not repair either.
3. Use the offered recovery action only after the prerequisite is corrected. Avoid bulk retry when different issues have different causes.
4. Read the returned outcome and inspect **Audit Log** or dealership Activity for recorded attempts. A completed retry is not proof that an external website has published the listing.

## When to involve someone else

For dealership data or access, contact the responsible dealership person. For shared integration configuration, involve an authorized site administrator. For a provider-side requirement, involve that provider. Include scope, error text, attempt time, and steps already taken.

An issue-list loading error is not an all-clear result. Retry loading before concluding that there are no open issues.
