# MVP Scope And Milestones

> **Status as of 2026-06-03:** Milestones 1–4 complete. Milestone 5 (Assisted Channel Workflow) is the next sprint.

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

## ⬜ Milestone 5: Assisted Channel Workflow — NEXT

The gap between Milestone 4 and billing-ready: the system needs to actually track what platform applications have been submitted and what status they're in, so `dealer:status` shows something real instead of 18 NOT_STARTEDs.

Acceptance:

- [ ] `dealer:create` auto-creates `PlatformApplication` rows for each channel in `desiredChannels`
- [ ] FEEDABLE platforms: status moves to `SUBMITTED` after artifact is written
- [ ] ASSISTED platforms: CarGurus/Cars.com/Autotrader packet generated + `SubmissionAttempt` row created
- [ ] `dealer:status <id>` shows at least 12 platforms in non-NOT_STARTED state after `dealer:create`
- [ ] Manual dealer action items appear on DEALER_ACTION_NEEDED platforms
- [ ] Partner attribution stub for PARTNER_DEPENDENT platforms

---

## ⬜ Milestone 6: Revenue Validation

Acceptance:

- [ ] `DealerSubscription` record created on `dealer:create` with setup fee + monthly fee
- [ ] `dealer:invoice <id> <period>` prints billable line items from DB
- [ ] Setup line items: readiness run count, artifact count, platforms activated
- [ ] Monthly line items: active platform count, lead count, vehicle update count
