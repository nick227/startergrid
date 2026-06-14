# MVP Scope And Milestones

> **Status as of 2026-06-04:** Milestones 1–5 complete. Milestone 6 (Revenue Validation) is the next sprint.

## MVP Thesis

Sell the first product as:

```txt
Dealer Storefront + Readiness Report + Platform Activation Proof Folder
```

Do not sell it as a full DMS, full CRM, agency, lender system, or guaranteed marketplace approval service.

## Must Ship

- [x] DB-backed dealer profile
- [x] DB-backed inventory and media
- [x] Dealer Storefront owned channel (artifact generated; HTTP serving TBD)
- [x] Pristine fixture import path
- [x] Readiness run tied to dealership and inventory snapshot
- [x] Generated artifacts for owned, feedable, assisted, and lead channels
- [ ] Submission attempt records linked to artifacts (schema ready; not wired into dealer:create yet)
- [x] Dealer-facing status labels
- [ ] Lead capture for owned storefront (service exists; no HTTP endpoint yet)
- [x] Proof folder export

## Not MVP

- Finance applications
- Lender routing
- Accounting
- Service department workflows
- Automated paid ad optimization
- Guaranteed marketplace activation
- Live API credentials for every partner
- Full DMS import marketplace

---

## ✅ Milestone 1: DB-Backed Pristine Dealer — COMPLETE (2026-06-03)

Acceptance:

- [x] `pristineApiDealership` persists via `db:seed` or `dealer:create:pristine`
- [x] All pristine vehicles persist with media
- [x] No JSON-only shortcut for fields that are now stable
- [x] `npm run validate:pristine` still passes
- [x] `npm run validate:pristine:db` passes (new: reads from DB)

---

## ✅ Milestone 2: Readiness Runs Are Dealer-Specific — COMPLETE (2026-06-03)

Acceptance:

- [x] Readiness run stores `dealershipId`
- [x] Run references inventory snapshot (via `inventorySnapshotId`)
- [x] Baseline and strict results stored together in `resultsJson`
- [x] Run stores `greenCount`, `yellowCount`, `redCount`, `overallStatus`, `validatorVersion`

---

## ✅ Milestone 3: Storefront Artifact Active — COMPLETE (2026-06-03)

Acceptance:

- [x] Dealer storefront artifact generated from DB data (`dealer:create:pristine`)
- [x] Artifact stored with checksum and registered in `GeneratedArtifact`
- [ ] HTTP server to serve the storefront JSON — **not yet built**
- [ ] Lead capture via live HTTP form — **not yet built**
- [ ] Owned channel `PlatformApplication` status → ACTIVE — **not wired yet**

---

## ✅ Milestone 4: Proof Folder Export — COMPLETE (2026-06-03)

Acceptance:

- [x] Dealer profile summary in manifest
- [x] Inventory readiness run linked in manifest
- [x] All 18 platform feed artifacts in ZIP
- [x] Lead count and active platform count in manifest
- [x] Checksums included per artifact
- [x] `dealer:proof <id>` produces a ZIP with manifest.json

---

## ✅ Milestone 5: Activation Status Foundation — COMPLETE (2026-06-04)

The gap between Milestone 4 and billing-ready: the system now tracks what platform applications have been submitted and what status they're in, so `dealer:status` shows real lifecycle state instead of 18 NOT_STARTEDs.

Acceptance:

- [x] `dealer:create` auto-creates `PlatformApplication` rows for all 18 platforms
- [x] FEEDABLE platforms: status moves to `SUBMITTED` after artifact is written
- [x] ASSISTED platforms (CarGurus, Cars.com, LinkedIn, Apple): auth packet generated + `SubmissionAttempt` (MOCK_EMAIL) created
- [x] `dealer:status <id>` shows 16/18 platforms in non-NOT_STARTED state after `dealer:create` (1 ACTIVE, 15 SUBMITTED, 2 PARTNER_REQUIRED)
- [x] Partner attribution: PARTNER_DEPENDENT platforms get `PARTNER_REQUIRED` status + nextAction
- [x] Open actions list printed in `dealer:status` footer
- [x] `PARTNER_REQUIRED` added to `ApplicationStatus` enum (schema + types + service)
- [x] 136 tests passing (15 new tests in `applicationActivation.test.ts`)

---

## ✅ Milestone 6: Revenue Validation — COMPLETE (2026-06-04)

Acceptance:

- [x] `DealerSubscription` record upserted on `dealer:create` (plan: MONTHLY_MANAGED, setup: $1,000, monthly: $399)
- [x] `dealer:invoice <id> <period>` prints setup + monthly billable statements from DB
- [x] Setup line items: readiness run count, artifact count, platforms activated, proof folder reference
- [x] Monthly line items: active platform count, lead count (period-scoped), vehicle update count (period-scoped)
- [x] 160 tests passing (24 new tests in `invoiceService.test.ts`)
