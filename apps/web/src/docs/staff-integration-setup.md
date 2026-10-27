---
visibility: public
id: staff-integration-setup
feature: channel-accounts
type: task
audience: staff
title: Check dealership connections and shared integration settings
summary: Distinguish one dealership account from settings that affect every dealership.
tags: integrations, channels, accounts
synonyms: credentials, shared, setup, provider, connection
keywords: credentials, shared, setup, provider, connection
related: app-channels, platforms-credential-rotation, staff-settings
implementation: apps/web/src/pages/AdminPlatformDetailPage.tsx, apps/web/src/components/platforms/AccountEditForm.tsx
updated: 2026-10-27
---

## Choose the correct scope

A dealership's channel connection belongs to that dealership. Site administration's **Settings → Destinations we support** controls shared destination availability and integration settings. Do not change shared configuration to repair one dealership without evidence that the shared configuration is the problem.

## Check the connection

1. Open the affected dealership's channel and read its setup state, delivery method, and next action.
2. Check whether the missing information belongs to that dealership or to the shared integration. A provider contract or account permission cannot be fixed by editing vehicle photos.
3. For a dealership account, use its available setup or reconnection action. For a shared integration, an authorized site administrator should inspect **Destinations we support** and the relevant destination.
4. Review the saved connection result, then separately check whether automatic updates are supported and selected.

## Expected result

The connection should no longer show the original setup problem. Publication still depends on vehicle requirements, supported delivery, and downstream processing. A saved credential is not a confirmed live listing.

## If setup still fails

Record the destination, affected dealership, time, and error. Never copy tokens or passwords into a support message. Follow the provider-specific configuration reference when available; do not assume every destination supports the same transport or authorization method.
