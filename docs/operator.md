# Operator Guide

The operator portal (`apps/web`) is the internal management surface for platform staff. It is distinct from the consumer marketplace and requires an operator account with a valid session cookie.

---

## Access & Login

Navigate to the operator portal URL. Login with your operator email and password. Sessions last 8 hours. Contact a SUPER_ADMIN to create or reset your account.

**Roles:**

| Role | What you can do |
|---|---|
| `SUPER_ADMIN` | All dealerships, all admin tabs, user management |
| `OPERATOR` | Assigned dealerships only, no admin tab |

After login you are taken to the Dealer Picker if you have access to multiple dealerships. Select a dealership to enter its management workspace.

---

## Dealer Workspace

The workspace has five primary sections accessible from the left nav:

| Section | Purpose |
|---|---|
| **Home** | Readiness summary, workflow strip, quick-action links |
| **Inventory** | Vehicle list, VIN entry, CSV import, media upload, listing status |
| **Platforms** | Platform connection status, readiness per vehicle, sync queue |
| **Reports** | Performance benchmarks, channel velocity, sync activity, lead demand |
| **Leads** | Inbound inquiries from all channels |

---

## Dealer Onboarding

When adding a new dealership, collect the following before creating the account:

**Business identity**
- Legal business name + DBA
- Dealer license number
- Street address, city, state, ZIP
- Primary contact: name, title, email, phone
- Website/domain

**Required documents**
- Dealer license PDF
- W-9
- Certificate of insurance (if storefront branding is included)
- Logo (if storefront branding is included)
- Any existing marketplace account IDs the dealer already owns

**Inventory data (per vehicle)**
- VIN, stock number, year/make/model/trim, mileage, price, condition, color, description, photos

Create a new dealership via the Admin → Dealerships tab → "Add Dealership", or via CLI:
```bash
npm run dealer:create:pristine    # standard demo dealer
npm run dealer:create             # interactive
```

---

## Inventory Management

### Adding vehicles

**Single VIN entry:** Inventory → "Add Vehicle" → enter VIN. The system decodes year/make/model/trim automatically via the VIN decode service.

**Bulk VIN import:** Inventory → "Bulk Import" → paste or upload a list of VINs. Preview resolves each VIN before commit.

**CSV import:** Inventory → "Import CSV" → upload a formatted CSV. Preview shows field mapping and validation errors before commit.

**JSON ingest:** For API-connected sources (DMS polling), the system automatically reconciles on a schedule. Manual trigger via `POST /api/dealers/:id/inventory/ingest/json`.

### Vehicle lifecycle

| Status | Meaning |
|---|---|
| `DRAFT` | Not yet eligible for platform publishing |
| `READY` | Passes readiness check; eligible for publishing |
| Sold | Marked sold — removed from all active feeds |
| Removed | Pulled from market — not sold |

Mark sold: Inventory → vehicle detail → "Mark Sold".
Mark removed: Inventory → vehicle detail → "Remove".
Relist: available from vehicle detail after removal.

### Media

Upload photos from the vehicle detail panel. Photos are assigned to slots (shot guide positions). The first photo becomes the primary listing image.

- Supported: JPEG, PNG, WEBP
- Each vehicle can have up to 25 media slots
- Custom label and group are available for non-standard shots (e.g., damage photos, interior details)

---

## Platform Management

### Platform readiness

Each platform has a readiness checklist. The Platforms page shows per-vehicle pass/warn/fail status for every connected platform. Common blockers:

- Missing required photos (minimum count varies by platform)
- Missing price or price below platform minimum
- Missing dealer license or document on file
- Platform account not connected (OAuth not completed)

### Connecting a platform (OAuth)

Platforms that require OAuth (Meta, Google, eBay, TikTok, etc.): Platforms → select platform → "Connect" → complete the OAuth flow in the provider's UI → return to the portal. The token is stored in `PlatformCredentialRef`.

### Publishing workflow

1. Inventory → ensure vehicles have `READY` listing status.
2. Platforms → "Prepare Publish" — generates feed artifacts and populates the sync queue.
3. The sync scheduler processes the queue every 5 minutes (background job). Queue items move through: `READY → SUBMITTED → ACTIVE` (or `FAILED` with retry backoff).
4. Platforms → Queue tab shows current queue state per platform.
5. Platforms → History tab shows past submissions.

**Dispatch environment:** Publishing is safe to run at any time. Unless `DISPATCH_ENVIRONMENT=PRODUCTION` is explicitly set on the server, all dispatches write to the mock receipt store — no real platform API calls are made.

### Channel selection

By default all READY vehicles are eligible for all connected platforms. To opt a vehicle out of a specific channel: Inventory → vehicle detail → Channels tab → toggle off.

---

## Reports

The Reports hub provides six report types:

| Report | What it shows |
|---|---|
| **Sync Activity** | Feed submission volume and success/fail rates over time |
| **Publish Throughput** | Queue processing cadence and latency |
| **Observed Demand** | Lead and engagement events by channel |
| **Lifecycle Flow** | Vehicle state transitions (new → ready → sold) |
| **Merchandising Activity** | Price changes, photo updates, relisting events |
| **Channel Velocity** | Movement speed benchmarks (fast/slow/stale) per platform |

Performance data is recomputed every 15 minutes by the background job. Manual recompute: Reports → "Refresh Performance".

---

## Leads

The Leads page shows inbound inquiries from all channels in chronological order. Leads include: buyer contact info, the vehicle they inquired about, the originating channel, and timestamp.

Lead delivery to the dealer's CRM or email is configured per dealership under the notification channel settings.

**Buyer auto-response:** If enabled for a dealership, the system sends an automated acknowledgment email + SMS to the buyer upon lead submission. Configured under the Communications tab in the dealer settings.

---

## Admin Panel

Accessible to SUPER_ADMINs only. Seven tabs:

| Tab | Purpose |
|---|---|
| **System Status** | Server health, DB connectivity, job status |
| **Insights** | Platform-wide sync volume, lead volume, active dealer count |
| **Dealerships** | Create/search/filter all dealerships; triage blocked accounts |
| **Platforms** | Platform registry status; credential validation across all dealers |
| **Blockers / Triage** | Vehicles or accounts with blocking readiness issues |
| **Audit Log** | Append-only log of privileged admin actions |
| **Users** | Create/edit/deactivate operator accounts; assign dealer access |

### Creating an operator account

Admin → Users → "Add User" → enter email, set role, assign dealership access (for OPERATOR role). The user receives credentials and must change their password on first login.

### Dealer access grants

Admin → Users → select user → "Edit Access" → add or remove dealership assignments. Changes take effect on the next login (session refreshes dealer access list on login).

---

## CLI Operator Tools

For bulk or scripted operations. All require a built backend and a running database.

```bash
npm run dealer:status -- <dealershipId>    # readiness summary + account state
npm run dealer:proof -- <dealershipId>     # generate proof-of-delivery ZIP (all active platforms)
npm run dealer:export -- <dealershipId>    # full inventory + media ZIP export
npm run dealer:invoice -- <dealershipId>   # generate invoice artifact
npm run vehicle:update -- <args>           # bulk vehicle field updates
npm run publish:prepare -- <dealershipId>  # trigger full publish pipeline
npm run sync:scheduler                     # process sync queue (one run, all dealers)
```
