# Autopilot and phased delivery plan

Proposed architecture and rollout · October 25, 2026 · [Plan index](README.md)

## Outcome

Autopilot transforms inventory syndication from a stressful, manual queue-monitoring chore into an intuitive **"set it and forget it" background engine**. 

Dealerships and new internal staff no longer have to navigate cron schedules, format feeds, inspect queue payloads, or guess why listings aren't live. Distribution is automatic, transparent, safe, and dumbed way down on the surface.

---

## 1. What Autopilot Means (And What It Does Not)

### The Dealership Experience
For a dealership, Autopilot means:
- You add or edit a vehicle (price, details, photos).
- You mark a vehicle as Sold or Removed.
- **You do nothing else.** The system automatically validates vehicle readiness, synchronizes changes to all connected, eligible channels, and immediately removes sold vehicles so you don't get calls for cars you no longer have.

### The Reality Contract (No False Promises)
In the current system, automatic inventory change sync was hardcoded only for `consumer-marketplace` (`AUTO_SYNC_CAPABLE_SLUGS = new Set(['consumer-marketplace'])`), while 31 platforms were displayed as if they were live automated integrations. 

Autopilot will not pretend that third-party manual setup guides are real-time automated APIs. It establishes **honest automation tiers**:

| Tier | How It Works | Channels Supported | Dealer Experience |
|---|---|---|---|
| **Tier 1: Real-Time API Autopilot** | Direct API or catalog sync triggered immediately upon vehicle save or sale. | Auto Marketplace, Google Vehicle Ads, Meta Automotive Ads | "Synced automatically within minutes." |
| **Tier 2: Scheduled Batch Autopilot** | Automated feed generation and SFTP/batch submission running on a continuous schedule (e.g., hourly). | CarGurus, Cars.com, Autotrader, eBay Motors, TikTok Shop | "Synced automatically on schedule (next run in 25 min)." |
| **Tier 3: Assisted Partner Feeds** | Platform requires dealer-specific partner rep approval, CRM routing, or assisted contract setup. | TrueCar, CARFAX for Dealers, Specialty Trader networks | "Account active; listings distributed via managed partner feed." |

---

## 2. Autopilot Controls: Dumbed Way Down

The user interface for Autopilot is designed to prevent cognitive overload.

### 2.1 The Master Dealership Autopilot Switch
Located on both **Home** and **Channels**:
- **State**: `[● Autopilot: Active]` (Sea green) or `[○ Autopilot: Paused]` (Attention amber).
- **Subtext**: "Distributing 42 eligible vehicles across 8 channels. Next sync in 12 min (or instant on vehicle edit)."
- **Primary Control**: Single-click `[Pause Distribution]` or `[Resume Distribution]` with confirmation dialog.

### 2.2 Per-Channel Autopilot Toggles
Under **Channels**, each connected channel has a simple switch:
- `Distribute automatically when vehicle is ready` `[Toggle: ON / OFF]`
- If turned OFF, vehicles are only syndicated when manually triggered by the dealer or support.
- If a channel is missing credentials or blocked, the toggle is disabled with a clear reason: *"Disabled: Facebook login required. [Reconnect Now]"*.

### 2.3 Quiet Automation & Actionable Exceptions
- **Healthy automation stays silent**: Successful queue dispatches, feed builds, and 200 OK responses do not trigger notifications, toasts, or badge spam.
- **Actionable exceptions only**: When an issue requires human action, Autopilot creates a single, clean item in **Needs Attention**:
  - *Missing Data*: "2023 Ford F-150 missing price" → Owner: Dealership → `[Add Price]`
  - *Photo Count*: "2021 Toyota RAV4 needs 3 photos for Meta Ads" → Owner: Dealership → `[Upload]`
  - *Credential Issue*: "Google Merchant Center token expired" → Owner: Internal Support / Dealer → `[Reconnect]`

---

## 3. Safety Rails & Circuit Breakers

Automated syndication can cause severe financial or reputational damage if bad data is pushed blindly. Autopilot includes strict automated safeguards:

### 3.1 Price Sanity Guard
- Prevents distributing vehicles with $0, placeholder prices ($1, $123), or prices dropping by more than 75% in a single update.
- **Action**: Holds the vehicle in `Needs Attention` with the alert: *"Price ($1,500) is significantly below typical value for 2024 Cadillac Escalade. Confirm price to distribute."*

### 3.2 Mass-Delisting Circuit Breaker
- If an automated DMS sync, CSV import, or manual action attempts to mark more than 30% of active inventory as sold or removed in a single operation:
- **Action**: Autopilot pauses distribution immediately, prevents feed purging, and alerts internal support and the dealer owner: *"Safety hold: Import attempted to remove 28 of 42 vehicles. Please review before proceeding."*

### 3.3 Photo Sufficiency Gate
- Vehicles will not be syndicated to public advertising channels without at least one primary exterior photo. Individual channels enforce their specific photo minimums (e.g., minimum 3 photos for Facebook/Meta Ads).

### 3.4 Credential Pre-Expiry Alert
- 7 days before an OAuth token or API key expires, an internal task and dealer notice are generated: *"Facebook connection will expire in 7 days. Reconnect now to prevent listing interruption."*

---

## 4. Technical Architecture: The Autopilot Engine

```text
+-----------------------------------------------------------------------------------------+
|                                    DEALERSHIP WORKSPACE                                 |
|  [Add / Edit Vehicle]      [Mark Sold]      [Bulk CSV Import]      [DMS Automated Sync] |
+-----------------------------------------------------------------------------------------+
                                             │
                                             ▼
                                  InventoryChangeEvent
                                             │
                                             ▼
+─────────────────────────────────────────────────────────────────────────────────────────+
|                                  AUTOPILOT ENGINE                                       |
|                                                                                         |
|  1. Quality & Safety Rails:                                                             |
|     • VIN valid? Price > $500? Photos >= minimum? No mass deletion?                     |
|                                                                                         |
|  2. Eligibility Evaluation:                                                             |
|     • Dealership Autopilot Active? Channel enabled? Vehicle not manually excluded?      |
|                                                                                         |
|  3. Smart Dispatch Router:                                                              |
|     ├── TIER 1 (Real-Time API)   ──► Google Vehicle Ads / Meta / Auto Marketplace       |
|     ├── TIER 2 (Batch Scheduler) ──► Staged for next hourly Feed / SFTP generation      |
|     └── TIER 3 (Partner Feeds)   ──► Partner CRM / Lead Route Handlers                  |
|                                                                                         |
|  4. Verification & Audit:                                                               |
|     • Persist dispatch receipt; record sync event in dealership Activity log.           |
|     • On failure: Generate plain-language Action Item with assigned owner.              |
+─────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 5. Phased Delivery Roadmap

The redesign is delivered across **5 structured phases**, prioritizing foundation stability and onboarding before expanding automation reach.

```text
Phase 1: Foundation & Reliability (Weeks 1-2)
  │
  ├── Fix Settings routing bug & local-only Lead state
  ├── Wire functional queries for 3 placeholder inventory tabs
  └── Eliminate mock Finances from operational views
  │
Phase 2: Internal Admin & Simplified Onboarding (Weeks 3-4)
  │
  ├── Unified Dealership Record (Overview, Setup, People & Access)
  ├── 5-step guided onboarding wizard for internal new hires
  └── Instant login handoff (one-time temp password reveal & invite links)
  │
Phase 3: Ultra-Simple Dealership Experience (Weeks 5-6)
  │
  ├── 4-tab dealership navigation (Home, Vehicles, Channels, Leads)
  ├── Home command center with Autopilot status pill & action items
  └── Simplified Channels cards & shared multi-user Leads inbox
  │
Phase 4: Autopilot Syndication Engine (Weeks 7-8)
  │
  ├── Event-driven InventoryChangeEvent listener
  ├── Safety circuit breakers (Price guard, Mass-delisting guard)
  └── Multi-channel catalog dispatch (Tier 1 & Tier 2 automation)
  │
Phase 5: Usability Gates & Production Rollout (Weeks 9-10)
  │
  ├── Internal new hire onboarding usability test (15-min target)
  ├── Dealership daily task test (3-min target)
  └── Live migration of existing dealerships
```

---

## 6. Detailed Phase Breakdown

### Phase 1: Foundation & Reliability Repairs (Weeks 1–2)
**Goal:** Fix known functional breaks and false promises so the platform behaves predictably.
1. **Router Fix**: Update `apps/web/src/lib/routes.ts` so `settings` is an accepted segment, correctly loading `SettingsPage.tsx`.
2. **Lead State Persistence**: Add database columns/table for lead status (`NEW`, `CONTACTED`, `APPOINTMENT`, `SOLD`, `LOST`), assigned staff ID, and internal notes. Replace `localStorage` reads/writes.
3. **Inventory Work Tabs**: Wire the three placeholder tabs (`Needs Attention`, `Recently Changed`, `Sold / Removed`) to actual Prisma queries.
4. **CSV Import Repair**: Implement the file dropzone modal with column mapping preview, row validation errors, and table refresh on completion.
5. **Brand Alignment**: Standardize all first-party consumer listings to "Auto Marketplace", removing legacy "Dealer Storefront canary" references.
6. **Financial Data Sanitization**: Remove mock financial generator (`generateMockDashboardData`) from operational admin navigation until backed by actual accounting data.

### Phase 2: Internal Admin & Simplified Onboarding (Weeks 3–4)
**Goal:** Empower internal new hires to onboard and manage dealerships from a single unified record.
1. **Dealership Record Consolidation**: Create the unified 6-section dealership view (`Overview`, `Setup`, `People & access`, `Vehicles`, `Channels`, `Activity`).
2. **5-Step Resumable Onboarding**:
   - Step 1: Business identity & location
   - Step 2: People & access (login email, role, invite/temp password)
   - Step 3: Vehicles (CSV/VIN intake, error review)
   - Step 4: Channels (select agreed channels, connect, toggle Autopilot)
   - Step 5: Verification & handoff (test publish, lead route test, send welcome packet)
3. **Initial Login Access Tooling**:
   - Instant copy of login email and setup link.
   - One-time reveal of temporary credentials with mandatory change on first sign-in.
   - One-click "Prepare Welcome Message" with pre-filled login credentials and support contact.
4. **Support Without Identity Confusion**: Implement "Open Dealer View" with a persistent support header and clear "Return to Dealership Record" link.

### Phase 3: Ultra-Simple Dealership Experience (Weeks 5–6)
**Goal:** Deliver a calm, 4-tab dealership interface that reduces daily complexity.
1. **4-Tab Navigation**: Deploy clean navigation (`Home`, `Vehicles`, `Channels`, `Leads`) with persistent Autopilot status header.
2. **Home Command Center**: Deploy the Autopilot status card, prioritized "Needs Attention" list with clear ownership lines, and daily activity summary.
3. **Vehicles Workspace**: Deploy streamlined vehicle list with visual photo indicators, quick VIN decode intake, and working archive/relist tools.
4. **Simplified Channels View**: Transform 23 raw developer cards into plain-English channel status cards with individual Autopilot switches.
5. **Shared Leads Inbox**: Deliver the team-shared lead management inbox with direct call/email links and pipeline status tracking.

### Phase 4: Autopilot Syndication Engine (Weeks 7–8)
**Goal:** Expand automated distribution safely across Tier 1 and Tier 2 channels.
1. **Change Detection Pipeline**: Hook `InventoryChangeEvent` into vehicle creation, updating, and marking sold.
2. **Safety Guards**: Implement the Price Sanity Guard ($0 / >75% drop) and Mass-Delisting Circuit Breaker (>30% lot removal).
3. **Catalog Dispatch Expansion**: Expand automated change-sync from `consumer-marketplace` to include Google Vehicle Ads and Meta Automotive Ads catalog APIs.
4. **Automated De-Listing**: Guarantee that marking a vehicle Sold or Removed immediately initiates de-listing across all active channels.

### Phase 5: Verification, Usability Gates & Rollout (Weeks 9–10)
**Goal:** Validate with real users, certify system stability, and migrate active dealerships.
1. **Internal Usability Gate**: Three newly hired internal staff members must onboard a test dealership, configure 3 channels, and hand over login access within **15 minutes** without coaching.
2. **Dealership Usability Gate**: Three dealership users must add a vehicle with photos, adjust pricing, check Autopilot status, and update a lead status in **under 3 minutes**.
3. **Automated Smoke & Regression Suite**: Full automated test of CSV import, VIN decode, OAuth token refresh, circuit breakers, and lead routing.
4. **Migration & Deprecation**: Seamlessly redirect old bookmarks (`#/admin/dealers/*`, `#/dealer/queue`) to their new simplified destinations.

---

## 7. Concrete Acceptance Criteria

| Feature | Acceptance Standard |
|---|---|
| **Simplified Onboarding** | A new hire can complete Steps 1–5 and generate dealer login access in < 15 minutes. Progress is saved on the server and resumable. |
| **Initial Login Access** | Staff can copy a dealer's login email and invite/temporary login link in < 10 seconds directly from People & Access. |
| **Autopilot Operation** | Adding a valid vehicle automatically lists it on all enabled Tier 1 & 2 channels without clicking "Publish" or inspecting queues. |
| **Autopilot Safety** | Pricing an Escalade at $10 or deleting 50% of the lot immediately triggers a safety hold; zero bad data is broadcast. |
| **Zero Broken Promises** | 100% of buttons perform their advertised action. No alert placeholders, no local-only state, no broken Settings routes. |
| **Shared Team State** | Lead status changes made by User A are immediately visible to User B upon page refresh or real-time event. |
