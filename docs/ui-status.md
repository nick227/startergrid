# UI Status — Operator Console

**Updated:** 2026-06-05  
**Audience:** Project team (engineering, design, onboarding)  
**Location:** `docs/` — internal repo documentation only

---

## Documentation split

| Location | Purpose | Audience |
|----------|---------|----------|
| **`docs/`** (this file) | Project status, architecture notes, handoff, roadmaps | Team |
| **`apps/web/src/docs/`** | Knowledge base articles bundled into the app | Client-facing education (dealers, operator staff using the product) |

Do not put internal build notes, file paths, or implementation status in the KB. KB articles follow the editorial guide at `apps/web/src/docs/_editorial.md` (voice, frontmatter, no dev jargon).

The in-app **Knowledge base** screen and **doc reader** sheet surface KB content. **InfoLabel** / **InfoButton** links in the UI open those articles — they are product education, not this document.

---

## What this app is

The **Operator Console** (`apps/web/`) is the web front end for the Auto Dealer Sales Portal (v4). Syndication and onboarding staff pick a rooftop and work a three-step workflow:

1. **Inventory** — import vehicles, fix validation issues, bulk-edit fields  
2. **Platform Accounts** — resolve account states that block publishing  
3. **Sync** — see readiness, platform outcomes, and auto-sync status  
4. **Insights** — reference summary of cached movement benchmarks (not the primary workflow)

**v4.1 — Movement benchmarks in workflow:** Inventory is the primary surface (`Days / Signal`: `12 days · Similar avg 19 · Fast`). Sync adds a small movement line under readiness tiles. Platform rows show observed assists and avg move time when useful. No page loads benchmarks automatically — operators refresh on Sync or Insights when needed.

**v4.2 — Vehicle detail panel (Inventory):** Expand any inventory row (▼) to open a two-column panel on large screens (stacked on narrow). Left column: readiness issues, movement vs similar stock, platform movement comparison. Right column: **marketplace listing preview** loaded via `@dealer-marketplace/client` SDK — consumer-safe fields only; operator-only banner when not eligible. Movement signal filters and sort compose with readiness chips and search.

The UI reads and writes the same backend API that powers the CLI pipeline (18 platforms, feed generation, MySQL persistence). Hash-routed SPA optimized for staff who already know DMS and syndication terms.

---

## Visual identity

| Element | Treatment |
|--------|-----------|
| **Page background** | Light cool gray `#f4f6f8` |
| **Primary chrome** | Dark slate header (`slate-950`), sticky, full width |
| **Accent** | Emerald → teal gradient (logo tile, primary CTAs, success states) |
| **Surfaces** | White cards with `rounded-2xl`, light `slate-200` borders, subtle shadow |
| **Typography** | Sans-serif UI (system/Tailwind defaults); serif in KB prose and doc reader |
| **Density** | Compact operator UI — `text-xs`/`text-sm` labels, uppercase section headers with wide tracking |
| **Status color** | Emerald = ready/success, amber = warning, red = blocked, sky = in-progress/sync |

**Dealer picker** breaks the pattern: full-viewport dark (`slate-950`) with a centered white card — a gate before the light workspace.

**Doc reader** (KB articles only): warm paper (`#f9f7f4`), Georgia serif body, bottom sheet (~75vh max).

---

## Routing

Hash-based routes (no React Router):

| URL | Screen |
|-----|--------|
| `#/` (empty hash) | Dealer picker |
| `#/knowledge` | Knowledge base (standalone, no dealer) |
| `#/{dealerId}` | Sync (default tab) |
| `#/{dealerId}/inventory` | Inventory |
| `#/{dealerId}/accounts` | Platform accounts |
| `#/{dealerId}/knowledge` | Knowledge base (inside operator shell) |

Selecting a dealer sets `#/{dealerId}` and lands on **Sync**.

---

## Global layout (operator pages)

Every dealer-scoped page shares **PageShell**:

```
┌─────────────────────────────────────────────────────────────────┐
│ STICKY HEADER (slate-950, white text)                          │
│  [📡 gradient tile]  Dealer legal name                          │
│                      dealer-id (mono, xs)                       │
│                      section label                              │
│                                                                 │
│  Workflow strip:  ① Inventory → ② Accounts → ③ Sync            │
│  Tab nav pill:    [ Sync | Inventory | Accounts ]               │
│                                                                 │
│  ← Change dealer · Knowledge base     Updated 3:42 PM [Refresh] │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ MAIN (max-w-7xl, padded)                                        │
│   page content…                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- **Workflow strip** — numbered steps with hints (“Import & clean”, “Resolve blockers”, “Push to platforms”). Active step: emerald circle; completed: dimmed slate.
- **Tab nav** — segmented control on dark background; active tab is white pill.
- **Refresh** — optional per page; shows last refresh time when idle.

---

## Screens

### 1. Dealer picker

**Purpose:** Choose which rooftop to operate on.

**Look:**
- Centered card on dark background
- Emerald gradient 📡 icon + “Operator Console” title
- Search field filters dealer list by name or ID
- Scrollable list rows: legal name, optional DBA, mono ID
- Footer link to knowledge base; manual “paste dealer ID” input with Open button

**States:** skeleton rows while loading; inline error with retry if API is down.

---

### 2. Sync (default home)

**Purpose:** Answer “Can we publish right now?” and surface blockers.

**Look:** Narrow column (`max-w-4xl`), stacked sections:

1. **SyncHero** — Large gradient banner (color reflects state):
   - Green/teal — healthy auto-sync
   - Sky/indigo — sync running or scheduled
   - Amber/orange — inventory blockers
   - Red/rose — failed sync  
   Headline, subline, optional white “fix” CTA.

2. **SyncSummaryStrip** — 2×2 grid (4 cols on large screens): cars ready/blocked, platforms ready/blocked. Color-tinted tiles with large numbers and KB-linked labels.

3. **SyncInventoryPeek** — Blocked vehicle preview with link to inventory.

4. **SyncPlatformList** — All 18 platforms: status pill, name, detail line, “Fix →” when accounts block.

5. **LastSyncLine** — Recent sync event history.

**Interaction:** Hero and platform rows deep-link to Inventory or Accounts when fixes are needed.

---

### 3. Inventory

**Purpose:** Import stock, filter by readiness/issues, bulk-edit, track ingress runs.

**Look:**

- **Page header** — title, KB info button, subtitle; green “N ready — Sync →” when applicable
- **Header action** — “Import CSV” (emerald) with KB link
- **IngressPanel** — Feed sources and recent ingress run impact chips
- **Summary strip** — total, ready, warning, blocked (clickable)
- **Filters card** — Readiness + issue-type chips; **movement signal** chips (scoped to current readiness/search)
- **Import history** — Collapsible batch list
- **Search + sort** — stock #, VIN, make, model; sort by movement signal, days online, price, etc.
- **Data table** — selectable rows; **expand (▼) opens vehicle detail panel** (not a separate route)
- **Vehicle detail panel** — operator movement context + marketplace consumer preview (no VIN/performance in preview)
- **Bulk action bar** — fixed bottom bar when rows selected
- **Callouts** — amber cleanup warning; green ready-for-publishing CTA

**Empty state:** 📦 “No inventory yet”, Import + Skip to sync.

**Modals:** CSV import wizard (upload → mapping → preview → commit).

---

### 4. Platform accounts

**Purpose:** View and edit per-platform account state, IDs, reps, next actions.

**Look:**

- **Page header** + KB link
- **Danger callout** when accounts block publishing
- **Summary strip** — six metrics, clickable to filter
- **Filter chips** — ALL, ACTIVE, NEEDS_SETUP, PENDING_REVIEW, BLOCKED, PARTNER_REQUIRED
- **Search** — platform name, slug, account ID
- **Custom grid table** — Platform, State, Account ID, Next Action Owner, Last Checked; integration class badges; red tint on blocking rows
- **Inline expand form** — state, account ID, membership, rep contact, next action, notes

**Footer note:** Blocked/suspended/partner-required semantics; credentials live outside the portal.

---

### 5. Knowledge base (client-facing)

**Purpose:** Searchable library of **client education** articles (`apps/web/src/docs/*.md`), not project docs.

**Two modes:**
- **Standalone** (`#/knowledge`) — light gray page, back link, no operator header
- **In-context** — same catalog inside PageShell from a dealer session

**Look:** “Reference library” eyebrow, serif intro, search + category tables (Title | Summary | Updated). Row click opens doc reader sheet.

---

## Doc reader overlay

Bottom sheet for **KB articles only** (`DocReaderSheet`):

- Opened from InfoLabel/InfoButton in the UI or KB catalog rows
- Dimmed backdrop, warm paper sheet, serif prose, Escape to close

---

## Shared UI patterns

| Pattern | Where used |
|--------|------------|
| **SectionCard** | White bordered panels with optional title/subtitle |
| **SummaryStrip** | Clickable metric tiles |
| **FilterChips** | Horizontal pill filters |
| **InlineCallout** | Info / warning / success / danger banners |
| **Banner** | Dismissible success/error toasts |
| **EmptyState** | Centered icon + title + actions |
| **Skeleton** | Loading placeholders |
| **ErrorState** | Full-panel error with retry |
| **StatusBadge / AccountStateBadge** | Colors from `statusRegistry` |

Form inputs: `.field-input` (white, `rounded-xl`, emerald focus ring). Primary CTAs: `bg-emerald-600`.

---

## Operator workflow (visual story)

```
Dealer Picker  →  Inventory  →  Accounts  →  Sync
   (dark)         (import)      (fix gaps)    (status)
                      │              │            │
                      └──────────────┴────────────┘
                           cross-links & CTAs
```

The UI steers forward when readiness allows and backward when blockers exist. Workflow strip and tab nav reinforce the sequence.

---

## Tech stack (UI)

- React + TypeScript + Vite (`apps/web/`)
- Tailwind CSS
- Hash routing via `useOperatorRoute`
- OpenAPI-generated client
- KB markdown bundled at build time from `apps/web/src/docs/`

Run locally: `npm run ui:dev` (API on port 3000).

---

## Implementation status

| Area | Status |
|------|--------|
| Dealer picker | Complete |
| Sync dashboard | Complete |
| Inventory list, filters, bulk edit | Complete |
| CSV import wizard | Complete |
| Ingress sources / run history | Complete |
| Snapshot review + commit (v4.5) | Complete |
| Lifecycle filters + vehicle history (v4.5) | Complete |
| Benchmark freshness bar on Inventory (v4.5) | Complete |
| Inventory walkthrough banner (v4.5) | Complete |
| Portal JSON/API ingest panel (v4.6) | Complete |
| JSON ingest release hardening — E2E, docs, client polish (v4.6.1) | Complete |
| Platform accounts list + inline edit | Complete |
| Knowledge base catalog + reader | Complete |
| Contextual KB links (InfoLabel/InfoButton) | Complete |
| PublishConsole page file | Legacy alias — re-exports `SyncPage` |

---

## Not in scope (UI)

- Authentication / role-based views (dev auth only on API)
- Credential storage or token entry
- Direct feed file download from UI (CLI/export path)
- Dealer creation or onboarding wizard in the browser

These remain CLI/backend concerns in v4.
