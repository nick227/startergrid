# Operator Web — Experience & Language Design

**Created:** 2026-06-06  
**Updated:** 2026-06-06 — platform-first IA, row-card layout  
**Status:** Approved direction — not yet implemented  
**App:** `apps/web/` (Operator Console)  
**Audience:** Dealership staff, onboarding operators, product/design — not engineers  
**Related:** [2026-06-06-operator-web-design.md](./2026-06-06-operator-web-design.md) · [2026-06-06-ui-design-system-design.md](./2026-06-06-ui-design-system-design.md)

---

## Why this document exists

The Operator Console works, but the UI has drifted toward **engineer language**: ingress, snapshot dry-run, movement signal, benchmark freshness, lifecycle scope, observed assist. Staff should not need to decode the product to use it.

This document is the **human layer** — how we speak, what we show first, and how pages are laid out. The sibling [operator web design plan](./2026-06-06-operator-web-design.md) covers IA, nav, and features; this one covers **clarity and presentation**.

**Core value:** Facilitating sync with many **channels** — connectivity, queue, history, reporting. The shell is **vertical-neutral**; cars are v1.

**Design goal:** Every screen answers three questions in order:

1. **What’s the situation?** (one plain sentence)
2. **What needs me right now?** (one obvious action, if any)
3. **Where are the details?** (row-card list → drawer — not tables and panel stacks)

**Layout rule:** Every core page is a **searchable, filterable, sortable list of operational row cards**. Mobile-first row design; desktop uses width for side-by-side list + detail — not wide tables.

---

## Voice principles

| Do | Don’t |
|----|-------|
| Use words dealers already say: *inventory, listings, photos, price, sold* | Use internal terms: *ingress, reconcile, snapshot candidate* |
| Write short sentences: “3 cars can’t go live yet.” | Write status codes: “3 BLOCKED readiness” |
| Say what to do: “Fix missing photos” | Say what failed: “Validation issue: mediaCount” |
| Put numbers in context: “12 days on lot · similar cars sell in ~19” | Show raw metrics without comparison |
| Hide advanced mechanics behind “Show details” | Stack every panel open by default |
| Link to help with plain link text: “Why is this blocked?” | Label everything with cryptic Info icons only |

**Tone:** Calm, direct, helpful — like a good office manager, not a log file.

**Reading level:** Aim for grade 8–10. No acronyms on first use without expansion (DMS, VIN, CSV are OK for this audience).

---

## Language guide

Use this table for all user-visible copy. Internal code names stay in code; **display copy** uses the right column.

| Avoid (internal / cryptic) | Use instead (user-facing) |
|-----------------------------|---------------------------|
| Ingress / ingress run | **Inventory feed** / **Last import** |
| Snapshot dry-run | **Review before removing** |
| Snapshot commit | **Confirm removals** |
| Lifecycle scope | **Show:** On the lot · Sold · Removed |
| Readiness: READY / WARNING / BLOCKED | **Ready to list** · **Needs review** · **Can’t go live** |
| Movement signal | **Sales pace** |
| FAST / SLOW / STALE / LOW_DATA | **Selling fast** · **Selling slowly** · **Sitting too long** · **Not enough data yet** |
| Benchmark / benchmark freshness | **Sales pace comparison** / **Comparison data updated …** |
| Sync / auto-sync | **Updates to listing sites** / **Sites update automatically** |
| Platform | **Listing site** (first mention on a page), then “platform” |
| Platform Status List | **Platforms** (nav label) |
| Site Queue | **Queue** (nav label) |
| Site History | **History** (nav label) |
| Publish queue item | **Pending task** — post, update, or remove |
| Publish state / packet prepared | **Live** · **Waiting to send** · **Ready to send** |
| Account state: ACCOUNT_NEEDED | **Setup needed** |
| Partner required | **Agreement needed with this site** |
| Observed assist (not attribution) | **Activity we’ve seen** (tooltip: “May not be the reason it sold”) |
| Channel metrics / platformAssists | **Views and leads from this site** |
| JSON ingest | **Paste inventory data** |
| Portal ingest | **Add inventory in the browser** |
| Performance compute | **Refresh sales pace data** |
| Dealer ID (in header) | Keep mono ID for support, but lead with **dealer name** |

**Rule:** If a label needs a KB article to understand, rewrite the label first. Help is backup, not the primary explanation.

---

## Page layout system

### Global pattern (all core pages)

Same five layers on **Platforms**, **Queue**, **History**, **Platform Queue**, **Platform History**, **Inventory**, and **Reports**:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PAGE SITUATION — plain headline + one sentence           │
├─────────────────────────────────────────────────────────────┤
│ 2. CONTROL BLOCK — search · filter · sort · refresh         │
│    (identical placement on every core page)                 │
├─────────────────────────────────────────────────────────────┤
│ 3. ROW-CARD LIST — operational rows (scroll)                │
├─────────────────────────────────────────────────────────────┤
│ 4. ROW DETAIL — drawer (desktop) or full sheet (mobile)     │
├─────────────────────────────────────────────────────────────┤
│ 5. STICKY BOTTOM BAR — when editing / multi-select         │
│    (Queue and Inventory only)                               │
└─────────────────────────────────────────────────────────────┘
```

**What each page’s rows represent:**

| Page | Each row is… |
|------|----------------|
| Platforms | One **channel** |
| Queue | One **task** (post / update / remove / sold) |
| History | One **transaction** — read-only |
| Platform Queue | One task on one channel |
| Platform History | One event on one channel |
| Inventory | One **asset** (vehicle in automotive v1) |

Row **lead** and **meta** lines come from the vertical adapter — not hard-coded in shell components. Automotive v1: year/make/model, VIN, price, mileage.

### Layout rules

1. **Row cards, not tables** — default list unit is an operational row card with lead, status, meta, and action.
2. **Shared control block** — search, filter, sort in the same place on every page; mobile collapses to icon + sheet.
3. **Desktop uses width** — list + detail pane side-by-side when viewport allows; never an empty 7xl table with five columns.
4. **One situation line** — the headline band summarizes counts (“2 sites blocked · 5 tasks waiting”).
5. **Progressive disclosure** — drawer holds setup fields, error detail, and help links; list stays scannable.
6. **Sticky actions** — bulk approve, bulk edit, import — bottom bar only when something is selected or editing.

### Responsive behavior

| Viewport | List | Detail |
|----------|------|--------|
| Narrow (mobile) | Full-width row cards | Full-screen sheet, back to list |
| Medium | Row cards | Modal or partial sheet |
| Wide (desktop) | ~40% list pane | ~60% drawer pane, both visible |

Inventory and Queue support multi-select → sticky bottom bar on all viewports.

---

## How to present data

### Numbers

Always pair a number with **meaning**:

| Bad | Good |
|-----|------|
| `12` | **12 cars** ready to send |
| `3 blocked` | **3 cars can’t go live** — fix in Inventory |
| `19` | Similar cars sold in **~19 days** |
| `$24,995` | **$24,995** list price |

Use **tabular numerals** for prices and counts. Round days and dollars for scanability; exact values on expand or hover.

### Status

Status appears in three layers — never all at once in one cell:

| Layer | Where | Example |
|-------|-------|---------|
| **Plain word** | Row badge | “Can’t go live” |
| **Short reason** | Row meta or drawer | “Missing photos” |
| **Full detail** | Drawer or help link | KB article |

Color supports the word (green / amber / red) but **never replaces** the word.

### Comparisons (sales pace)

Replace cryptic benchmark lines with a fixed sentence pattern:

> **{days} days on lot** · Similar cars: **~{avg} days** · **{pace label}**

Examples:

- “14 days on lot · Similar cars: ~19 days · Selling fast”
- “45 days on lot · Similar cars: ~22 days · Sitting too long”
- “8 days on lot · Not enough similar sales to compare yet”

Drop “Movement signal ·” prefixes and methodology paragraphs from the default view. Move “How we compare” to a help link.

### Row cards (primary list unit)

Each operational row card has four zones — always in the same order:

```
┌────────────────────────────────────────────────────────────┐
│ LEAD          │ STATUS BADGE                               │
│ (name/title)  │ (plain word: Connected, Waiting, Failed)  │
│ Meta line     │                        [ Action link ]   │
└────────────────────────────────────────────────────────────┘
```

- **Lead** — platform name, vehicle YMM, or event summary (largest text)
- **Status** — one plain word + color; never a code alone
- **Meta** — secondary facts: “Last updated 2h ago · 12 cars live”
- **Action** — one verb: Fix setup · Approve · View history · Open queue

Tap row → drawer. Checkbox on left for Queue and Inventory multi-select.

**Do not** use `DataTable` as the primary layout for dealer-facing pages. Tables remain for admin audit export only.

**Row lead examples:**

| Page | Lead line |
|------|-----------|
| Platforms | Google Vehicle Ads |
| Queue | 2021 Honda Accord · Post |
| History | Posted to Facebook · 2h ago |
| Inventory | 2021 Honda Accord · #A102 |

### Empty and loading states

| State | Copy pattern |
|-------|----------------|
| Empty platforms | “No listing sites configured yet.” |
| Empty queue | “Nothing waiting — all sites are up to date.” |
| Empty history | “No activity in this date range.” |
| Empty inventory | “No cars yet. Import a file or paste your inventory to get started.” |
| Empty search | “No matches. Try clearing filters or search.” |
| Loading | Skeleton **row cards** — not a full-page spinner |
| Error | “Couldn’t load this page.” + Retry |

---

## Shared control block

Identical on every core page — only placeholders and filter options change.

```
[ 🔍 Search…………………… ]  [ Filter ▾ ]  [ Sort ▾ ]     Updated 2:14 PM  [ Refresh ]
```

| Page | Search placeholder | Default sort |
|------|---------------------|--------------|
| Platforms | “Search listing sites” | Needs attention first |
| Queue | “Search stock #, VIN, site” | Urgency |
| History | “Search site, stock #, event” | Most recent |
| Inventory | “Search stock #, VIN, make, model” | Needs fix first |
| Reports | “Search site or metric” | Recent |

**Filter chips (examples):**

- Platforms: All · Connected · Setup needed · Blocked · Updating  
- Queue: All · Needs approval · Scheduled · Failed  
- History: All · Posted · Updated · Removed · Failed  

“More filters” opens a sheet — never more than one chip row visible by default.

---

## Navigation labels

**Dealer nav** (top or side — same order everywhere):

| Label | User understands |
|-------|------------------|
| **Platforms** | Are my listing sites connected? |
| **Queue** | What’s waiting to post or update? |
| **History** | What already happened? |
| **Reports** | How are sites performing? |
| **Inventory** | My cars — import and fix |
| **Help** | How-to articles |

**Admin-only:** Dealer Picker · Support View · Audit

Remove v4.7 labels Sync, Accounts, Insights from dealer nav.

---

## Screen-by-screen design

### 1. Platforms (home)

**One-line value:** See which listing sites are inactive, connected, blocked, or updating.

**Situation line examples:**

- “14 of 18 listing sites connected · 2 need setup”
- “All sites connected · 3 tasks waiting in Queue”

**Control block:** Search sites · Filter by connection state · Sort by urgency

**Row card:**

- **Lead:** Facebook Marketplace  
- **Status:** Connected  
- **Meta:** 24 cars live · last updated 1h ago · 2 pending  
- **Action:** Open queue →

**Drawer (tap row):** Account setup fields, rep contact, next step, blockers, links to **Platform Queue** and **Platform History** for this site.

**Sort default:** Sites needing attention first (blocked → setup needed → updating → connected).

---

### 2. Queue (Site Queue)

**One-line value:** Edit all pending posting, update, and removal tasks across platforms.

**Situation:** “12 tasks waiting · 3 need your approval”

**Row card:**

- **Lead:** 2021 Honda Accord · Post  
- **Status:** Needs approval  
- **Meta:** Google Vehicle Ads · scheduled today  
- **Action:** Approve

**Drawer:** Validation issues, preview, platform errors, timestamps.

**Sticky bottom bar:** Approve selected · Retry failed · Clear

---

### 3. History (Site History)

**One-line value:** Review every asset transaction and performance signal across platforms.

**Situation:** “48 updates sent this week · 2 failed · 31 leads recorded”

**Row card (read-only):**

- **Lead:** Posted 2021 Honda Accord to CarGurus  
- **Status:** Success  
- **Meta:** 2h ago · 3 views since post  
- **Action:** View on site → (external if available)

**Drawer:** Full event detail, artifact reference, performance snippet.

**Filter:** Event type · Site · Date range · Success / failed

---

### 4. Platform Queue (drill-down)

**One-line value:** Manage posting strategy and pending work for one platform.

**Situation:** “Google Vehicle Ads · 4 tasks waiting”

Same layout as Site Queue, pre-filtered. Breadcrumb: Platforms → Google Vehicle Ads → Queue

---

### 5. Platform History (drill-down)

**One-line value:** What happened and how inventory performed on one platform.

**Situation:** “Facebook · 120 posts this month · 18 leads”

Same layout as Site History, pre-filtered. Performance summary in situation line; rows are events.

---

### 6. Inventory (supporting)

**One-line value:** Import cars and fix what blocks listing sites.

**Situation:** “42 cars on lot · 38 ready · 4 need fixes”

Uses same five-layer pattern. **Add inventory** collapsible section above list (CSV, paste, feeds).

**Row card:**

- **Lead:** 2021 Honda Accord · #A102  
- **Status:** Can’t go live  
- **Meta:** Missing photos · 14 days on lot  
- **Action:** Fix →

**Drawer:** Blockers · sales pace · what shoppers see (preview) · cost fields (future)

**Sticky bottom bar:** Bulk edit selected

---

### 7. Reports

**One-line value:** Roll-up performance — not required for daily sync.

**Situation:** “Reference — site performance and sales pace summaries”

Row cards or simple sections linking back to History and Platforms. Explicit refresh only.

---

### 8. Help

Knowledge base — unchanged warm prose. Reachable from nav and “?” links in drawers.

---

### Admin: Dealer picker

**Situation:** “Which dealership are you working on?”

Row-card list of dealers (not table). Lands on **Platforms** after selection.

---

## Row detail drawer (all pages)

Use **labeled sections in plain English**:

| Section | When |
|---------|------|
| What’s the issue? | Queue, Inventory, Platforms (if blocked) |
| What we sent / did | History |
| Setup & account | Platforms drawer |
| What shoppers see | Inventory drawer only |
| Activity on this site | Platform History |

No raw JSON in default drawer — “Show technical details” collapsed at bottom.

---

## Implementation approach

Do **not** rewrite business logic. Add a **presentation layer**:

```
apps/web/src/lib/copy/          — user-facing strings and label maps
apps/web/src/lib/statusRegistry.ts  — keep keys; add displayLabel where needed
```

### Phase 1 — Platforms page (core)

- Situation line + control block + platform row cards
- Drawer for account setup (replaces Accounts tab)
- Default landing after dealer pick

### Phase 2 — Queue + History

- Site Queue row cards from publish queue API
- Site History row cards from sync events + performance
- Platform drill-down routes

### Phase 3 — Layout primitives + Inventory migration

- `OperationalRowCard`, `RowDetailDrawer`, `ControlBlock`
- Inventory: table → row cards
- Reports replaces Insights tab label and layout

### Phase 4 — Copy pass

- Centralize strings in `copy/operator.ts`
- Plain status words on all row cards

---

## Success criteria

- [ ] User lands on **Platforms** and understands site connection state without training
- [ ] Every core page follows: situation → control block → row cards → drawer
- [ ] No dealer-facing page uses a wide table as its primary layout
- [ ] Nav reads: Platforms · Queue · History · Reports · Inventory · Help
- [ ] Queue tasks use plain verbs: Post · Update · Remove — not internal queue status codes
- [ ] History is clearly read-only; fixes link to Queue
- [ ] Desktop shows list + detail pane; mobile shows list → full sheet
- [ ] Shared control block appears in the same position on all core pages

---

## Next step

Build **Platforms** first — one situation line, one control block, 18 row cards, drawer for setup. Reuse existing platform list data; change presentation only.
