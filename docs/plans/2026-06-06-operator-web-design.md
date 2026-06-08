# Operator Web — Design Plan

**Created:** 2026-06-06  
**Updated:** 2026-06-08 — synced with shipped IA, auth, row-card shell, reports catalog  
**Status:** Approved direction — **core shell shipped** (Sprints 1–4); inventory ops backlog and queue actions remain  
**Live status:** [ui-status.md](../ui-status.md) · [UI roadmap](./2026-06-06-operator-web-ui-roadmap.md)  
**Related:** [channel console architecture](./2026-06-06-operator-channel-console-architecture.md) · [2026-06-06-ui-design-system-design.md](./2026-06-06-ui-design-system-design.md) · [2026-06-06-operator-web-experience-design.md](./2026-06-06-operator-web-experience-design.md) · [reports catalog](./2026-06-06-operator-reports-catalog-design.md) · [layered naming ADR](./2026-06-08-layered-category-naming-adr.md)

---

## Decision summary

The Operator Console is a **channel operations console** — manage **assets** across **channels**, track what was sent, failed, sold, and which channels performed. **Cars are the first vertical**, not the product definition. Same reusable shell (Platforms · Queue · History · Reports · Inventory) applies to furniture, boats, property, equipment, music, etc.

| Principle | Operator stance |
|-----------|-----------------|
| **Product** | Channel ops console — connectivity, queue, history, reporting (see [architecture](./2026-06-06-operator-channel-console-architecture.md)) |
| **Core value** | Sync assets to many destinations; prove transactions; measure channel performance |
| **Personality** | Mobile-first operational rows; desktop = list + detail |
| **Primary user** | Operators who manage multi-channel inventory (dealers first) |
| **Primary question** | “Are my channels connected, updating, and performing?” |
| **Accent** | Orange primary actions · navy chrome · green/red/amber for status only |
| **Clarity** | Situation → needed action → details (progressive disclosure) |
| **Scope boundary** | Platform ops + inventory input + sold attribution — not CRM, F&I, accounting, or service |

Marketplace is photo-forward browse; Operator is **platform-forward operations**. Same tokens, different emphasis.

### Core product — five pages

The product retrenches on **platform connectivity + queue + history + reporting**. Everything else supports these five surfaces.

| # | Page | Generic purpose |
|---|------|-----------------|
| 1 | **Platforms** | Which channels are connected, inactive, blocked, or live |
| 2 | **Queue** | What asset actions are waiting — editable, scheduled, or failed |
| 3 | **History** | What happened to every asset across every channel |
| 4 | **Platform Queue** | Queue for one marketplace |
| 5 | **Platform History** | History and performance for one marketplace |

**Supporting surfaces (not the core five):**

| Page | Role |
|------|------|
| **Inventory** | Source records for assets (vehicles in v1) |
| **Reports** | Compare channels — sell-through, aging, performance |
| **Help** | Vertical-aware education (KB today = automotive) |

### Navigation

**Dealer-facing** (default shell after dealer selected):

| Nav item | Maps to | Default landing |
|----------|---------|-----------------|
| **Platforms** | Platform Status List (#1) | Yes — home after dealer pick |
| **Queue** | Site Queue (#2) | |
| **History** | Site History (#3) | |
| **Reports** | Performance / ROI roll-ups | |
| **Inventory** | Inventory import & readiness | |
| **Help** | Knowledge base | |

**Drill-down routes** (not top-level tabs):

- `#/{orgId}/platforms/{platformSlug}/queue` → Platform Queue (#4)
- `#/{orgId}/platforms/{platformSlug}/history` → Platform History (#5)

**Admin-only** (separate shell or role-gated):

| Nav item | Purpose |
|----------|---------|
| **Dealer Picker** | Choose rooftop |
| **Support View** | Cross-dealer diagnostics (internal) |
| **Audit** | Who changed vehicle / account / publish state |

### Legacy mapping (v4.7 → target IA) — complete

Migration shipped. Legacy hashes redirect; mapping for reference:

| v4.7 screen | Absorbed into |
|-------------|---------------|
| Sync + platform list | **Platforms** (status list) + **Queue** (pending work) |
| Platform accounts | **Platforms** row detail (connection / account state) |
| Last sync / sync events | **Site History** |
| Per-platform publish state | **Platform Queue** + **Platform History** |
| Insights | **Reports** |
| Inventory | **Inventory** (unchanged role, row-card layout) |

### Product position

Operator Web is **not a full DMS**. It is an **inventory and platform operations console** that can replace weak inventory-side DMS workflows for independent dealers.

That positions the product against AutoManager / DealerCenter where they are vulnerable — inventory, syndication, and margin visibility — without cloning their deal, accounting, or service complexity.

### Product principle

Every new feature must improve **at least one** of four outcomes:

1. **Platform connectivity** — sites connected, authorized, and eligible to receive inventory
2. **Sync queue truth** — pending post / update / remove work is visible and editable
3. **Transaction history** — proof of what was sent, when, and outcome
4. **Platform performance** — views, leads, sold source, and ROI signals per site

Inventory lifecycle, cost, and margin features still matter — but only in service of **getting cars synced and measuring site results**. Reject features that don’t advance one of the four above.

### Platform threat model

| Competitor weakness | Our response |
|---------------------|--------------|
| AutoManager feels broad / older | Faster platform status + queue + clearer “what’s stuck” |
| DealerCenter is broad and lead-heavy | Sharper platform sync, history proof, and per-site ROI |
| DMS tools report data but do not explain what to fix | Queue as action list: blocked posts, stale listings, failed removals |
| Dealers resist switching DMS | Start as overlay; become inventory source of truth over time |
| Full DMS is sticky but bloated | Replace only inventory-side workflows first |

---

## What we have already

### Product (shipped shell — 2026-06-08)

Channel ops console with six dealer-scoped tabs, login gate, and organization picker:

| Screen | Route | Status |
|--------|-------|--------|
| Login | (unauthenticated) | Shipped |
| Organization picker | `#/` | Shipped — scoped by session |
| **Platforms** (default home) | `#/{orgId}/platforms` | Shipped — row cards + account setup drawer |
| **Queue** | `#/{orgId}/queue` | Shipped — read-only task list; optional `?ref=` / `?assetId=` |
| **History** | `#/{orgId}/history` | Shipped — read-only events; optional asset query |
| **Platform Queue / History** | `#/{orgId}/platforms/{slug}/queue` · `…/history` | Shipped |
| **Reports** | `#/{orgId}/reports` | Shipped — hub + 10 report detail pages |
| **Inventory** | `#/{orgId}/inventory` | Shipped — row cards, bulk edit, import |
| **Help** | `#/{orgId}/help` | Shipped |

**Legacy redirects:** `#/{id}/sync`, `/accounts` → `platforms`; `/insights` → `reports`. Old page files remain for reference but are not routed.

**Workflow story:** Sign in → pick organization → **Platforms** (connectivity home) → Queue / History for pending work and proof → Inventory for import and blockers. v4.7 workflow strip removed.

### Feature inventory (shipped)

- **Auth:** Login page, session cookie, global 401 → sign-in, sign-out in header, org access scoping
- **Platforms:** Connection state row cards, account setup in drawer, platform performance on rows, desktop list + detail split
- **Queue:** Cross-platform pending tasks, filters, situation line, task detail drawer (read-only — no approve/retry yet)
- **History:** Sync/publish events, filters, read-only drawer, link to Queue for remediation
- **Reports:** Full catalog (movement, readiness, throughput, demand, lifecycle, merchandising, velocity, etc.) on OpsRowCard layout
- **Inventory:** CSV import wizard, JSON/API ingest, snapshot dry-run review + commit, lifecycle filters, asset history, movement filters/sort, `AssetDetailPanel` + marketplace preview, bulk edit bar, ingress sources + run history
- **Copy layer:** `apps/web/src/lib/copy/operator.ts` + schema-driven vertical copy via `CategoryProvider`
- **Row actions:** Unified Details · Queue · History · Inventory labels; asset-scoped deep links via hash query
- **Knowledge base:** Bundled markdown articles, doc reader sheet, contextual help links

### Tech stack

- React + TypeScript + Vite, hash routing (`useOperatorRoute`), Tailwind CSS
- OpenAPI-generated SDK (`@auto-dealer/api-client`)
- Shared design tokens via `packages/design-tokens/` (imported in `apps/web/src/index.css`)
- Playwright E2E for portal JSON ingest; Vitest for component/unit tests

### UI architecture (current)

```
apps/web/src/
  pages/           LoginPage, DealerPicker, PlatformsPage, QueuePage, HistoryPage,
                   PlatformQueuePage, PlatformHistoryPage, InventoryPage, ReportsRouter, KnowledgeBasePage
  components/
    layout/        PageSituation, ControlBlock, OpsRowCard, RowDetailDrawer
    operator/      PageShell, OperatorNav, OperatorPage, SectionCard, StatusBadge, ErrorState
    platforms/     PlatformChannelList, PlatformDetailDrawer
    queue/         QueueListPanel, QueueDetailDrawer
    history/       HistoryListPanel, HistoryEventDrawer
    inventory/     InventoryAssetList, AssetDetailPanel, IngressPanel, SnapshotReviewCard, …
    reports/       ReportPageShell, ReportAssetList, ReportPlatformList, …
    generic/       FilterChips, SummaryStrip, BulkActionBar, WizardModal
    docs/          DocReaderSheet, InfoLabel, KnowledgeCatalog
  lib/
    copy/          operator.ts, vertical.ts, activeCategoryCopy.ts, verticalFromSchema.ts
    routes.ts      parseOperatorRoute, legacy segment redirects
    operatorNav.ts OPERATOR_TABS, row-action handlers
```

Route param is `dealerId` in code; user-facing copy uses **organization**.

### Design migration

Phase 0–1 of the shared design system is **shipped**:

| Area | Current state |
|------|---------------|
| `PageShell` | Navy chrome (`navy-950`), six-tab nav, sign-out |
| `Button` primary | Orange (`orange-600`) |
| `BulkActionBar` | Uses `btn-primary-operator` (Inventory) |
| `DealerPicker` | Navy gate, scoped org list |
| Design tokens | `packages/design-tokens/` consumed by both apps |
| Legacy drift | Emerald/slate/teal removed from `apps/web/src` |
| `docs/ui-status.md` | Tracks shipped IA and implementation status |

---

## Needed features

Grouped by priority. Backend capabilities noted where the API exists but UI does not.

### P0 — Pilot blockers

| Feature | Status | Notes |
|---------|--------|-------|
| **Login screen** | **Shipped** | `LoginPage` — email + password; session error states |
| **Logout + session identity** | **Shipped** | Header sign-out; `AuthContext` |
| **Dealer list scoping** | **Shipped** | Org picker filtered by session access |
| **401 / session expiry handling** | **Shipped** | SDK interceptor → `subscribeUnauthorized` → login |

### P1 — Design system completion

| Feature | Status | Notes |
|---------|--------|-------|
| **Emerald/slate purge** | **Shipped** | Navy + orange semantic tokens across operator UI |
| **`SectionCard` primitive** | **Shipped** | `components/operator/SectionCard.tsx` |
| **`statusRegistry` alignment** | **Mostly shipped** | Inventory/sync presentation uses registry; spot-check on new surfaces |
| **Doc reader accent update** | **Open** | KB link/chip accents — verify against shared design doc |
| **Update `docs/ui-status.md`** | **Ongoing** | Keep in sync when shipping new surfaces |

### P1 — Inventory & margin foundation

| Priority | Feature | Short description | Why it belongs |
|----------|---------|-------------------|----------------|
| P1 | **Inventory financial fields** | Acquisition cost, recon cost, list price, floor price | Starts DMS-lite value without deal/accounting bloat |
| P1 | **Asset lifecycle status** | Acquired, recon, ready, listed, pending, sold | Makes inventory the operational source of truth |
| P1 | **Sold outcome tracking** | Sold date, sold price, source platform | Needed for real platform ROI and days-to-sell |
| P1 | **Gross estimate** | Simple margin estimate per vehicle | High dealer value, low complexity |
| P1 | **Inventory aging board** | Aging by status, platform, price band | Turns analysis into daily workflow |

### P2 — Workflow polish

| Feature | Status | Notes |
|---------|--------|-------|
| **Per-section loading skeletons** | **Partial** | `PanelSkeleton` on list panels; some paths still full-page |
| **Per-section error boundaries** | **Open** | ErrorState per panel; not universal |
| **Queue visibility** | **Shipped** | Dedicated Queue page + platform drill-downs |
| **Queue approve / retry** | **Open** | Read-only queue UI; API wiring deferred |
| **Dry-run / import copy polish** | **Open** | Some panels still use engineer terms (see experience design doc) |
| **Reports integration** | **Shipped** | Hub + 10 reports replace Insights tab |
| **Keyboard / density pass** | **Partial** | Escape on modals; row-card focus states incomplete |
| **Queue sticky bulk bar** | **Open** | `BulkActionBar` on Inventory only |

### P2.5 — Inventory operations layer

Cross-cutting inventory capabilities that extend Operator Web toward DMS-lite without crossing into deal or accounting systems.

| Feature | Why | Boundary |
|---------|-----|----------|
| **Asset lifecycle status** | Lets operators track assets from intake to sold | Asset status only; no customer pipeline |
| **Cost basis fields** | Supports margin and pricing analysis | No accounting ledger |
| **Recon cost tracking** | Shows true vehicle investment | Simple totals, not vendor invoices |
| **Floor price / target price** | Helps publishing and pricing decisions | Internal vehicle field only |
| **Sold outcome tracking** | Enables platform ROI and benchmark accuracy | Sold source + date + price only |
| **Document attachments** | Keeps vehicle files near inventory | Storage only; no legal form generation |
| **Internal vehicle notes** | Supports operator handoff | Vehicle-scoped, not buyer-scoped |
| **Profit-per-day metric** | Turns inventory aging into business value | Derived metric, not accounting system |

**P2 depth — additional inventory features:**

| Priority | Feature | Short description | Why it belongs |
|----------|---------|-------------------|----------------|
| P2 | **Recon / readiness checklist** | Photos, title, inspection, detail, price, description | Bridges DMS operations and publishing readiness |
| P2 | **Document attachments** | Title, bill of sale, inspection, recon docs | DMS-lite utility, not full forms system |
| P2 | **Internal vehicle notes** | Staff notes per vehicle | Useful, but keep vehicle-scoped only |
| P2 | **Platform attribution ledger** | Views, leads, clicks, sold source history | Strengthens the actual wedge |
| P2 | **Profit-per-day metric** | Gross estimate divided by days held | Strong BI differentiator |

### P3 — Post-pilot enhancements (proposed, not committed)

| Priority | Feature | Short description | Why it belongs / boundary |
|----------|---------|-------------------|---------------------------|
| P3 | **Publish approval queue UI** | NEEDS_APPROVAL dispatch items | Sync sub-panel; no raw queue IDs by default |
| P3 | **Feed artifact download links** | Read-only proof file access | CLI remains primary export path |
| P3 | **Multi-instance rate-limit awareness** | Stale refresh banner | Ops concern when running multiple processes |
| P3 | **Light lead handoff** | Source, contact, assigned destination, status | Attribution/handoff only — not CRM |
| P3 | **QuickBooks export** | Export sales/cost summary | Integrate with accounting; do not build accounting |
| P3 | **Deal packet export** | Download vehicle docs + sale summary | DMS pressure without becoming F&I |
| P3 | **Audit timeline** | Who changed vehicle/account/publish state | Read-only; fits operator control model |

### Scope boundary

**Operator Web may own:** vehicle lifecycle, inventory cost context, publishing readiness, platform attribution, and sold outcome tracking.

**Operator Web must not own:** customer relationship management, deal financing, lender workflows, accounting ledgers, BHPH servicing, or service-department operations.

Per product boundaries in `docs/handoff.md`, also out of scope:

- Lead inbox, customer records, buyer-scoped notes, pipeline stages
- Credential storage or token entry in browser
- Dealer creation / onboarding wizard
- Full analytics product (Insights stays reference summary)
- Marketplace consumer browse (preview embed only)

### Feature decision guardrails

Use this table when evaluating feature requests. Default to **reject or defer** unless the request clearly maps to Build or Allow.

| Feature request asks for… | Decision | Reason |
|---------------------------|----------|--------|
| Vehicle status, readiness, cost, margin, aging | **Build** | Core inventory operations |
| Platform publishing, sync state, attribution | **Build** | Core product wedge |
| Sold date, sold price, sold source | **Build** | Required for ROI and benchmarks |
| Dealer notes attached to vehicle | **Build** | Vehicle-scoped ops |
| Buyer contact history | **Reject / defer** | CRM drift |
| Salesperson pipeline stages | **Reject / defer** | CRM drift |
| Credit app, lender decision, F&I menu | **Reject** | Compliance / F&I trap |
| Payment schedule / collections | **Reject** | BHPH servicing trap |
| General ledger / reconciliation | **Reject** | Accounting trap |
| Export to QuickBooks / CSV | **Allow** | Integration, not accounting ownership |

---

## Final design

### Global layout pattern

**Final layout rule:** Every core page is a **searchable, filterable, sortable list of operational row cards**.

- **Platforms** → connection state per site  
- **Queue** → editable pending work  
- **History** → read-only transaction proof and performance  

Mobile-first does **not** mean mobile-only. On desktop, use width for **multi-column row cards** or a **list + detail pane** — never a wide sparse table as the default.

**Clarity rule** (from [experience design](./2026-06-06-operator-web-experience-design.md)): situation → needed action → details progressively.

Every core page follows the same five layers:

```
1. Page situation     — headline + one plain sentence
2. Control block      — search · filter · sort (shared component)
3. Row-card list      — operational rows, tap to open detail
4. Row detail         — modal (mobile) or drawer / side pane (desktop)
5. Sticky bottom bar  — when editing or multi-select (Queue, Inventory)
```

**Shared control block** — identical placement and behavior on Platforms, Queue, History, Platform Queue, Platform History, Inventory, Reports:

| Control | Behavior |
|---------|----------|
| Search | Context-specific placeholder per page |
| Filter | Chip row + “More filters” sheet |
| Sort | Dropdown: status, recent, name, urgency |
| Refresh | Optional; shows last updated |

### Global layout (chrome)

Every authenticated dealer-scoped page shares **PageShell**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ STICKY HEADER (navy-950) · dealer name · [user · Log out]               │
│  Platforms | Queue | History | Reports | Inventory | Help               │
├──────────────────────────────────────────────────────────────────────────┤
│ 1. PAGE SITUATION                                                        │
│ 2. SEARCH / FILTER / SORT                                                │
│ 3. ROW-CARD LIST (scroll)                                                │
│ 4. (drawer/modal when row open)                                          │
│ 5. (sticky bottom bar when editing)                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

Remove the v4.7 **workflow strip** (Inventory → Accounts → Sync) from primary chrome — platform sync *is* the workflow. Cross-links live in row actions (“Fix in Inventory”, “Open queue”).

**Default landing:** `#/{orgId}/platforms` (Platform Status List). Route param is `dealerId` in code; UI copy says **organization**.

---

### Screen specifications — core five

#### 1. Platforms (Platform Status List)

**Goal:** Show every listing platform — connected or not, what is moving, where to act.

**Situation examples:**

- “14 of 18 sites connected · 2 need setup · 1 updating”
- “All sites connected — 3 cars waiting to post”

**Row card (one per platform):**

| Zone | Content |
|------|---------|
| Lead | Platform name + logo/icon |
| Status | Inactive · Connected · Blocked · Updating |
| Meta | Last sync · N cars live · N pending |
| Action | “Fix setup” · “Open queue” · “View history” |

**Row detail (drawer):** Account state, account ID, rep contact, next step, blockers, link to **Platform Queue** and **Platform History**.

**Filters:** All · Connected · Setup needed · Blocked · Updating

#### 2. Site Queue

**Goal:** Edit all pending posting / update / removal tasks **across** platforms.

**Situation:** “12 tasks waiting · 3 need your approval · 2 failed”

**Row card (one per task):**

| Zone | Content |
|------|---------|
| Lead | Vehicle (year/make/model) or batch label |
| Task | Post · Update · Remove |
| Platform | Target site(s) |
| Status | Scheduled · Needs approval · Failed · Blocked |
| Action | Approve · Retry · Edit · Cancel |

**Sticky bottom bar:** Bulk approve · Bulk retry · Clear selection

**Row detail:** Payload preview, validation issues, platform-specific errors, timestamps.

#### 3. Site History

**Goal:** Review every asset transaction and performance signal **across** platforms.

**Situation:** “Last 7 days · 48 posts sent · 2 failures · 31 leads recorded”

**Row card (one per event or grouped batch):**

| Zone | Content |
|------|---------|
| Lead | What happened (posted / updated / removed / failed) |
| When | Relative + absolute timestamp |
| Platform | Site name |
| Vehicle | Stock # + identity |
| Signal | Views · leads · outcome if sold |

Read-only — no edit actions. Link to **Platform History** for site-specific drill-down.

**Filters:** Event type · Platform · Date range · Success / failed

#### 4. Platform Queue (drill-down)

**Goal:** Manage posting strategy and pending work for **one** platform.

**Entry:** From Platforms row → “Open queue”, or `#/{dealerId}/platforms/{slug}/queue`

**Situation:** “Google Vehicle Ads · 4 waiting · 1 needs approval”

Same row-card + control block as Site Queue, **pre-filtered to one platform**. Optional strategy strip: posting rules, schedule, approval policy (read-mostly in v1).

#### 5. Platform History (drill-down)

**Goal:** What happened and how inventory performed on **one** platform.

**Entry:** From Platforms row → “View history”, or `#/{dealerId}/platforms/{slug}/history`

**Situation:** “Facebook Marketplace · 120 posts this month · 18 leads · avg 14 days to move”

Row cards: transactions + performance snippets. Charts optional in **Reports** — this page stays event/list proof.

---

### Supporting screens

#### Inventory

Same global row-card pattern (not table-first). Rows = vehicles; detail drawer = blockers, sales pace, marketplace preview, cost fields (future).

Feeds and import live in a collapsible **Add inventory** section above the list — not competing with Platforms for nav prominence.

#### Reports

**Shipped:** Hub + 10 report detail pages (movement, readiness, throughput, demand, lifecycle, merchandising, velocity, etc.) on OpsRowCard layout. Action vs management groupings. Links back to Platforms / History / Inventory.

#### Help

Knowledge base — standalone or in-shell. Unchanged warm doc reader.

#### Admin: Dealer Picker · Support View · Audit

Dealer Picker remains dark gate. Support View and Audit are admin-role surfaces — not in dealer nav.

---

### Visual identity

Unchanged from [UI design system](./2026-06-06-ui-design-system-design.md): navy chrome, orange CTAs, compact density, shared status semantics.

### Component library (shipped)

| Component | Role | Status |
|-----------|------|--------|
| `PageShell` | Navy header + nav + sign-out | Shipped |
| `PageSituation` | Headline + one-line status sentence | Shipped |
| `ControlBlock` | Shared search / filter / sort / refresh | Shipped |
| `OpsRowCard` | Primary list unit — lead, status, meta, row actions | Shipped |
| `RowDetailDrawer` | Sticky side pane on desktop; overlay on mobile | Shipped |
| `BulkActionBar` | Bottom bar for bulk edit (Inventory) | Shipped (Inventory only) |
| `StatusBadge` | From `statusRegistry` — plain words, not codes | Shipped |
| `FilterChips` | Horizontal filters with counts | Shipped |
| `PanelSkeleton` | Row-card loading shapes | Shipped |

**Deprioritized:** `DataTable` as default layout — removed from Inventory; retain only where admin/export needs it.

**v4.7 migration complete:** platform list → `PlatformChannelList` · publish queue API → `QueueListPanel` · sync events → `HistoryListPanel` · account inline edit → `PlatformDetailDrawer`.

---

### Interaction patterns

| Pattern | Behavior |
|---------|----------|
| **Row tap → detail** | Primary navigation into depth; no inline expand on desktop tables |
| **Cross-page fixes** | Platform row “Fix setup” → Inventory or account fields in drawer |
| **Queue edits** | Sticky bottom bar for bulk approve / retry — **not yet wired** (queue is read-only) |
| **History is read-only** | Link forward to Queue for remediation |
| **Platform drill-down** | Platforms → Platform Queue / Platform History preserves filter context |
| **Explicit danger** | Approve removal, bulk cancel — confirm with plain label |
| **Refresh discipline** | Per-page refresh in control block; show last updated |

---

### Relationship to Marketplace

| Concern | Operator | Marketplace |
|---------|----------|-------------|
| Job | Manage platform sync & queue | Browse & inquire |
| Chrome | Dark navy · platform nav | Light white header |
| Primary list | Operational row cards | Photo cards |
| Home screen | Platform Status List | Vehicle feed |

Operator embeds marketplace preview in Inventory — the only intentional visual overlap.

---

## Implementation phases

| Phase | Scope | Status |
|-------|-------|--------|
| **A — Auth UI** | Login, session, 401, scoped org picker | **Shipped** |
| **B — Design migration** | Token purge, `SectionCard`, navy/orange chrome | **Shipped** |
| **C — IA restructure** | Platforms · Queue · History · Reports · Inventory · Help; legacy redirects | **Shipped** |
| **D — Row-card layout** | `PageSituation`, `ControlBlock`, `OpsRowCard`, `RowDetailDrawer`; Inventory off `DataTable` | **Shipped** |
| **E — Reports catalog** | Hub + 10 report pages on row-card layout | **Shipped** |
| **F — Copy + verticals** | `operator.ts`, `CategoryProvider`, schema-driven labels | **Mostly shipped** — engineer terms remain in some import panels |
| **G — Inventory ops layer** | Financial fields, lifecycle, sold outcomes, aging board | **Not started** |
| **H — Queue actions** | Approve, retry, bulk bar on Queue | **Not started** |
| **I — Post-pilot (P3)** | QuickBooks export, deal packet, audit timeline, support view | **Proposed** |

---

## Success criteria

### Platform core

- [x] Organization lands on **Platforms** after pick — channels visible as row cards with connection state
- [x] **Queue** shows cross-platform pending post/update/remove tasks
- [ ] **Queue** bulk approve / retry works — read-only today
- [x] **History** shows read-only transaction proof + performance signals across channels
- [x] **Platform Queue** and **Platform History** drill-downs work per site
- [x] All core pages use: situation → control block → row-card list → drawer detail
- [x] Nav matches: Platforms · Queue · History · Reports · Inventory · Help
- [x] Asset-scoped deep links (`?ref=` / `?assetId=`) from row actions

### Foundation

- [x] Zero emerald/teal brand usage in operator chrome
- [~] Plain-language status on every row — shell copy shipped; some import/ingest panels still use engineer terms
- [x] Inventory available as supporting input — row-card layout (`AssetDetailPanel`)
- [x] No customer pipeline, F&I, accounting ledger, or BHPH servicing in Operator Web
- [ ] Platform ROI uses sold outcomes when captured — reports exist; sold-outcome capture not built

---

## Next step

1. **Copy pass (Phase F)** — finish plain-language labels on import/ingest panels per [experience design](./2026-06-06-operator-web-experience-design.md)
2. **Queue actions (Phase H)** — wire approve/retry + sticky bulk bar
3. **Inventory ops (Phase G)** — financial fields, sold outcomes, aging board

Live tracking: [ui-status.md](../ui-status.md)
