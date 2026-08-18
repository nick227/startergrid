# Product Analysis: Auto Dealer Sales Portal

## Purpose
The application is a dealer marketplace operations platform with two distinct surfaces:

1. **Operator Portal** (`apps/web`) — internal staff and dealers manage dealer onboarding, inventory, platform accounts, publishing readiness, sync queue status, and leads.
2. **Consumer Marketplace** (`apps/marketplace`) — a public buyer-facing browsing site for marketplace-eligible inventory across categories like automotive, boats, and trailers.

The core backend (`src/`) owns the truth: inventory, platform readiness, feed/artifact generation, publish queue, sync history, and performance benchmarks.


## What this application does

- Centralizes dealer inventory and vehicle metadata.
- Validates inventory against each destination platform’s requirements.
- Manages platform connections, OAuth account linking, and channel enablement.
- Generates publish-ready artifacts and queues dispatch events.
- Tracks queue state, publish history, and performance signals.
- Seeds demo dealers and marketplace listings for testing.
- Exposes a public marketplace for consumer browsing and lead capture.


## Main user roles

### Operator / Dealer user
- Logged into the operator portal.
- Can access one or more dealerships based on assigned access.
- Manages inventory, platform readiness, and publishing workflows.
- Views performance and sync history for dealer inventory.
- Reviews inbound lead activity.

### SUPER_ADMIN
- Full access to everything.
- Can manage dealers, operator users, platform availability, triage, audit logs, and system health.
- Accesses the admin overview panel.

### Marketplace consumer
- Browses category sites.
- Filters and searches listings.
- Views listing details and seller profiles.
- Saves favorites and submits inquiries.


## Main user journeys

### 1. Operator onboarding flow

- Login as operator or SUPER_ADMIN.
- If assigned to multiple dealers, choose a dealer from the Dealer Picker.
- Arrive on the dealer Home page, which presents the publishing flow and dealership profile state.
- Use the left nav to move between Home, Inventory, Platforms, Reports, Leads, and Knowledge Base.


### 2. Inventory management path

- Open `Inventory`.
- Review vehicle list with readiness and publishing status.
- Add vehicles by VIN, bulk VIN import, CSV import, or JSON ingest.
- Upload photos and mark status for each vehicle.
- Use filters to find blocked, ready, or queued inventory.
- Drill into a vehicle detail panel to inspect readiness, channel selection, and publish controls.


### 3. Platform readiness and publish path

- Open `Platforms`.
- Review platform account connection status and readiness summary.
- Complete OAuth connections for platforms that require it.
- Find platform-specific blockers and next actions.
- Manage the platform queue or view the publish history.
- Use platform details to diagnose why specific vehicles are blocked or failing.


### 4. Sync / reporting path

- Open `Reports`.
- Review channel velocity, inventory health, sync activity, and performance benchmarks.
- Use reports to understand which platforms are most effective and where inventory is stuck.


### 5. Lead management path

- Open `Leads`.
- View inbound inquiries from marketplace and other channels.
- Route leads via configured notification channels.


### 6. SUPER_ADMIN admin path

- Access `Admin` home.
- Use tabs for System, Dealers, Platforms, Triage, Audit, Insights, and Users.
- Add new dealers or admin users.
- Monitor blocked dealers and system health.
- Manage platform availability across the entire product.


### 7. Consumer marketplace path

- Open the public marketplace home or category site.
- Browse marketplace categories and collections.
- Search and filter listing feeds.
- View listing details, seller profiles, and inquiry forms.
- Save favorites and track recent views.


## UX breakdown for admins and users

### Admin UX (SUPER_ADMIN)

#### Goals
- Rapidly identify broken dealers and blocked platforms.
- Prioritize triage actions.
- Manage platform availability and user access.
- Keep system health visible.

#### Current strengths
- Separate admin tab with clear sections.
- Dealer triage and platform overview available.
- Role-based access enforcement.

#### Potential usability issues
- Dense admin nav may feel overwhelming.
- High-information panels may need more actionable summaries.
- “Triage” and “insights” labels can be abstract for staff who want immediate next steps.
- Audit and user management may feel disconnected from dealer issues.

#### Improvement ideas
- Add a single “Action required” card on admin home with top 3 issues.
- Use plain-language status badges like “Dealers blocked”, “Platform OAuth needed”, “System healthy”.
- Provide quick ticket-style actions: “Review blocked dealer”, “Reconnect Google Account”, “Create operator user”.
- Add contextual help tooltips for admin terminology.


### Operator UX (dealer-facing admin)

#### Goals
- Turn messy dealer inventory into platform-ready listings.
- Connect and configure platform channels.
- See what actions are required next.
- Measure whether inventory is actually moving.

#### Current strengths
- Operator route structure is clear: Home → Inventory → Platforms → Reports → Leads.
- Inventory page includes publish guidance and connection summary.
- Platform page brings platform status, account detail, and queue together.
- Home page uses a publishing flow comic to orient users.

#### Potential usability issues
- Jargon is heavy: “publish”, “sync”, “queue”, “readiness”, “dispatch”, “platform account”, “publish artifact”.
- Operators may not know which screen is the single source of truth for “what to do now.”
- Inventory and platform readiness are separate; operators may lose the connection between vehicle issues and channel issues.
- Auto-sync behavior can be invisible.

#### Improvement ideas
- Add a “Next action” panel on every dealer page summarizing the most urgent fix.
- Rename or simplify labels: “Publish” → “Send to channel”, “Queue” → “Pending sends”, “Readiness” → “Ready to publish”.
- Surface the most urgent vehicle issues in the Home page, not just general readiness.
- Make platform connect status more obvious with a “Connect now” CTA.
- Add inline guidance when vehicles fail due to missing photos or missing account connection.
- Add a persistent badge that shows “Inventory sync is running” vs “No dispatch enabled”.


### Marketplace consumer UX

#### Goals
- Discover inventory quickly by category.
- Compare listings across dealers.
- Contact dealers with a simple inquiry flow.

#### Current strengths
- Category-specific site structure with buyer-friendly templates.
- Search, filters, and listing detail pages are separated.
- Favorites and profile pages support shopper workflows.

#### Potential usability issues
- Brand separation between operator and marketplace may confuse internal users.
- Category pages could be too generic if marketplace is not live yet.
- Listing detail actions need clear buyer trust signals.

#### Improvement ideas
- Add a “Marketplace active” banner when the site is live, and a “Not yet available” copy when closed.
- Present seller trust information clearly on listing pages.
- Show “Cars near you” or “Available now” highlights for more immediate discovery.
- Keep the buyer inquiry flow small and focused: “Send message”, “Save listing”, “Visit dealer page”.


## Main product opportunities

### 1. Make the publish workflow more explicit
- The product is fundamentally about getting inventory live on platforms.
- A clear “Prepare → Review → Send” workflow should be visible on the Home and Inventory pages.
- Support this with a progress strip and explicit “What’s next?” steps.

### 2. Reduce jargon and clarify outcomes
- Replace platform engineering terms with business outcomes.
- Example: “Platform connection” → “Channel ready to publish”.
- Example: “Sync queue” → “Pending channel sends”.

### 3. Connect inventory actions to platform readiness
- When a vehicle fails a platform check, show the reasons in the same flow where the operator reviews the vehicle.
- Use color-coded status and example fixes.

### 4. Make admin triage action-oriented
- Admins want a single screen that answers “What is broken?” and “What do I do next?”
- Add unified blocked dealer, account issue, and platform outage cards.

### 5. Improve first-time dealer setup
- Guided onboarding for new dealerships: business info → documents → inventory → platform connect → publish.
- Use checklist-style progress and a safe starter path for demo inventory.


## Recommended UX review focus areas

- **Home / publishing status:** is the operator immediately sure what to do next?
- **Inventory page:** can the user see readiness, publish eligibility, and channel exclusion in one view?
- **Platform page:** are account connection, readiness, and queue state clearly distinct?
- **Admin panel:** does the SUPER_ADMIN see the top system risks without digging?
- **Marketplace:** does buyer discovery feel intuitive and trustable?


## Suggested next steps

1. Run a quick heuristic review of the operator Home, Inventory, and Platforms pages.
2. Simplify the language on the left nav and the page headings.
3. Add a “Most urgent issue” panel to Home and Platforms.
4. Create a short wizard for first-time dealer onboarding.
5. Validate the marketplace category home and listing CTA flow with a quick buyer scenario.


## Conclusion

This product is a powerful channel operations console with a public buyer marketplace on the side. The core value is in making dealer inventory publish-ready and tracking platform distribution. To reduce confusion, the UX should be refocused on clear next actions, less technical vocabulary, and tighter connection between inventory issues and platform status.
