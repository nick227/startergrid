# Milestone: Publish Console Workflow Polish

**Status:** Ready to build  
**Prerequisite:** Architecture restructure complete (2026-06-04). Freeze all folder/import refactors before starting this milestone.  
**Scope:** UI polish + one new backend endpoint. No new backend concepts.

---

## Goal

An operator opens a dealer and immediately knows:

- What is ready, blocked, or waiting for account/partner action
- What is scheduled to dispatch and when
- What needs their approval right now
- What ran recently and what it produced
- The single next action they should take

Everything lives on one screen. Advanced internals (queue item IDs, artifact checksums, raw sync event payloads) are hidden by default.

---

## What Is Already Built

The skeleton console (`apps/web/`) is live and wired to the API. Current panels:

| Panel | Status |
|-------|--------|
| `ActionBanner` — nextRecommendedAction | ✅ Exists, needs copy polish |
| Vehicle readiness summary (ready/warning/blocked) | ✅ Exists inline in PublishConsole |
| 8-state summary count cards | ✅ Exists inline |
| `PlatformGrid` — 18 platforms grouped by class | ✅ Exists, has Show Advanced toggle |
| `AccountsPanel` — account + application state per platform | ✅ Exists |
| `HistoryTimeline` — raw SyncEvent list | ✅ Exists, paginated |
| `PrepareModal` — dry-run preview + execute | ✅ Exists |
| Queue/scheduler panel | ❌ Not built |
| Loading skeleton states | ⚠️ Partial — full-page spinner only |
| Empty state messaging | ⚠️ Partial — only in HistoryTimeline |
| Error boundary per section | ❌ Not built |

---

## Work Required

### 1. New backend endpoint: `GET /api/dealers/:id/publish/queue`

`getQueueView()` already exists in `src/services/publishing/publishQueueService.ts` and returns a fully typed `QueueView`. The only work is wiring it into the server.

**Add to `src/server/routes/publish.ts`:**

```
GET /api/dealers/:dealershipId/publish/queue
```

Response: the `QueueView` object directly from `getQueueView(prisma, dealershipId)`.

The `QueueView` type includes:
- `pending` — items in READY / SCHEDULED / NEEDS_APPROVAL / HELD / BLOCKED states
- `claimed` — items currently in-flight (CLAIMED by scheduler)
- `overdue` — SCHEDULED items past their `scheduledFor` window
- `retryPending` — FAILED items eligible for retry
- `terminal` — recent SENT / CANCELLED items (last 10)
- `platformAccounts` — per-platform account state (same as `/accounts`)
- `summary` — counts: ready, scheduled, needsApproval, blocked, held, claimed, overdue, retryPending, sent, failed

Also add `QueueView` and `QueueItemView` types to `apps/web/src/lib/types.ts` and a `fetchPublishQueue(dealerId)` function to `apps/web/src/lib/api.ts`.

### 2. New UI panel: `QueuePanel`

New file: `apps/web/src/components/QueuePanel.tsx`

Shows the queue in four scannable sections, all collapsed by default except the first non-empty one:

**Section A — Needs attention now (always visible if non-empty):**
- Overdue items (SCHEDULED but past window): platform name + how overdue + trigger kind
- Items in NEEDS_APPROVAL: platform + age + approval reason
- Items in HELD: platform + hold reason + held-by

**Section B — In progress:**
- CLAIMED items: platform + claimed-by (scheduler ID) + elapsed time

**Section C — Upcoming scheduled:**
- SCHEDULED items sorted by `scheduledFor`: platform + next dispatch time + trigger kind
- READY items (immediate on next scheduler run): platform + trigger kind

**Section D — Recent (collapsed by default):**
- Last 5 SENT items: platform + sent time
- Last 5 FAILED items: platform + failure reason

Footer: `{n} items pending · next due {time}` — link to run scheduler or review approvals.

**Rules:**
- Queue item IDs, policyMode, priority values, idempotencyKey — hidden by default, visible with "Show advanced" toggle (same pattern as PlatformGrid)
- Empty queue: show "Queue is clean — nothing pending" with a muted icon
- Polling: does not auto-refresh; user clicks Refresh in the header

### 3. Improve `HistoryTimeline` → `RecentActivityPanel`

Rename `HistoryTimeline` to `RecentActivityPanel` (or keep name, change content).

Current: shows raw SyncEvent rows with kind badge + relative timestamp.

Add:
- Group events by `syncRunId` when present — show "Sync run · {n} events" collapsible row instead of n individual rows
- Latest prepare run summary: "Last prepare: {date} · {n} platforms activated · {n} artifacts written" — derived from the most recent batch of ARTIFACT_GENERATED events
- If no events exist: "No activity recorded yet. Run Prepare & Publish to start." — not just an empty list

Remove: raw payload column (it shows `[Object object]` today). Show only: kind badge, platform (if present), timestamp.

### 4. Inventory readiness summary polish

The current panel shows Total / Ready / Warning / Blocked counts. Rename and tighten:

| Current label | New label | Notes |
|---|---|---|
| Total inventory | {n} vehicles | Drop "Total" prefix |
| Ready to publish | {n} ready | Keep green |
| Warnings | {n} with warnings | Amber — has issues but won't block publish |
| Blocked | {n} blocked | Red — has FAIL issues, won't publish |

When `blocked > 0`: add a short callout below the panel listing the blocked stock numbers (same data as `vehicles.details` from the prepare endpoint). This avoids the operator having to open PrepareModal just to see which vehicles need attention.

The "needs approval" count from the queue summary goes here too if > 0:
- "3 queue items awaiting your approval" — click opens the PrepareModal or scrolls to QueuePanel

### 5. Loading, empty, and error states

Every section that loads independently should have three distinct states:

**Loading (while data fetch is in flight):**
- Skeleton shimmer rectangle at the same height as the real content
- Not a full-page spinner — each panel loads independently after the first paint

**Empty:**
- `ActionBanner`: if `nextRecommendedAction === 'no_action'` → green "All platforms up to date" (already implemented)
- `PlatformGrid`: can never be empty (always 18 platforms) — no empty state needed
- `QueuePanel`: "Queue is clean — {n} active platforms, nothing pending dispatch"
- `RecentActivityPanel`: "No activity yet. Run Prepare & Publish to record the first event."
- `AccountsPanel`: can never be empty (always 18 platforms) — no empty state needed

**Error (fetch failed or server error):**
- Each panel shows an inline error chip: "Could not load [panel name] — [error message] — Retry"
- Do not blank the entire screen; other panels that loaded successfully stay visible
- Error in one panel does not prevent Refresh from working

### 6. ActionBanner copy — add command hint

For each `nextRecommendedAction`, add a one-line "What to do" hint below the description:

| Action | Command hint |
|--------|-------------|
| `fix_blocked_vehicles` | "Fix the blocked vehicles below, then re-run Prepare." |
| `review_approvals` | "Open the Queue panel and approve pending items." |
| `run_scheduler` | "Click Refresh Scheduler below, or run `sync:scheduler` from the CLI." |
| `resolve_partner_requirement` | "Contact the platform or your account manager to initiate a commercial agreement." |
| `resolve_account_requirement` | "Review blocked platforms in the status grid for required account setup." |
| `no_action` | *(no hint — everything is good)* |

Also add a "Refresh Scheduler" button directly in the banner when `action === 'run_scheduler'`. This button calls `POST /api/dealers/:id/publish/prepare` with `{ dryRun: false }` and then refreshes the console — same as Execute in the modal but without the preview step.

---

## What NOT to Build

- New database models or schema changes
- CRM, leads, buyer accounts, paid ads, storefront pages
- Authentication or multi-tenant routing
- Real-time / WebSocket refresh
- CSV export of queue or history data
- Any new business logic in services — only expose what already exists

---

## API Changes Summary

| Change | File | Type |
|--------|------|------|
| Add `GET /api/dealers/:id/publish/queue` | `src/server/routes/publish.ts` | New route |
| Add `QueueView`, `QueueItemView` types | `apps/web/src/lib/types.ts` | Types only |
| Add `fetchPublishQueue()` | `apps/web/src/lib/api.ts` | Fetch wrapper |

No schema changes. No service changes. No new service files.

---

## File Map

**New files:**
```
src/server/routes/publish.ts          ← add queue route (existing file, new handler)
apps/web/src/components/QueuePanel.tsx
```

**Modified files:**
```
apps/web/src/lib/types.ts             ← add QueueView, QueueItemView
apps/web/src/lib/api.ts               ← add fetchPublishQueue
apps/web/src/pages/PublishConsole.tsx ← add QueuePanel, wire queue data, skeleton states
apps/web/src/components/ActionBanner.tsx  ← add command hints + refresh button
apps/web/src/components/HistoryTimeline.tsx ← group by syncRunId, remove payload column
```

**Possibly renamed:**
```
apps/web/src/components/HistoryTimeline.tsx → RecentActivityPanel.tsx
```
(coordinate with any imports before renaming)

---

## Acceptance Criteria

An operator opens a dealer and, without reading any docs:

1. **Understands what to do next** — ActionBanner is the first element, its copy is plain English, the command hint tells them exactly how to act.

2. **Sees which vehicles are blocked** — if any, their stock numbers appear below the inventory summary without opening a modal.

3. **Sees queue state at a glance** — overdue items, approval-pending items, and upcoming scheduled dispatches are in the QueuePanel with estimated dispatch times. Nothing is hidden behind a modal.

4. **Sees recent activity** — RecentActivityPanel shows the last prepare run summary and most recent sync events, grouped sensibly — not a raw event dump.

5. **All sections have loading and empty states** — no section shows blank white space while loading; no section shows a blank list when empty.

6. **No broken states** — if one panel fails to load, the rest stay functional. Retry is available per section.

7. **All existing tests and regression commands remain green** — `npm test` (409), `npm run smoke:test`, `npm run publish:prepare`, `npm run sync:queue` all pass without modification.

---

## Known Constraints Going In

- `lifecyclePersistenceService` in `publishing/` still owns `persistLead`. Do not move it during this milestone.
- The QueuePanel Refresh Scheduler button calls the existing prepare endpoint — it does not add a new scheduler-trigger endpoint.
- History events will be empty for a fresh dealer until `publish:prepare` executes — the empty state copy handles this.
