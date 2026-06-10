# Admin Overview Dashboard: Roadmap

## 1. Product Goal
Provide in-house `SUPER_ADMIN` operators with a centralized, sanitized, and actionable overview of the entire distribution platform's health. The dashboard must rapidly answer: **What is broken? Who is affected? What should an internal operator do next?** It achieves this without exposing raw secrets, adding CRM overhead, or building full BI analytics, focusing strictly on operational visibility and triage.

## 2. Proposed Information Architecture under `#/admin`
The admin area will be cleanly separated from the dealer context, providing a global view:
- **`#/admin`** - The primary Site Overview Dashboard (the focus of this roadmap).
- **`#/admin/platform-credentials`** - Global credential validation (existing).
- **`#/admin/queue-health`** - Dedicated deeper dive into sync jobs and queues (deferred to Phase 2).
- **`#/admin/blocked-dealers`** - Expanded view of all dealers needing attention (deferred to Phase 3).
- **`#/admin/audit-log`** - Paginated viewer for system events and admin actions (deferred to Phase 3).

## 3. MVP Dashboard Sections (Overview Page)

### 3.1. System Health Cards
High-level operational metrics using a 60-second cached endpoint.
- API health, DB health, Queue health (backed up vs flowing).
- Platform credential health (aggregate from existing validation endpoint).
- Smoke/readiness status.

### 3.2. Dealers Needing Attention
A prioritized triage list for operators.
- **Columns:** Dealer Name, Category (Automotive/Boats/etc.), Affected Platform, Severity, Blocker Reason, Next Action.
- **Action:** Clicking the row deep-links directly into the dealer's specific `#/dealers/:id/...` context.

### 3.3. Global Platform Overview
A registry-driven capability matrix.
- **Columns:** Platform Name, Capabilities (socialPosting, catalogSync, marketplaceListing, partnerFeed, leadCapture), Configured Status, Live Validation Status, Dealers Using It, Blocked Dealers, Integration Maturity.

### 3.4. Queue and Sync Snapshot
At-a-glance throughput metrics.
- Pending jobs, Failed jobs, Retrying jobs, Held-for-approval jobs.
- Oldest pending job age (to identify stuck queues).
- Last successful sync timestamp.

### 3.5. Recent Admin/System Events
A feed of recent system-level changes.
- Admin credential validations, platform setup changes, global sync failures, and dealer onboarding events from `AdminAuditLog`.

### 3.6. Readiness Checks
A static/cached checklist of internal system integrity.
- Platform registry manifest valid, bridges/OAuth clients registered, category schemas loaded, geo coordinate coverage, OpenAPI client freshness.

## 4. Backend Endpoints Needed
All endpoints must be protected by the `requireSuperAdmin` server guard and utilize a 60-second caching strategy to prevent dashboard loads from spiking the DB.

- `GET /api/admin/dashboard/health` - Returns DB, API, Queue, and Readiness health booleans/counts.
- `GET /api/admin/dashboard/blocked-dealers` - Returns a subset of dealers with active blocks, ranked by severity.
- `GET /api/admin/dashboard/platforms` - Returns aggregated stats per platform joined with registry capabilities.
- `GET /api/admin/dashboard/queue-snapshot` - Returns counts of jobs by status and oldest pending job age.
- `GET /api/admin/dashboard/recent-events` - Returns the latest 10-20 entries from `AdminAuditLog`.

## 5. Frontend Components/Pages Needed
- `AdminOverviewDashboard.tsx` - Layout container mapping to `#/admin`.
- `SystemHealthWidget.tsx` - Grid of status cards.
- `BlockedDealersWidget.tsx` - Triage table component.
- `PlatformOverviewWidget.tsx` - Platform capability and status grid.
- `QueueSnapshotWidget.tsx` - Queue metrics visualization (numbers/bars, no complex charts).
- `AdminEventsWidget.tsx` - Simple feed list of recent audit logs.

## 6. Data Sources Already Available
- `src/data/platformProfiles.ts` (Platform Registry).
- `PublishQueue`, `SyncEvent` tables.
- `DealershipProfile` and `PlatformApplication` states.
- `AdminAuditLog` table (for recent events).

## 7. New Data/Models (If Any)
- **No new Prisma models required for the MVP.** All data can be derived from existing tables.
- **In-memory or Redis caching layer** (depending on existing infra) for the `/api/admin/dashboard/*` endpoints to enforce the 60-second TTL.

## 8. Security/Audit Requirements
- **Authentication:** All routes strictly guarded by `requireSuperAdmin`.
- **Sanitization:** Explicitly strip provider error bodies, env var values, OAuth tokens, and secrets from all API responses.
- **Audit Logging:** Any action taken from the dashboard (e.g., retrying a global queue, validating credentials) must append to `AdminAuditLog`.
- **Read-Only Dashboard:** The overview is read-only. Modifying a dealer's state requires clicking out to their specific portal, ensuring existing dealer-scoped audit trails remain intact.

## 9. Suggested Implementation Phases

### Phase 1: Foundation & System Health
- Implement `requireSuperAdmin` on new `#/admin` root page.
- Build `GET /api/admin/dashboard/health` and `GET /api/admin/dashboard/readiness` (cached).
- Ship `SystemHealthWidget` and `ReadinessChecksWidget`.

### Phase 2: Visibility & Throughput (Queues & Platforms)
- Build `GET /api/admin/dashboard/queue-snapshot` and `GET /api/admin/dashboard/platforms`.
- Ship `QueueSnapshotWidget` and `PlatformOverviewWidget`.
- Connect the existing platform credential validation into the platform overview.

### Phase 3: Triage & Audit (Dealers & Events)
- Build `GET /api/admin/dashboard/blocked-dealers` and `GET /api/admin/dashboard/recent-events`.
- Ship `BlockedDealersWidget` (with deep links to dealer context) and `AdminEventsWidget`.

## 10. Acceptance Criteria
- **Phase 1:** An internal operator can navigate to `#/admin` and immediately see if the database, API, or core registry is down/invalid without triggering heavy queries. Non-admins get a 403.
- **Phase 2:** Operators can see queue backlogs and determine if a specific platform integration is globally failing vs. isolated to one dealer.
- **Phase 3:** Operators have a prioritized list of dealers to triage, with clear "Next Action" recommendations, and can view a feed of who recently validated credentials or altered configurations.

## 11. What to Explicitly Defer
- **Dealer Impersonation:** Do not build a "login as dealer" flow; rely on existing internal operator access.
- **Billing / CRM:** Exclude all subscription, invoicing, and lead management views.
- **Full Analytics:** Exclude historical trend charts (e.g., line graphs of queue volume over time).
- **Log Viewer:** Exclude raw system log aggregation (rely on Datadog/ELK for that).
- **Bulk Editing:** Exclude the ability to bulk-update inventory or bulk-retry jobs across multiple dealers from the dashboard.
