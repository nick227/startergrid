# Dealership workspaces: inventory and implementation plan

## Existing inventory
- `App.tsx`, `hooks/useOperatorRoute.ts`, `lib/routes.ts`, `lib/operatorNav.ts`: hash routing, dealership selection, role gates, aliases and record scope.
- `PageShell`, `OperatorNav`, `OperatorPage`, `PageHeader`: shared responsive header, selector, staff support banner, Reports, Settings and Help.
- `HomePage` / `DealerHomeDashboard`: setup checklist, profile warnings, vehicle readiness, channel connection/removal issues, buyer inquiries; reuse in Activity / Needs Attention.
- `attentionApi` / `DealerAttentionSection`: authoritative needs-attention detection, ownership and contextual actions; retain this system.
- `LeadsPage`: inbox search, source/status filters, assignment, workflow, CRM handoff and delivery log; relocate intact under Activity.
- `PlatformsPage` / `PlatformDetailPage`: purpose cards, provider discovery, setup and channel views; retain intact.
- `InventoryPage`: inventory list/detail, import/DMS, bulk workflows, lifecycle, documents; retain intact.
- `SettingsPage` / `PeoplePanel`: dealership profile and people management; move PeoplePanel into Team / People.
- `ReportsRouter`, `ReportsHubPage`, ten specialized report pages: retain as independent secondary routes.
- `KnowledgeBasePage`, `HelpButton`, `HELP_TOPICS`: retain standalone index and contextual documentation.
- `AdminApp`, `InternalWorkspace`, `DealershipRecordView`: preserve staff directory, admin destinations and support entry.
- Backend: Vehicle, VehicleLifecycleEvent, VehicleUpdate, Lead, LeadDeliveryAttempt, SyncEvent, IngressRun, ChannelEvent and VehicleSaleRecord provide authoritative business records. Existing dealership activity is an access audit, not a business feed.
- No persistent dealership board/task/comment infrastructure exists; add narrowly scoped shared records rather than browser-only storage.

## Implementation sequence
1. Routes: `#/{dealer}/activity[/attention|leads|sales]`, `#/{dealer}/platforms[/...]`, `#/{dealer}/inventory[/...]`, `#/{dealer}/team[/tasks|people]`; Activity and Board are defaults.
2. Primary navigation: Activity · Channels · Vehicles · Team. Keep Reports, Settings, Help and dealership selection in the header.
3. Reuse Leads as an embedded operational workspace, Home guidance in Needs Attention, PeoplePanel in Team; leave Channels, Vehicles and Reports workflows intact.
4. Add shared secondary navigation, a chronological business feed, a sales register, and persistent Board/Tasks with comments, assignment and record references.
5. Backend: a read-only business aggregation endpoint and sold inventory register; scoped collaboration tables/endpoints with membership checks, input validation and cross-dealership reference validation.
6. Compatibility: Home/bare dealership → Activity; old Leads → Activity/Leads; Settings/Team → Team/People. Preserve report and inventory/channel deep links, row scope, query strings and support mode. Keep technical history routes available.
7. Acceptance: route/default/alias tests; feed grouping/order/source tests; sales unknown-value tests; collaboration validation and access tests; TypeScript/build checks; desktop/mobile browser checks of primary/secondary navigation, bookmarks, staff support, role gates and preserved workflows.

## Visual composition
Retain the established navy, white and silver tokens and typography. Use a restrained title/action row, one horizontal secondary navigation row, spacious filters and readable record rows. Activity's distinguishing element is a chronological record stream; Team uses discussion threads. No extra dashboard or decorative metrics.
