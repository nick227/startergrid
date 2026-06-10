# Admin Overview Dashboard: Roadmap (Revised)

## 1. Product Goal
Provide in-house `SUPER_ADMIN` operators with a centralized, sanitized, and actionable overview of the entire distribution platform's health. The dashboard must rapidly answer: **What is broken? Who is affected? What should an internal operator do next?** 

It achieves this without exposing raw secrets, adding CRM overhead, or building full BI analytics.

## 2. Proposed Information Architecture under `#/admin`
The admin area is cleanly separated from the dealer context, providing a global view:
- **`#/admin`** - The primary Site Overview Dashboard (the focus of this roadmap).
- **`#/admin/platform-credentials`** - Global credential validation (existing).

*Note: Deferring separate pages for queue health, blocked dealers, and a full paginated audit-log viewer to future phases. The overview dashboard is the sole MVP screen.*

## 3. MVP Dashboard Sections (Single Page)

### 3.1. System Health Cards
High-level operational metrics using a 60-second in-memory cached state:
- **API & DB Health:** Basic checks.
- **Queue Status:** Flowing vs. backed up.
- **Global Platform Credentials:** Summary status of cached validations (does NOT trigger live validation on load).
- **Smoke/Readiness status:** If no persisted smoke result is available, it is marked as `UNKNOWN` / `NOT_RECORDED` rather than failing.

### 3.2. Simple "Dealers Needing Attention" (MVP v1)
A simplified triage list:
- **Scope:** Simple list of dealers currently experiencing active blocks, validation errors, or sync failures.
- **Details:** Dealer name, category, affected platform, basic block message.
- **Action:** Deep-links directly into the dealer's specific `#/dealers/:id` context.
- **Note:** Complex severity ranking and recommendations are deferred to v2.

### 3.3. Global Platform Overview
A registry-driven capability matrix:
- Platforms (Google, Meta, etc.) mapped to their capabilities (socialPosting, catalogSync, marketplaceListing, partnerFeed, leadCapture).
- Shows live configuration status and how many dealers are using or blocked on each platform.

### 3.4. Queue and Sync Snapshot
At-a-glance throughput metrics:
- Counts of pending, failed, retrying, and held-for-approval jobs.
- Oldest pending job age (to identify stuck queues).
- Last successful sync timestamp.

### 3.5. Recent Admin/System Events
A list of recent system-level changes:
- Rendered via a widget displaying the latest 10-20 entries from the existing `AdminAuditLog` table.
- Includes actions like admin credential validations, platform setup changes, global sync failures, and dealer onboarding events.

### 3.6. System Readiness Checklist
- Manifest verification, bridges registered, OAuth clients registered, category schemas loaded, geo coordinate coverage.

---

## 4. Backend Endpoints Needed
To minimize endpoint bloat and database overhead, the dashboard will load via a single aggregated endpoint.

### `GET /api/admin/dashboard`
- **Auth:** Protected by `requireSuperAdmin`.
- **Response Shape:** Includes `health`, `queueSnapshot`, `platformOverview`, `recentEvents`, and `dealersNeedingAttention`.
- **Caching:** In-memory Node.js process cache (60-second TTL). No Redis or third-party cache stores.
- **Credentials:** Returns the *last cached* validation state for platform credentials. Does *not* hit external providers during this request.
- **Sanitization:** All raw tokens, secrets, env vars, and raw provider error bodies are strictly omitted.

---

## 5. Frontend Components/Pages Needed
- `AdminOverviewDashboard.tsx` - Main page under `#/admin`.
- `SystemHealthWidget.tsx` - Displays API, DB, Queue, and Credential health statuses.
- `DealersNeedingAttentionWidget.tsx` - Simple table of dealers with sync/readiness failures, linking out to dealer contexts.
- `PlatformOverviewWidget.tsx` - Grid showing platforms and configured capabilities.
- `QueueSnapshotWidget.tsx` - Queue metrics display.
- `RecentEventsWidget.tsx` - Simple list component displaying recent audit logs.

---

## 6. Data Sources Already Available
- `src/data/platformProfiles.ts` (Platform Registry).
- `PublishQueue`, `SyncEvent` tables.
- `DealershipProfile` and `PlatformApplication` states.
- `AdminAuditLog` table (for recent events).

## 7. New Data/Models (If Any)
- **None.** All data is derived from existing tables.
- **In-memory cache helper:** A simple utility in the backend to cache the aggregated dashboard response for 60 seconds.

## 8. Security & Audit Requirements
- **Guard:** Routes and endpoints are protected by `requireSuperAdmin`.
- **Privacy:** No secrets or raw provider error payloads returned to the client.
- **Read-Only Dashboard:** The overview is read-only. Clicking an action or a dealer navigates the operator to existing audited workflows.

---

## 9. Suggested Implementation Phases

### Phase 1: Aggregated Endpoint & UI Layout (Full MVP)
- Build the `GET /api/admin/dashboard` endpoint with the 60-second in-memory cache wrapper.
- Integrate existing data queries (DB/API status, queue counts, recent audit logs, simple dealer block list, last cached credential validation, and registry configuration).
- Build and ship `AdminOverviewDashboard.tsx` with all widgets (Health, Triage, Platforms, Queues, Events).
- Handle missing smoke test values gracefully as `UNKNOWN`.

### Phase 2: Actionable Triage & Tuning (Future)
- Introduce advanced triage algorithms to rank blocker severity and generate recommended operator "Next Actions".
- Introduce deeper analytics tabs or dedicated sub-pages (`#/admin/queue-health`) as the payload sizes grow.

---

## 10. Acceptance Criteria (Phase 1)
- Operators with `SUPER_ADMIN` can access `#/admin` and view a complete status page in a single load.
- Non-admins are blocked by server-side and client-side guards (403/Redirect).
- Credential status displays the last validation state. The dashboard links to `#/admin/platform-credentials` if a live check is needed.
- If smoke tests are not configured/run, they display as `UNKNOWN` rather than failing the check.
- Page load does not trigger any network requests to external providers (Meta, Google, etc.).
- Performance: Repeated refreshes load instantly due to the 60-second in-memory backend cache.

---

## 11. What to Explicitly Defer
- **Redis caching:** Use in-memory Node.js caching only.
- **Dedicated pages/routes:** Keep all info on a single dashboard overview; no sub-pages for queues or audit logs.
- **Full paginated log viewer:** Only the recent events feed widget is in scope.
- **Dealer impersonation / Billing / CRM.**
- **Live validation on load:** Credential checks remain manual/triggered from the credentials page.
