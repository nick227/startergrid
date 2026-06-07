# Operator Web — Design Plan

**Created:** 2026-06-06  
**Updated:** 2026-06-06 — channel operations console (multi-vertical shell, cars-first)  
**Status:** Approved direction — Sprint 1 shipped; vertical adapter extraction deferred  
**Related:** [channel console architecture](./2026-06-06-operator-channel-console-architecture.md) · [2026-06-06-ui-design-system-design.md](./2026-06-06-ui-design-system-design.md) · [2026-06-06-operator-web-experience-design.md](./2026-06-06-operator-web-experience-design.md) · [UI roadmap](./2026-06-06-operator-web-ui-roadmap.md)

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

- `#/{dealerId}/platforms/{platformSlug}/queue` → Platform Queue (#4)
- `#/{dealerId}/platforms/{platformSlug}/history` → Platform History (#5)

**Admin-only** (separate shell or role-gated):

| Nav item | Purpose |
|----------|---------|
| **Dealer Picker** | Choose rooftop |
| **Support View** | Cross-dealer diagnostics (internal) |
| **Audit** | Who changed vehicle / account / publish state |

### Legacy mapping (v4.7 → target IA)

Current shipped UI maps to the new model as follows:

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

### Product (v4.7)

Functional operator workflow across five dealer-scoped tabs plus a gate screen:

| Screen | Route | Status |
|--------|-------|--------|
| Dealer picker | `#/` | Complete |
| Sync (default home) | `#/{dealerId}` | Complete |
| Inventory | `#/{dealerId}/inventory` | Complete |
| Platform accounts | `#/{dealerId}/accounts` | Complete |
| Insights | `#/{dealerId}/insights` | Complete (reference-only) |
| Knowledge base | `#/knowledge`, `#/{dealerId}/knowledge` | Complete |

**Workflow story:** Dealer picker (dark gate) → Inventory (import & clean) → Accounts (resolve blockers) → Sync (push & monitor). Cross-links and fix CTAs steer operators forward when ready and backward when blocked.

### Feature inventory (shipped)

- **Inventory:** CSV import wizard, portal JSON/API ingest, snapshot dry-run review + explicit commit, lifecycle filters + vehicle history, movement signal filters/sort, expandable vehicle detail panel, bulk edit bar, ingress sources + run history, API source snapshot polling (v4.7)
- **Sync:** State-driven hero banner, readiness summary strip, blocked inventory peek, 18-platform list with fix deep-links, last sync line, movement context on platform rows
- **Accounts:** Summary metrics, filter chips, searchable grid, inline expand/edit per platform
- **Insights:** Cached movement benchmark reference (not on critical path)
- **Vehicle detail panel:** Operator movement context + marketplace consumer preview via `@dealer-marketplace/client` (operator-only ineligibility banner; no VIN in preview)
- **Knowledge base:** Bundled markdown articles, doc reader sheet, contextual InfoLabel/InfoButton links throughout workflow screens
- **Performance intelligence:** Movement benchmarks embedded in Inventory and Sync; channel metrics on platform rows where available

### Tech stack

- React + TypeScript + Vite, hash routing (`useOperatorRoute`), Tailwind CSS
- OpenAPI-generated SDK (`@auto-dealer/api-client`)
- Shared design tokens via `packages/design-tokens/` (imported in `apps/web/src/index.css`)
- Playwright E2E for portal JSON ingest; Vitest for component/unit tests

### UI architecture (current)

```
apps/web/src/
  pages/           DealerPicker, SyncPage, InventoryPage, AccountManagementPage, InsightsPage, KnowledgeBasePage
  components/
    operator/      PageShell, WorkflowStrip, OperatorNav, PageHeader, StatusBadge, ErrorState
    generic/       DataTable, FilterChips, SummaryStrip, BulkActionBar, WizardModal
    sync/          SyncHero, SyncSummaryStrip, SyncPlatformList, …
    inventory/     IngressPanel, VehicleDetailPanel, SnapshotReviewCard, JsonIngestPanel, …
    ui/            Button, Card, Badge, Modal, Select, Skeleton
    docs/          DocReaderSheet, InfoLabel, KnowledgeCatalog
  lib/             statusRegistry, syncPresentation, operatorNav, routes
```

### Design migration (partial)

Phase 0–1 of the shared design system is **in progress**:

| Area | Current state |
|------|---------------|
| `PageShell` | Navy chrome (`navy-950`), workflow strip active step orange |
| `Button` primary | Orange (`orange-600`) |
| `BulkActionBar` | Uses `btn-primary-operator` |
| `SyncHero` | Navy/orange/red gradients — emerald removed from hero |
| `DealerPicker` | Navy gate, navy gradient logo tile |
| Design tokens | `packages/design-tokens/` consumed by both apps |
| Legacy drift | ~40 files still reference `emerald-*`, `slate-*`, or `teal-*` in feature components |
| `docs/ui-status.md` | Describes old emerald/teal identity — out of date |

---

## Needed features

Grouped by priority. Backend capabilities noted where the API exists but UI does not.

### P0 — Pilot blockers

| Feature | Why | Notes |
|---------|-----|-------|
| **Login screen** | Production auth API exists (`POST /api/auth/login`, `op_session` cookie); no UI | Gate before dealer picker; email + password; session error states |
| **Logout + session identity** | Operators need to sign out and see who they are | Header affordance; call `POST /api/auth/logout`; handle 401 globally |
| **Dealer list scoping** | `dealerAccessIds` from session should filter picker | Hide/degrade manual ID paste for scoped operators |
| **401 / session expiry handling** | Unauthenticated API calls should redirect to login | Central fetch wrapper or SDK interceptor |

### P1 — Design system completion

| Feature | Why | Notes |
|---------|-----|-------|
| **Emerald/slate purge** | Visual inconsistency vs approved navy/orange system | Migrate remaining ~40 files; green only via `statusRegistry` |
| **`SectionCard` primitive** | Operator uses ad-hoc `Card` + inline borders | Unified `surface-card-operator`, optional title/subtitle, compact padding |
| **`statusRegistry` alignment** | Single source for all badge/callout colors | Replace inline color maps in inventory/sync components |
| **Doc reader accent update** | KB links still use emerald in places | Navy/blue-cta-light per shared design doc; keep warm paper prose |
| **Update `docs/ui-status.md`** | Team doc reflects final identity | Mirror this plan’s visual section |

### P1 — Inventory & margin foundation

| Priority | Feature | Short description | Why it belongs |
|----------|---------|-------------------|----------------|
| P1 | **Inventory financial fields** | Acquisition cost, recon cost, list price, floor price | Starts DMS-lite value without deal/accounting bloat |
| P1 | **Vehicle lifecycle status** | Acquired, recon, ready, listed, pending, sold | Makes inventory the operational source of truth |
| P1 | **Sold outcome tracking** | Sold date, sold price, source platform | Needed for real platform ROI and days-to-sell |
| P1 | **Gross estimate** | Simple margin estimate per vehicle | High dealer value, low complexity |
| P1 | **Inventory aging board** | Aging by status, platform, price band | Turns analysis into daily workflow |

### P2 — Workflow polish

| Feature | Why | Notes |
|---------|-----|-------|
| **Per-section loading skeletons** | Full-page spinner on some paths | Match Sync/Inventory section shapes |
| **Per-section error boundaries** | One failed panel shouldn’t blank the page | Retry per panel; keep header chrome |
| **Sync queue visibility** | Operators need scheduled/pending dispatch context | `GET /api/dealers/:id/publish/queue` — backend service exists; UI panel on Sync |
| **Prepare / dry-run modal polish** | Exists but copy and states could match final design | Align with SyncHero tone semantics |
| **Insights tab integration** | Fourth tab feels secondary | Clear “reference only” eyebrow; link back to Inventory movement filters |
| **Keyboard / density pass** | Desktop program expectation | Tab order on tables, Escape on modals (partial today), compact row focus states |

### P2.5 — Inventory operations layer

Cross-cutting inventory capabilities that extend Operator Web toward DMS-lite without crossing into deal or accounting systems.

| Feature | Why | Boundary |
|---------|-----|----------|
| **Vehicle lifecycle status** | Lets operators track vehicles from intake to sold | Vehicle status only; no customer pipeline |
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

**Default landing:** `#/{dealerId}/platforms` (Platform Status List).

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

Roll-up views fed by Site History + sold outcomes. Reference-only eyebrow. Links back to Platforms / History.

#### Help

Knowledge base — standalone or in-shell. Unchanged warm doc reader.

#### Admin: Dealer Picker · Support View · Audit

Dealer Picker remains dark gate. Support View and Audit are admin-role surfaces — not in dealer nav.

---

### Visual identity

Unchanged from [UI design system](./2026-06-06-ui-design-system-design.md): navy chrome, orange CTAs, compact density, shared status semantics.

### Component library (target state)

| Component | Role |
|-----------|------|
| `PageShell` | Navy header + dealer nav (Platforms, Queue, History, Reports, Inventory, Help) |
| `PageSituation` | Headline + one-line status sentence |
| `ControlBlock` | Shared search / filter / sort / refresh |
| `OperationalRowCard` | Primary list unit — lead, status, meta, action |
| `RowDetailDrawer` | Desktop side pane; full-screen sheet on mobile |
| `StickyActionBar` | Bottom bar for bulk edit / approve (Queue, Inventory) |
| `StatusBadge` | From `statusRegistry` — plain words, not codes |
| `FilterChips` | Horizontal filters with counts |
| `Button` | Orange primary, compact |
| `EmptyState` / `ErrorState` / `Skeleton` | Match row-card shapes |

**Deprioritize:** `DataTable` as default layout — retain for admin/audit export views only.

**Reuse from v4.7 during migration:** `SyncPlatformList` → Platforms rows · publish queue API → Queue rows · `LastSyncLine` → History rows · account inline edit → Platform row detail.

---

### Interaction patterns

| Pattern | Behavior |
|---------|----------|
| **Row tap → detail** | Primary navigation into depth; no inline expand on desktop tables |
| **Cross-page fixes** | Platform row “Fix setup” → Inventory or account fields in drawer |
| **Queue edits** | Sticky bottom bar for bulk approve / retry |
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

### Phase A — Auth UI (P0)

1. Login page + route guard (unauthenticated → login)
2. Session bootstrap on app load (`GET /api/auth/me`)
3. Logout control in header
4. Global 401 handler → login with return path
5. Dealer picker filtered by `dealerAccessIds`

### Phase B — Design migration (P1)

1. Purge `emerald-*` / `slate-*` / `teal-*` from `apps/web/src/components/**`
2. Introduce operator `SectionCard`; migrate inline card wrappers
3. Align `SyncSummaryStrip`, `IngressPanel`, import wizard, Insights to tokens
4. Update doc reader link/chip accents
5. Refresh `docs/ui-status.md`

### Phase C — IA restructure (P0 product)

1. New nav: Platforms · Queue · History · Reports · Inventory · Help
2. **Platforms** page — row cards from existing platform list + account state
3. **Queue** page — wire `GET /api/dealers/:id/publish/queue`
4. **History** page — sync events + performance signals as row cards
5. Platform drill routes: `{slug}/queue`, `{slug}/history`
6. Default landing → Platforms; deprecate Sync/Accounts/Insights tabs

### Phase D — Row-card layout system (P1 UX)

1. `PageSituation`, `ControlBlock`, `OperationalRowCard`, `RowDetailDrawer`
2. Migrate Inventory from `DataTable` to row cards
3. Responsive: drawer on desktop, full-screen sheet on narrow viewports
4. Remove workflow strip from chrome

### Phase E — Design migration (P1 visual)

1. Token purge (emerald/slate)
2. Update `docs/ui-status.md`

### Phase F — Inventory operations layer (as scoped)

Financial fields, lifecycle, sold outcomes — row detail in Inventory, performance in Reports/History.

### Phase G — Post-pilot (P3)

Auth UI, QuickBooks export, deal packet, audit timeline, support view.

---

## Success criteria

### Platform core (new)

- [ ] Dealer lands on **Platforms** after pick — 18+ sites visible as row cards with connection state
- [ ] **Queue** shows cross-platform pending post/update/remove tasks; bulk approve works
- [ ] **History** shows read-only transaction proof + performance signals across sites
- [ ] **Platform Queue** and **Platform History** drill-downs work per site
- [ ] All core pages use: situation → control block → row-card list → drawer detail
- [ ] Nav matches: Platforms · Queue · History · Reports · Inventory · Help

### Foundation (carried forward)

- [ ] Zero emerald/teal brand usage in operator chrome
- [ ] Plain-language status on every row (experience design doc)
- [ ] Inventory remains available as supporting input — row-card layout
- [ ] No customer pipeline, F&I, accounting ledger, or BHPH servicing in Operator Web
- [ ] Platform ROI uses sold outcomes when captured (Reports / History)

---

## Next step

Execute **Phase C (IA restructure)** — ship **Platforms** row-card page by composing existing `SyncPlatformList` + account data, then **Queue** from publish queue API. Layout primitives (Phase D) can land in the same sprint as Platforms.
