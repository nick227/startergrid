# Marketplace Production Go-Live Plan
_Date: 2026-06-11 | Scope: consumer marketplace app, marketplace API, supporting mock/seed/data flows_

---

## Current Readiness Call

The marketplace is **demo-ready**. It is **not yet production-ready**.

Verified for demo:

- Marketplace typecheck passes.
- Marketplace production build passes.
- Marketplace test suite passes: 29 files, 154 tests.
- Component-system migration is underway with compatibility shims.

Known production concerns:

- Marketplace lint is blocked by missing ESLint flat config.
- `npm install` reports 4 audit vulnerabilities: 2 moderate, 2 critical.
- Build warns about a large ZIP centroid chunk.
- The worktree is very dirty; production release scope must be isolated.
- Recent UI/component moves rely on compatibility shims that should be accepted intentionally, not accidentally.

Go-live should not happen until the gates below are satisfied.

---

## Go-Live Decision Rule

Production launch requires a written launch decision with one of these outcomes:

- **Go**: all launch blockers closed; known non-blockers accepted with owners and dates.
- **No-go**: one or more launch blockers remain.
- **Limited go**: launch is restricted by category, dealer group, traffic percentage, geography, or authentication mode.

No informal launch based only on “demo looks good.”

---

## Launch Blockers

These must be resolved before full production launch.

### 1. Security And Dependency Risk

Required:

- Run `npm audit`.
- Triage all critical and high severity findings.
- Patch, replace, or formally accept each finding.
- Document accepted risks with package, severity, exploitability, affected runtime, mitigation, and owner.

Blocking:

- Any exploitable critical dependency in the production marketplace path.
- Any auth/session/security dependency issue without mitigation.

### 2. CI Verification Must Match Local Verification

Required CI checks:

- Typecheck.
- Marketplace build.
- Marketplace tests.
- Boundary checks.
- Server/API tests that cover marketplace routes.
- Prisma/schema validation if database changes are included.

Blocking:

- Local-only verification.
- Tests disabled to pass CI.
- Build warnings promoted to runtime failures in deployment environment.

### 3. Lint Tooling Must Be Fixed Or Explicitly Waived

Current issue:

- `npm run lint --workspace apps/marketplace` fails because ESLint 10 expects `eslint.config.*`.

Required:

- Add the correct ESLint flat config, or
- Remove/fix the broken lint script, or
- Formally waive lint for first launch with a short expiration date.

Blocking:

- Pretending lint passed when the command cannot run.

### 4. Release Scope Must Be Isolated

Current issue:

- The repository contains many unrelated modified files.

Required:

- Create a clean release branch.
- Include only intended marketplace/API/schema/data changes.
- Review generated files separately from hand-authored files.
- Confirm no unrelated docs, mock data, operator app, splash app, or package churn is bundled by accident.

Blocking:

- Shipping from the current dirty worktree without scope review.

### 5. Runtime API Contract Must Be Stable

Required:

- Marketplace frontend must use only marketplace-safe API/client imports.
- OpenAPI marketplace contract must match deployed server routes.
- Auth, favorites, lead capture, listing report, seller detail, feed, and detail endpoints must be smoke-tested against the deployment target.

Blocking:

- Frontend requiring operator/admin APIs.
- Contract mismatch between generated client and deployed API.
- Any route returning mock-only assumptions in production mode.

### 6. Data Quality Must Be Production-Acceptable

Required:

- Listings have valid title, price, seller, category, availability, media fallback, and detail route.
- Sold/unavailable listings are handled consistently.
- Missing media, missing price, missing seller location, and stale listings have explicit UI behavior.
- Category copy does not leak automotive language into non-automotive categories.

Blocking:

- Broken listing detail pages for live inventory.
- Incorrect price/availability presentation.
- Seller identity ambiguity.
- Misleading “available” state.

### 7. Lead Capture Must Be Operational

MVP goal:

- A buyer can submit a marketplace inquiry from a live listing, the system persists the lead against the correct dealer and listing, the dealer has a reliable way to receive or inspect it, and operations can detect and recover failed delivery.

Related PoC plan:

- `docs/plans/2026-06-11-marketplace-lead-capture-crm-dms-poc.md`

Required:

- Lead form submits to the correct backend.
- Required validation is enforced server-side.
- Dealer routing is correct.
- Failure states are visible to buyers.
- Submitted leads are stored, delivered, or queued with retry.
- Duplicate submission behavior is defined.

MVP scope:

- Buyer form:
  - Keep the public form simple: name, email, phone, optional message.
  - Require at least one contact method.
  - Show clear validation, submitting, success, and failure states.
  - Do not accept buyer-supplied dealer IDs, VINs, stock numbers, platform slugs, or listing ownership fields.

- Runtime API:
  - `POST /api/marketplace/vehicles/{listingId}/leads` remains public-write, rate-limited, and server-validated.
  - The backend resolves the dealer from the listing, not from the submitted payload.
  - Sold, removed, missing, wrong-category, and zero-price listings must not create leads.
  - The response may include the generated `leadId`, but no raw dealer/private listing data.

- Persistence:
  - Persist every accepted lead in the canonical `Lead` table.
  - Store `platformSlug = consumer-marketplace`.
  - Store `vehicleId`, `dealershipId`, submitted contact fields, message, and a minimal `vehicleInterest` snapshot.
  - Record a first-party `INQUIRY_SUBMITTED` channel event for marketplace performance reporting.

- Dealer notification:
  - Create a `DealerNotification` row for every accepted lead.
  - Attempt email delivery to the dealer primary contact when configured.
  - Mark notification delivery as `SENT` or `FAILED`.
  - Lead persistence must not roll back because email delivery failed.

- Operations fallback:
  - Provide an operator-visible path to inspect leads and failed lead notifications before launch.
  - Failed notifications must be queryable by dealer, listing, date, and delivery status.
  - MVP may use an internal admin/reporting view or documented database-backed runbook, but it cannot depend on digging through logs only.

- Duplicate handling:
  - Define MVP behavior as "accept duplicate submissions, rate-limit abusive bursts, and preserve each submitted lead."
  - Do not silently discard repeat inquiries in the first release.
  - Add later dedupe only if dealers see noisy duplicates in production.

- Privacy and safety:
  - No marketplace GET endpoint exposes raw lead contact data.
  - Lead payloads must remain strict and reject unknown fields.
  - Public-write abuse limits must be active in the deployment target, not only in local tests.

MVP acceptance checks:

- Submitting a valid inquiry from the VDP returns `201` and a `leadId`.
- Empty contact payload returns `400`.
- Invalid email returns `400`.
- Unknown or forbidden fields return `400`.
- Missing, sold, removed, or ineligible listing returns `404` and creates no lead.
- Repeated submissions over the configured public-write limit return `429`.
- Accepted lead row has the expected `dealershipId`, `vehicleId`, `platformSlug`, contact fields, and message.
- Accepted lead creates a `DealerNotification` row.
- Dealer notification delivery success marks `SENT`.
- Dealer notification delivery failure marks `FAILED` while preserving the lead.
- Channel event is recorded as `INQUIRY_SUBMITTED`.
- Buyer sees a clear success state after acceptance and a clear retryable error state after failure.

Recommended first implementation tasks:

1. Add a focused marketplace lead route/service integration test that proves dealer resolution, lead persistence, notification creation, and channel event recording in one path.
2. Add a notification failure test that proves the lead still exists when email delivery fails.
3. Add an operator-facing failed-notification inspection path or a short production runbook if the UI is not ready for MVP.
4. Add a smoke script or checklist entry for VDP lead submission against the deployment target.
5. Confirm the production environment has public-write rate limit settings and dealer primary contact data for launch dealers.

Blocking:

- Leads silently failing.
- Leads going to the wrong dealer.
- No operational path for dealers to receive or inspect leads.
- Lead accepted by the buyer UI but absent from persistence.
- Notification delivery failure with no operational recovery path.

### 8. Auth And Favorites Must Be Deliberate

Required:

- Sign-in, sign-out, session refresh, and unauthorized states are tested.
- Favorite add/remove behavior is tested across page refresh and category context.
- Favorites are scoped correctly by user and category.

Blocking:

- Auth modal dead ends.
- Favorites leaking across users.
- Favorites relying only on local UI state when production expects persistence.

### 9. Reporting And Abuse Flow Must Be Owned

Required:

- Report listing submission works.
- Reports are stored with reason/details/listing/user context where available.
- An internal review path exists.
- Buyers see success/failure feedback.

Blocking:

- Reports accepted in UI but not reviewable.
- Fraud/scam reports with no owner or process.

### 10. Deployment And Rollback Must Be Ready

Required:

- Deployment target is known.
- Required environment variables are documented and present.
- Health check or smoke route exists.
- Rollback command/process is documented.
- Previous stable build or deployment is available.

Blocking:

- No rollback path.
- Missing production environment variables.
- Deployment depends on manual local machine state.

---

## Pre-Launch Verification Checklist

Run these commands from repo root.

```bash
npm install
npm run typecheck --workspace apps/marketplace
npm run build --workspace apps/marketplace
npm run test --workspace apps/marketplace
npm audit
```

Also run the relevant root/server checks before production:

```bash
npm test
npm run build
```

If root scripts are too broad or currently unstable, document which scripts are authoritative for launch and why.

---

## Manual Smoke Test Checklist

Run against the deployment candidate, not only local dev.

### Marketplace Index

- Sites index loads.
- Active categories link to browse pages.
- Coming soon/disabled categories behave intentionally.
- Header/navigation works on desktop and mobile.

### Browse Page

- Feed loads.
- Search works.
- Advanced filters open/close.
- Active filter chips remove filters.
- Sort works.
- Grid/list view works.
- Location radius and nationwide toggle work.
- Empty/no-results states are understandable.
- Infinite loading does not duplicate or skip items.

### Listing Cards

- Images load or show fallback.
- Price, condition, seller, location, availability, fulfillment, and badges render correctly.
- Favorite button works.
- Quick view opens and closes.
- Compare works where enabled.
- Cards are tappable on mobile.

### Detail Page

- Detail page loads from card.
- Back-to-results returns to the prior filtered list.
- Gallery/lightbox works.
- Price and specs are accurate.
- Seller/location are accurate.
- Lead form submits.
- Similar listings render or hide cleanly.
- Share works.
- Report listing works.

### Favorites

- Unauthenticated user path is intentional.
- Authenticated user can save and remove listings.
- Saved listings page loads.
- Unavailable favorites are handled.

### Seller Page

- Seller profile loads.
- Seller listings load.
- Empty/error states are clear.

### Mobile

- Browse controls do not overwhelm the viewport.
- Sticky/header behavior does not cover important actions.
- Detail media and lead form are reachable.
- Modals/drawers close reliably.

---

## Monitoring Requirements

Production launch should include basic monitoring for:

- Feed endpoint failures.
- Detail endpoint failures.
- Lead submission failures.
- Report submission failures.
- Auth failures.
- Favorite add/remove failures.
- Frontend uncaught exceptions.
- Slow responses for feed/detail/search.

Minimum metrics:

- Page load count.
- Listing detail views.
- Lead submissions.
- Lead submission failure rate.
- Favorite actions.
- Report listing submissions.
- Search/filter usage.

Minimum alerts:

- Lead submission error spike.
- Marketplace API 5xx spike.
- Frontend error spike.
- Deployment health check failure.

---

## Rollback Plan

Before launch, document:

- Current production version.
- New release identifier.
- Deployment command.
- Rollback command.
- Database rollback/migration posture.
- Who can execute rollback.
- How long rollback should take.

Rollback triggers:

- Lead submission broken.
- Detail pages broken for live inventory.
- Marketplace API 5xx above accepted threshold.
- Auth/session failures affecting buyers.
- Incorrect price or availability displayed.
- Severe mobile usability issue blocking browse/contact.

---

## Launch Modes

Prefer a controlled launch over a broad launch.

Options:

- Internal-only production smoke.
- One category only.
- One dealer or dealer group only.
- Limited traffic.
- No-index/search-hidden launch.
- Lead capture disabled until dealer routing is verified.

Recommended first production mode:

- One live category.
- Known test dealers.
- Real API and persistence.
- Internal monitoring.
- Explicit rollback owner online.

---

## Post-Launch First 24 Hours

Check at 15 minutes, 1 hour, 4 hours, and 24 hours:

- Feed availability.
- Detail page availability.
- Lead submissions and routing.
- Error logs.
- Report listing submissions.
- Auth/favorite behavior.
- Mobile session recordings or screenshots if available.
- Any dealer complaints about bad listing data.

Do not start large UI refactors during the first 24 hours unless needed to fix launch blockers.

---

## Non-Blocking But Important Follow-Ups

- Fix ESLint flat config.
- Reduce ZIP centroid bundle size or improve code splitting.
- Continue component migration away from compatibility shims.
- Add import boundary enforcement for legacy component folders.
- Improve modal focus management for quick view/report/auth.
- Add visual regression coverage for browse/detail/favorites.
- Add production-grade analytics dashboard.
- Review accessibility with keyboard and screen reader flows.

---

## Final Go-Live Signoff

Before launch, fill this out:

| Area | Owner | Status | Notes |
| --- | --- | --- | --- |
| Frontend build/test |  |  |  |
| Marketplace API |  |  |  |
| Auth/session |  |  |  |
| Leads |  |  |  |
| Reporting/abuse |  |  |  |
| Data quality |  |  |  |
| Monitoring |  |  |  |
| Rollback |  |  |  |
| Security/audit |  |  |  |
| Business approval |  |  |  |

Launch decision:

- [ ] Go
- [ ] Limited go
- [ ] No-go

Decision maker:

Date/time:

Notes:
