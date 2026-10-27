---
visibility: public
id: staff-dealership-assistance
feature: dealership-management
type: feature
audience: staff
title: Find a dealership and help with its next task
summary: Use the dealership record to understand status, responsibility, and the next action.
tags: dealerships, ownership, support
synonyms: find dealer, assigned, mine, rooftop, internal employee
keywords: find dealer, assigned, mine, rooftop, internal employee
related: dealerships-setup-and-handoff, staff-problems, app-team-access
implementation: apps/web/src/components/dealers/DealershipDirectory.tsx, apps/web/src/components/dealers/DealershipRecordView.tsx, apps/web/src/lib/taskOwnership.ts
updated: 2026-10-27
---

## What this feature does

The dealership directory is a work list. Each record brings together setup progress, destination connections, people, and activity for that business. Internal support staff see the dealerships they are allowed to assist; site administrators have additional site-wide tools.

## Find the next action

1. Open **Dealerships**, search for the business, and confirm its identity before opening the record. Use **Mine** when you want records assigned to you and that filter is available.
2. Read the record's current state and next action. **Overview**, **Channels**, **People**, and **Activity** cover different parts of the same dealership.
3. Check responsibility before acting. **Dealership** means the dealership must supply or correct something; **Our team** means internal staff; **Partner** means an external provider; **System** means processing owned by DealerGrid. **Unassigned** does not identify a responsible person.
4. Open the relevant section and complete the available action within your permissions. Use **Open dealer view** when you need the dealership-facing screens. Confirm the dealership in the support banner and use its return link when finished.

## Check completion

Review the saved result and the current next action. A successfully saved setting does not establish that a downstream listing or notification completed. Use Activity to inspect recorded events where relevant.

## When you cannot proceed

If the record or action is unavailable, ask an authorized site administrator to check your assignment or role. For another team's task, share the dealership, affected feature, error, and expected next action. Do not send credentials. Do not change a different dealership or a shared setting to work around missing access.
