# Dealership redesign: simple daily work

Proposed experience · October 25, 2026 · [Plan index](README.md)

## Outcome

A dealer principal, general manager, or salesperson can log in, verify that their inventory is actively being distributed, see exactly what needs attention, and respond to buyer inquiries—in under two minutes. 

The dealership experience is **ultra-simple on the surface**, hiding complex syndication machinery, sync queues, and API payloads behind a calm, outcome-focused workspace.

---

## 1. Primary Dealership Promise

> **"Keep vehicle details accurate; our system automatically distributes eligible listings to your channels; buyer inquiries arrive in one shared inbox."**

Every screen reinforces this contract:
- **Dealers own**: Accurate pricing, vehicle specifications, photo quality, and timely buyer follow-up.
- **The system owns**: Automated distribution (Autopilot), format compliance, feed generation, and continuous sync across connected channels.
- **Our internal team owns**: Technical onboarding, channel credential setup, partner feed approvals, and escalated distribution failures.

---

## 2. Navigation Architecture

Four primary daily destinations replace the fragmented 8-tab operator shell:

| Destination | Everyday Job | What Users See First |
|---|---|---|
| **Home** | What happened today & what needs action | Distribution status (Autopilot pill), actionable exceptions, buyer activity summary |
| **Vehicles** | Keep stock accurate and complete | Active vehicles, filter by needs attention, quick VIN/CSV intake, vehicle detail editor |
| **Channels** | See where vehicles are listed | Simplified channel cards, live listing counts, Autopilot on/off, connection health |
| **Leads** | Contact interested buyers | Shared team inbox, inquiry details, linked vehicle, status pipeline (shared server state) |

### Contextual & Secondary Navigation

- **Dealership Header**: Dealership name, location, Autopilot health badge (`● Autopilot Active · 8 channels`), assigned internal support contact (`Assigned support: Maya · Contact`), and quick search.
- **User / Profile Menu (Top Right)**: Account settings, Dealership profile & hours, Team member management, Notification preferences, Sign out.
- **Settings Route**: Fixed at the router (`#/settings` loads Settings directly).
- **Reports & Intelligence**: Accessible contextually from Channels ("Channel Performance") and Vehicles ("Market Days Supply & Velocity"), rather than overwhelming daily navigation.
- **Retired from Dealer Nav**: Technical Queue, raw History, and developer consoles are removed from primary navigation. Specialist tools (feed preview, payload inspection) remain accessible under **Channels → Advanced Settings**.

---

## 3. Screen-by-Screen Experience

### 3.1 Home: The Daily Command Center

The Home tab eliminates the current 6,700px vertical scroll of static comics, unconfigured notification channels, and technical issue tables. It presents a calm, structured dashboard answering three core questions:
1. *Is my inventory being distributed?*
2. *Does anything need my attention today?*
3. *What new buyer leads arrived?*

```text
+----------------------------------------------------------------------------------------------------+
| Lakeview Motors · Dallas, TX                [+ Add Vehicle]  [Import CSV]  | Alex (Dealer Owner) ▾ |
| Support Contact: Maya (Antigravity Support · 214-555-0199)                                         |
+----------------------------------------------------------------------------------------------------+

  +------------------------------------------------------------------------------------------------+
  |  ● AUTOPILOT ACTIVE                                                [Pause Distribution]        |
  |  Distributing 42 eligible vehicles across 8 channels. Last sync completed 14 minutes ago.     |
  |  Channels: Google (42) · Facebook (42) · CarGurus (39) · Auto Marketplace (42) · +4 others     |
  +------------------------------------------------------------------------------------------------+

  NEEDS ATTENTION (3 items)                                                          View all tasks →
  +------------------------------------------------------------------------------------------------+
  | ⚠️ 2023 Ford F-150 (#1042) · Missing listing price                          [Add Price]       |
  |    Required by Google Vehicle Ads & CarGurus · Owner: Dealership (Alex)                        |
  |------------------------------------------------------------------------------------------------|
  | ⚠️ 2021 Toyota RAV4 (#1088) · Needs at least 3 photos (1 uploaded)          [Upload Photos]   |
  |    Required by Meta Automotive & Auto Marketplace · Owner: Dealership (Alex)                   |
  |------------------------------------------------------------------------------------------------|
  | ℹ️ Facebook Marketplace · Re-authentication required                        [Reconnect Now]   |
  |    Listing token expired 2 days ago · Owner: Dealership (Alex)                                 |
  +------------------------------------------------------------------------------------------------+

  TODAY'S ACTIVITY                                                                  NEW LEADS (2 new)
  +------------------------------------------------------+  +--------------------------------------+
  | • 3 vehicles automatically synced to 8 channels      |  | Jordan Smith · 2023 Ford F-150       |
  | • 1 vehicle marked SOLD; removed from all channels   |  | Inquired via Auto Marketplace · 9:15a|
  | • Price change on 2022 Honda CR-V updated everywhere |  | Status: New · [View & Reply]         |
  +------------------------------------------------------+  +--------------------------------------+
```

#### Signature Element: The Ownership Line
Every exception clearly states:
1. **The exact problem in plain language** (e.g., "Missing listing price", not `ERR_FEED_VALIDATION_PRICECENTS_NULL`).
2. **The affected channels** ("Required by Google & CarGurus").
3. **The accountable owner** (`Owner: Dealership (Alex)` vs `Owner: Our Team (Maya)` vs `Owner: Partner (CarGurus)`).
4. **A direct action button** that opens the exact editor modal needed to resolve it.

---

### 3.2 Vehicles: Trustworthy Inventory Management

The Vehicles tab replaces the cluttered "Inventory" view with a clean, responsive workspace.

#### Work Tabs (Repairs Broken Placeholders)
The previous interface had four tabs where three were non-functional placeholders. The redesigned Vehicles surface implements functional, high-utility views:

1. **Active Inventory** (Default): Vehicles currently available for sale and syndication.
2. **Needs Attention**: Vehicles with missing prices, insufficient photos, missing VIN decodes, or channel eligibility blockers. Filterable by issue type.
3. **Recently Changed**: Vehicles added, edited, or repriced within the last 7 days.
4. **Sold & Removed**: Archived vehicles. Displays sold date, final sale price, days to sell, and a 1-click **Relist** button if a deal fell through.

#### Intake Actions (That Work as Promised)
- **Add Single Vehicle**: Click "+ Add Vehicle" → enter 17-character VIN → system instantly runs VIN decode (NHTSA/internal database) → pre-populates Year, Make, Model, Trim, Engine, Body Style, Transmission → user inputs Price, Mileage, and uploads photos → Save.
- **Bulk CSV Import**: Replaces the alert-only placeholder. Drag-and-drop CSV → auto-detects column headers with fuzzy matching (e.g., "MSRP" → "Price") → visual preview showing row-by-row validation → commit valid rows immediately, quarantine invalid rows with inline editable error fixes.
- **Connected DMS Sync**: If the dealership connects a DMS (CDK, Reynolds, DealerTrack, CSV FTP), the header displays: `DMS Source: CDK Global · Auto-synced daily at 4:00 AM · 48 vehicles mapped · [Trigger Manual Refresh]`.

#### Vehicle Detail Experience: The 3-Step Sequence
When clicking a vehicle, an intuitive editor opens preserving the proven 3-step sequence:
1. **Photos & Media**: Drag-and-drop photo grid. Visual shot guide indicators (Front 3/4, Rear 3/4, Driver Side, Interior, Dashboard, Wheels). Badge indicating if photo count satisfies channel minimums (e.g., "8/5 photos - Meets all channel standards").
2. **Vehicle Details**: Essential business fields (Price, Mileage, Condition, Color, Stock #, Description). Smart fields warn if price is $0 or unrealistic before saving.
3. **Channels & Distribution**: Shows which channels this vehicle is eligible for. A simple toggle per channel allows opting out individual vehicles (e.g., exclude wholesale trade-ins from consumer marketplaces).

---

### 3.3 Channels: Distribution Dumbed Way Down

Instead of dumping 23 raw developer cards filled with webhook secrets, JSON schemas, and queue parameters, the Channels screen organizes distribution into understandable categories:

```text
CHANNELS (8 Active · 2 Available to Connect)                      [Pause All Distribution]

MAJOR MARKETPLACES
+----------------------------------------------------------------------------------------------------+
| 🚗 Auto Marketplace (First-Party)                                                  ● Active        |
|    Your vehicles are listed on our consumer shopping portal.                                       |
|    42 vehicles live · 0 errors                                                                     |
|    Autopilot: [Enabled  ●]                                                [View Live Listings ↗]  |
|----------------------------------------------------------------------------------------------------|
| 🌐 CarGurus                                                                        ● Active        |
|    Connected via Dealer Feed · Account ID: CG-88412                                                |
|    39 vehicles live · 3 blocked (missing price)                                                    |
|    Autopilot: [Enabled  ●]                            [Fix 3 Blocked]  [Channel Settings ▾]        |
|----------------------------------------------------------------------------------------------------|
| 🚙 Cars.com                                                                        ○ Setup Needed  |
|    Managed partner syndication.                                                                    |
|    Status: Our team is provisioning your account (Maya, due Oct 27)               [Contact Maya]       |
+----------------------------------------------------------------------------------------------------+

SEARCH & SOCIAL ADS
+----------------------------------------------------------------------------------------------------+
| 🔍 Google Vehicle Ads                                                              ● Active        |
|    Merchant Center ID: 19827364 · Direct Catalog Sync                                             |
|    42 vehicles live · Synced 14m ago                                                               |
|    Autopilot: [Enabled  ●]                                                [Manage Ad Settings ▾]  |
|----------------------------------------------------------------------------------------------------|
| 📱 Meta Automotive Ads (Facebook & Instagram)                                      ⚠️ Needs Login  |
|    Catalog ID: 99482104 · Token expired                                                            |
|    Distribution paused until re-authenticated.                                                     |
|    Autopilot: [Paused   ○]                                                [Reconnect Facebook]     |
+----------------------------------------------------------------------------------------------------+
```

#### Core Principles for Channels:
- **Plain-English Health**: Every channel shows "Active", "Needs Login", "Setup Needed", or "Paused".
- **Clear Vehicle Count**: Shows exactly how many vehicles are currently live on each channel.
- **Autopilot Toggle**: Each active channel has an on/off switch: "Distribute automatically when vehicle is ready".
- **Advanced Tools Disclosed Contextually**: Clicking `[Channel Settings ▾] → Advanced` reveals technical tools (Feed URL, FTP credentials, Raw XML/JSON export, Last delivery receipt, Manual force-sync). Everyday users never see them by default.

---

### 3.4 Leads: Shared Team Inbox

The Leads screen is redesigned from a fragile browser-local demo into a dependable, multi-user sales inbox:

#### Critical Architecture Fix:
- **Shared Server State**: Lead status (New, Contacted, Appointment, Sold, Lost), sales rep assignment, and notes are persisted to the database via API, so any dealership employee sees the true status across devices.

#### Inbox Layout:
- **Filter Tabs**: All Leads · New (Unread) · Appointments · Closed / Sold.
- **Lead Row Content**:
  - Buyer Name, Contact info (Email, Phone)
  - Time elapsed ("25m ago", "Yesterday")
  - Vehicle of interest: Thumbnail, Year/Make/Model, Stock #, Price
  - Source channel badge: "Auto Marketplace", "Google Vehicle Ads", "CarGurus"
  - Assigned salesperson dropdown
  - Status pipeline dropdown: `[ New ▾ ]` → `[ Contacted ]` → `[ Appointment ]` → `[ Sold ]` → `[ Closed / Lost ]`
  - Action buttons: Quick Call, Quick Email, and View Notes.
- **Automated Buyer Response Tracking**: Displays whether the automated welcome email/SMS was sent successfully, so salespeople never duplicate initial outreach.

---

## 4. Resolving False Promises and Functional Bugs

| Current Problem | Redesign Solution |
|---|---|
| **Broken Settings Link**: `#/dealer/settings` routes to Platforms | Router updated to correctly parse `settings` segment; Settings renders clean profile, hours, contacts, and notification preferences. |
| **Local-Only Lead Status**: Changes to lead status only saved in `localStorage` | Backed by server schema and API; changes immediately sync across team members. |
| **Three Fake Inventory Tabs**: Needs Attention, Recently Changed, Sold were empty | Fully wired to backend queries filtering by validation status, update timestamp, and lifecycle state. |
| **CSV Import Alert**: Button displayed alert telling user to use nonexistent toolbar | Real modal dialog with file dropzone, column mapping preview, row error validation, and commit. |
| **Marketplace Naming Confusion**: UI told dealers to connect "Dealer Storefront canary" | Unified under "Auto Marketplace" brand across documentation, settings, and badges. |
| **Fake First-Publish Success**: Checklist checked off if any history event existed | Checklist checks for verified active syndication receipt or live catalog item confirmation. |

---

## 5. Dealership Roles & Permissions

To prevent unauthorized changes while keeping everyday work frictionless:

| Action | Dealer Principal / GM | Sales Manager / Staff | Service / Inventory Clerk |
|---|---|---|---|
| Add / edit vehicle details & photos | ✅ Yes | ✅ Yes | ✅ Yes |
| Mark vehicle as Sold / Relist | ✅ Yes | ✅ Yes | ❌ No |
| View and manage buyer leads | ✅ Yes | ✅ Yes | ❌ No |
| Toggle Autopilot on/off | ✅ Yes | ❌ Read-only | ❌ No |
| Connect / reconnect channels (OAuth) | ✅ Yes | ❌ Read-only | ❌ No |
| Invite team members & manage logins | ✅ Yes | ❌ No | ❌ No |
| Edit dealership profile & bank/billing | ✅ Yes | ❌ No | ❌ No |

---

## 6. Implementation Slices & Acceptance Criteria

1. **Slice 1: Router & Navigation Cleanup**
   - Implement fixed `#/settings` route.
   - Replace 8-tab operator nav with 4-tab dealer nav (Home, Vehicles, Channels, Leads).
   - Ensure clean header with Autopilot pill and assigned internal support contact.

2. **Slice 2: Vehicles Workspace Repair**
   - Connect active queries for Needs Attention, Recently Changed, and Sold / Removed tabs.
   - Wire CSV upload modal to existing backend CSV parser.
   - Add inline photo sufficiency and price validation indicators.

3. **Slice 3: Shared Leads Service**
   - Create Prisma model/columns for lead status, assigned user, and dealer notes.
   - Update Leads UI to read and write from server API instead of `localStorage`.

4. **Slice 4: Channels Simplification & Autopilot UI**
   - Group 23 automotive platform profiles into simplified channel cards with clear health badges.
   - Expose prominent Autopilot toggle and hide raw sync logs behind Advanced disclosures.

### Usability Acceptance Target:
- A new dealership employee can add a vehicle with photos and price, verify its Autopilot distribution status, and check new leads in **under 3 minutes** with zero training.
- 100% of visible buttons perform their stated action (no alert placeholders or disconnected routes).
