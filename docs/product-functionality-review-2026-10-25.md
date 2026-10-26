# Dealership and internal platform review

Reviewed October 25, 2026. Discussion baseline; no application changes.

## Assessment

The product combines inventory management, distribution, a first-party marketplace, lead handling, reporting, and internal support tools. Users must understand too much of the publishing machinery to complete everyday work. More seriously, several visible controls promise behavior that is unfinished, disconnected, or local to one browser. Simplifying navigation alone would leave those problems intact.

There is a useful core worth preserving: dealership intake, inventory editing, the Photos → Vehicle details → Channels sequence, account connections, first-party listings, and scoped access. The redesign discussion should begin with which outcomes the product promises and who owns each step.

## Scope and evidence

Reviewed current frontend routing, navigation, pages and their mounted components; backend route guards and relevant service registries; category schemas; platform profiles; existing product and UX documentation. Executed the actual route parser to reproduce the Settings mismatch and generated the accompanying integration inventory from current source.

This is a source-based functionality and interaction review, not a new live-browser visual/accessibility audit or a production integration certification. “Wired” below means a mounted UI calls an implementation; it does not establish successful external delivery. No messages, publishing jobs, account changes, or production probes were performed. Existing screenshots in the older review were not treated as current evidence.

Existing [product analysis](product-analysis.md) and [admin UX review](admin-dealers-ux-review.md) contain useful history, but some descriptions are stale. In particular, current dealer Home has an onboarding checklist instead of the profile form; Platforms defaults to a configured filter; dealer-level Queue/History and platform Queue are deprecated pages. The old admin review also records several fixes as shipped: those should not be counted again as open bugs.

## 1. Who can do what

| Persona / role | Current experience | Important boundary |
|---|---|---|
| Internal administrator / `SUPER_ADMIN` | Eight-section admin console; access to every dealership and its operational tools | Controls site-wide platform availability and operator accounts |
| Assigned staff / `OPERATOR` | Shared dealer workspace; access to assigned dealerships; dealer creation available from picker | Dealer access is assigned centrally; no separate task permissions surfaced |
| Self-service dealership / `DEALER_OPERATOR` | Same dealer workspace; single-dealer users skip picker; create-dealer affordance hidden | Schema describes this as read-only, but shared dealer route guards check membership, not read-only action permissions |
| Consumer | Separate marketplace app and session domain | Browsing, inquiries, favorites and profile; not an internal/dealership operator |

Self-service signup creates a `DEALER_OPERATOR`. Its name and schema comment should not be interpreted as an enforced read-only policy. The reviewed profile/inventory write paths use `requireDealerAccess`, which permits assigned non-admin users without distinguishing the two operator roles. This is a product permissions decision that needs resolution before designing owner, manager, salesperson, or support experiences.

Sources: [schema](../prisma/schema.prisma), [route guards](../src/server/security.ts), [dealer creation](../src/services/dealer/createDealershipService.ts), [dealer picker](../apps/web/src/pages/DealerPicker.tsx), [app routing](../apps/web/src/App.tsx).

## 2. Current navigation

| Surface | Visible primary destinations | Additional reachable areas |
|---|---|---|
| Dealership | Home, Inventory, Leads, Platforms, Settings | Reports and Help have routes but no primary tabs; platform drawers, platform detail and history; deprecated Queue/History |
| Internal admin | System Status, Operations, Finances, Dealerships, Platforms, Blockers, Audit Log, Users | Global platform detail; embedded dealership workspace with its own five-tab navigation |
| Admin inside a dealership | Admin bar + dealer-view banner + dealer tabs | Admin dealer Home differs from actual dealership Home; Settings also exists here |

Dealer Settings is currently broken at routing: `#/example/settings` parses as `page: platforms`. The admin equivalent parses correctly. Both the main Settings tab and onboarding checklist link are affected. The page component exists; the dealer route parser simply omits `settings` from its accepted segments.

Sources: [navigation](../apps/web/src/lib/operatorNav.ts), [route parser](../apps/web/src/lib/routes.ts), [admin shell](../apps/web/src/pages/AdminApp.tsx), [page shell](../apps/web/src/components/operator/PageShell.tsx).

## 3. Dealership functionality inventory

Status terms: **Wired** = connected UI/implementation; **Conditional** = dependent on category, account, credentials or provider; **Partial** = incomplete behavior; **Disconnected** = supporting code exists without a current mounted entry point; **Legacy** = retained deprecated destination.

| Area | What users can do / where | State and limits |
|---|---|---|
| Signup | Business/location/channel/review intake, account creation, logo | Wired; public signup and authenticated dealer creation use related flows |
| Dealer selection | Choose assigned dealership; create a dealer where permitted by UI | Wired; self-service single-dealer users auto-enter |
| Home onboarding | Checklist for profile, notifications, channel, inventory, first listing; hide checklist | Partial: Settings targets are broken; first-publish completion uses presence of any history event, not verified successful publication |
| Home operations | See dealer-scoped issues; retry individually or in bulk | Wired retry paths; manual resolution and reauthentication have gaps described below |
| Education | Publishing-flow illustration, inline information buttons, documentation reader | Wired; repeated education occupies daily-work screens |
| Profile | Edit business/contact/address/public profile and logo | Wired component; dealer Settings entry broken; admin Home and admin Settings expose it |
| Notifications | Configure email, webhook, Discord, Telegram, SMS and buyer auto-response | Wired settings UI; delivery depends on provider configuration; also accessible from Leads |
| Inventory browse | Search, sort, table/cards, column presets/selection, select rows, readiness filters | Wired; Queued count is hardcoded zero and its filter maps to all rows |
| Inventory work tabs | Browse, Needs Attention, Recently Changed, Sold / Removed | Partial: only Browse receives content from InventoryPage; other tabs show placeholder text |
| Single-item intake | Enter VIN, decode/review, create inventory | Wired |
| Bulk VIN intake | Paste up to 500 VINs, preview/review, commit | Wired API path; current page does not supply the bulk-completion refresh callback used by the control |
| CSV import | Visible Import CSV card | Partial: button shows an alert directing user to a toolbar button that is not present; separate import wizard code exists |
| JSON / connected imports | Source configuration, source checks, snapshots, import history, JSON ingest | Disconnected from current inventory page; components and backend routes remain |
| Vehicle detail | Photos → Vehicle details → Channels, readiness checklist, status badges | Wired; a useful existing task sequence |
| Photos | Upload/manage media and assign category-specific shot slots | Wired; category-dependent media requirements |
| Vehicle data | Edit fields, pricing/details, view lifecycle history | Wired |
| Bulk editing | Apply configured fields to selected vehicles | Wired |
| Vehicle lifecycle | Listing status, mark sold, relist, destructive/removal actions | Wired in detail/header; locating sold/removed stock is hindered by placeholder archive tab and active-only browse query |
| Item distribution | Choose per-item channels, inspect eligibility, publish/withdraw through supported controls | Conditional; multiple destination-specific operations, not a universal publishing action |
| Owned marketplace | Manage listing visibility, view public listing/storefront links | Wired; naming still conflicts with older Dealer Storefront guidance |
| Platforms browse | Filter configured/connected/etc., see account/readiness/queue summaries, select a platform | Wired; configured is the default, not the whole catalog |
| Connection setup | OAuth where supported; account/manual setup fields; dealer enablement and available automation controls | Conditional; connection is distinct from eligibility and live publication |
| Platform drawer | Setup, Feed, Activity, Notes; capability-specific Social, Catalog, Listings, Leads tabs | Conditional; tab flags alone do not prove backend delivery support |
| Platform full page | Setup guide, connection controls, availability, queue summary and history links | Wired, but separate from drawer and with a Queue button targeting a deprecated page |
| Social posting | Select social account/page; create posts and view post history | Conditional; Facebook Business Page and Google Business Profile have posting adapters |
| Catalog sync | Set catalog ID, sync inventory, inspect/remove catalog items | Conditional; ten route-registered catalog bridges, not every named platform |
| External listings | Publish/withdraw and inspect listing state | Conditional; listing route registry currently contains eBay Motors and the first-party marketplace |
| Lead sync | Inspect forms and pull provider leads | Conditional; LinkedIn is the registered lead-sync bridge |
| Leads inbox | Search/filter/sort inquiries, inspect buyer/item/source, open inventory | Wired read flow |
| Lead status | New, Contacted, Appointment, Closed, Lost | Partial: saved in localStorage only; not a shared CRM record across users/devices |
| Buyer communications | View auto-response sent/failed history | Wired; not evidence of a general two-way messaging inbox |
| Reports | Ten routed reports across inventory health, publishing health and demand | Wired report routes; missing from primary navigation; data completeness depends on observations |
| Platform history | Filter events, inspect detail | Wired; separate from deprecated dealer-level History |
| Queue / dealer History | Old routes and some surviving links | Legacy; pages direct users elsewhere rather than show their former tools |
| Account/session | Sign in/out, avatar | Wired; admin user management owns account administration |
| Other categories | Boats, trailers/powersports/RV; ebooks, songs, digital art, video forms | Category-dependent; active schemas are not proof that every category workflow or external integration is complete |

Primary implementation sources: [InventoryPage](../apps/web/src/pages/InventoryPage.tsx), [inventory workspace/intake](../apps/web/src/components/inventory/InventoryWorkspace.tsx), [item detail](../apps/web/src/components/inventory/InventoryDetailPanel.tsx), [PlatformsPage](../apps/web/src/pages/PlatformsPage.tsx), [drawer tabs](../apps/web/src/lib/platformDrawerTabs.ts), [LeadsPage](../apps/web/src/pages/LeadsPage.tsx), [report catalog](../apps/web/src/lib/reportsCatalog.ts), [backend routes](../src/server/routes).

Report inventory: Movement, Readiness, Observed Demand, Lifecycle, Merchandising, Throughput, Exposure, Engagement, Sync Summary, Velocity. All ten have routed page implementations; the catalog marks phases 1–3 shipped. That is distinct from having sufficient data or confirmed sales attribution.

## 4. Internal functionality inventory

| Destination | Capabilities | State / design concern |
|---|---|---|
| System Status | API/database/queue/credential health, queue counts, readiness checks | Wired status endpoint; some readiness checks can be UNKNOWN, not a complete live smoke certification |
| Operations | Cross-dealer actionable issues, individual/bulk retry, audit subtab | Overlaps Blockers; severity selector has no filtering handler; Resolve Issue only displays a toast |
| Finances | Financial summaries, inventory value, platform sales charts and insight cards; buyer outreach metrics | Mixed: financial/dashboard data is generated mock data; outreach metrics are API-backed |
| Dealerships | Search/sort/filter dealer list; create dealer; open Manage/Platforms/Inventory | Wired; current row actions preserve admin scope, unlike the old review's original bug |
| Dealer Home | Publishing explainer, full profile/settings, dealer issues and history | Different from actual dealership Home, complicating support instructions |
| Dealer workspace | Operate inventory, leads, platforms, settings and reports for any dealer | Shared pages inside nested admin navigation; substantial task overlap with dealer users |
| Global Platforms | View catalog, connections/readiness and platform detail | Separately scoped from dealer Platforms but shares its name |
| Global platform detail | Site enable/disable, credential validation, required secrets/scopes, integration classification, setup guides, dealer connections, publishing and failure summaries | Wired administrative controls; disabling has confirmation; credentials largely depend on deployment configuration rather than an all-purpose secrets editor |
| Blockers | Triage blocked dealers/platforms, search/filter, inspect and navigate to affected scope | Overlaps Operations and dealer Home issues |
| Audit Log | Search/sort recent dashboard audit events | Not the same dataset as per-dealer publishing history; not established as a comprehensive compliance archive |
| Operations → Audit Log | Presents a history destination | Global scope shows a message requiring dealer selection rather than global history |
| Users | Search/filter/page accounts, create operator/admin, assign dealership access, suspend/reinstate, reset password, delete | Wired; no granular business-role permission editor |
| Assisted integration work | Inspect setup/validation prerequisites; use partner portals/representatives where applicable | Some work happens outside the product; a platform profile must not be presented as completed automation |

Sources: [admin tabs](../apps/web/src/features/adminOverview/tabs), [admin platform detail](../apps/web/src/pages/AdminPlatformDetailPage.tsx), [admin dealer Home](../apps/web/src/pages/AdminDealerPage.tsx), [dashboard mock data use](../apps/web/src/components/dashboard/DealerDashboard.tsx), [operations surface](../apps/web/src/features/operations/ActivityIssuesSurface.tsx), [history scope behavior](../apps/web/src/features/operations/ActivityHistorySurface.tsx).

## 5. Integration inventory and actual scope

The [machine-readable platform inventory](platform-capability-inventory-2026-10-25.csv) lists all **73 profiles** with categories, declared maturity, connection type, submission methods, capability flags, and whether a catalog/listing route bridge is registered. **23** profiles declare automotive support; users should not see all 73 in a category-scoped dealership.

| Declared source maturity | Count | Interpretation |
|---|---:|---|
| LIVE_VERIFIED | 2 | Source labels for the owned channels; not newly verified in this review |
| SYNC_READY | 13 | Source maturity classification; external configuration and delivery still matter |
| OAUTH_READY | 3 | Authorization readiness is not a promise of end-to-end publication |
| PUBLISH_READY | 1 | Source classification, not production verification |
| SETUP_GUIDE | 54 | Assisted/manual/stub setup profiles; do not count as 54 automated integrations |

Registry evidence:

- Catalog bridges: Google Vehicle Ads, Meta Automotive Ads, TikTok Automotive Ads, TikTok Shop, Microsoft Automotive Ads, Pinterest, Snapchat, Reddit, X and Nextdoor.
- Listing bridges in the listing API: eBay Motors and Auto Marketplace. Other profiles may describe partner feeds/manual workflows; an absent listing bridge does not by itself mean no supported workflow exists.
- Social posting adapters: Facebook Business Page and Google Business Profile.
- Lead-sync bridge: LinkedIn Lead Gen Forms.
- Configurable inventory-change auto-sync is explicitly scoped to `consumer-marketplace` by `AUTO_SYNC_CAPABLE_SLUGS`; this should not be described as universal automatic distribution.

Seven category schemas are marked active: automotive, boats, trailers/powersports/RV, ebooks, songs, digital art, video distribution. Eleven explicit category schemas are marked placeholder: apparel, apartments, collectibles, commercial property, furniture, heavy equipment, homes, pawn, sneakers, vacation rentals, watches. Generic schema factories also exist. Category expansion is a separate product scope from the dealership workflow.

Sources: [profiles](../src/data/platformProfiles.ts), [non-vehicle stubs](../src/data/nonVehiclePlatformStubs.ts), [catalog routes](../src/server/routes/catalogSync.ts), [listing routes](../src/server/routes/marketplaceListings.ts), [lead-sync routes](../src/server/routes/leadSync.ts), [automation availability](../src/services/platform/platformAvailabilityService.ts), [category schemas](../packages/category-schemas/src).

## 6. Current user journeys and breaks

| User goal | Current path | Where understanding or completion breaks |
|---|---|---|
| Get dealership ready | Signup → Home checklist → Settings → Platforms → Inventory | Settings opens Platforms; user cannot follow the instructions as written |
| Add a batch of inventory | Inventory → CSV or bulk VIN | CSV points to a nonexistent toolbar action; bulk commit does not refresh through the current page callback wiring |
| Publish a vehicle | Inventory → item → Photos → Vehicle details → Channels; separately configure Platforms | User must distinguish connected, enabled, ready, selected, queued, synced and live; outcomes differ by integration |
| Find out why nothing is live | Home issues → platform/detail → item readiness | Repeated issue surfaces and queue links lead to different or deprecated destinations |
| Follow up with a buyer | Leads → inspect inquiry → change status; notifications/auto-response settings | Status does not persist for other staff; no established shared follow-up workflow |
| Review sold stock | Inventory → Sold / Removed | Tab is placeholder despite lifecycle APIs and detail actions existing |
| Determine what marketing works | Reports or platform metrics; admin Finances | Reports lacks primary navigation; Finances mixes mock charts with real outreach metrics |
| Support a confused dealer | Admin → Dealerships → Manage → explain next steps | Admin Home is different from dealer Home; admin Settings works while dealer Settings does not |
| Recover a failing integration | Operations/Blockers → Retry / Re-authenticate / Resolve | Retry has a backend path; reauth remediation endpoint returns a hardcoded mock OAuth URL; manual Resolve does not persist |

## 7. Highest-priority findings before a visual redesign

1. **Repair navigation promises.** Settings parser omission is reproduced. Current Queue buttons still lead into deprecated Queue views. Legacy History tells dealers to use a Home Audit Log that dealer Home explicitly hides. Relevant sources: [routes](../apps/web/src/lib/routes.ts), [platform detail](../apps/web/src/pages/PlatformDetailPage.tsx), [dealer History](../apps/web/src/pages/HistoryPage.tsx), [Home](../apps/web/src/pages/HomePage.tsx).
2. **Separate functional controls from placeholders.** Three inventory work tabs lack content; CSV only alerts; Queued is a constant; Operations severity selector has no handler; Resolve Issue only toasts. These are functionality defects, not training problems.
3. **Make business data trustworthy.** Lead status is browser-local. Finances renders `generateMockDashboardData` next to real outreach metrics. Onboarding marks first publishing complete from any history event. These can create a false impression of shared state or successful outcomes.
4. **Clarify recovery behavior.** The operational reauth endpoint returns `https://mock-oauth-provider.com/auth?...`; the UI displays that URL in a toast. Separate real platform OAuth-connect routes exist, but this remediation action is not wired to them. Sources: [admin issue endpoints](../src/server/routes/admin.ts), [operations UI](../apps/web/src/features/operations/ActivityIssuesSurface.tsx).
5. **Define permissions in business terms.** A dealership role described as read-only can pass shared write guards. UI retry/reauth permission variables are hardcoded true, while backend scope checks remain. Define owner/staff/internal responsibilities rather than infer them from labels.
6. **Give every status a user consequence and owner.** Connected, Enabled, Ready, Selected, Scheduled, Live, Failed and Blocked describe different layers. A dealer needs “what is visible, what needs me, what support is fixing,” not an unexplained pipeline taxonomy.
7. **Resolve marketplace naming.** Auto Marketplace is the featured first-party destination and Dealer Storefront is hidden from platform pickers, but inventory guidance still tells users to connect “Dealer Storefront canary.” Sources: [brand rules](../apps/web/src/lib/marketplaceBrand.ts), [inventory guide](../apps/web/src/pages/InventoryPage.tsx).
8. **Establish one primary issue workflow.** System Status, Operations, Blockers, dealer Home, platform activity and audit all expose related information. Scope and ownership are unclear. Consolidation should preserve useful details while giving each incident one clear next action.

## 8. What to preserve

- The staged dealership intake and item detail sequence already orient users around a task.
- Category-scoped platform selection and the default configured-platform filter reduce irrelevant choices.
- Separation of operator and consumer sessions is a useful boundary.
- Shared dealer components can keep internal support and dealership behavior consistent once their different Home/routing paths are reconciled.
- Existing reports, import services and platform registries provide reusable capability; losing navigation is not a reason to rebuild them.

## 9. Discussion agenda for redesign

These are decisions to discuss, not an approved replacement navigation or implementation plan.

| Decision | Why it comes first |
|---|---|
| What is the primary dealership promise: manage inventory, publish everywhere, or capture/respond to leads? | Determines which outcomes belong on Home and what counts as success |
| Which steps are self-service versus managed by internal staff? | Determines which credentials, technical failures and approval controls dealerships need |
| Is launch scope automotive only, physical dealerships, or all categories? | Prevents placeholder categories and unrelated integrations from driving everyday complexity |
| Which integrations are supported delivery products versus assisted setup guides? | Lets UI describe honest capabilities and expected time to go live |
| Is Leads a shared CRM or an inquiry inbox with handoff? | Determines whether shared statuses, owners, notes and reminders are necessary |
| Which metrics are decision-grade? | Establishes whether reports should be primary, contextual or temporarily hidden |
| What actions need owner/admin authority? | Defines the permission model before designing user management |

A useful working hypothesis is a dealership workspace centered on inventory, listing visibility and inquiries, with setup separated from daily work. Internal staff would prioritize dealer onboarding/support, integration health, incidents and access. We should test that hypothesis against real tasks before choosing tab names or removing capabilities.

Suggested acceptance tasks for that discussion: a new dealer publishes one item; a staff member imports a batch and resolves errors; a second staff member sees a lead status changed by the first; a dealer finds sold stock; an admin diagnoses one failed destination and returns the dealer to a verified state. Measure successful completion, time, wrong turns and requests for help. This review identifies likely causes; it does not substitute for observing users.
