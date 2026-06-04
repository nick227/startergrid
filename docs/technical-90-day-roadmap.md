# Technical 90-Day Roadmap

> **Status as of 2026-06-03:** Weeks 1–6 complete (Data Foundation, DB-Backed Validation, Artifact Store). Operator scripts from Weeks 11–12 also shipped. See `docs/handoff.md` for current state and next sprint recommendation.

## Product Promise

> "We launch and manage your online dealership footprint."

Two verbs. Both matter equally. **Launch** = readiness → artifacts → platform activation → proof folder.
**Manage** = inventory propagation → status monitoring → lead routing → monthly reporting.

The monthly recurring revenue comes from the manage side. The setup fee proves the launch side.
Build both or the business model doesn't work.

---

## MVP Paid Offer

By day 90, a real dealer can be charged for:

```
Dealer Storefront + Platform Readiness Report + Activation Proof Folder
```

Supported by:

- DB-backed dealer and inventory intake
- Reproducible readiness runs with version tracking
- Real feed artifacts stored with checksums
- Owned storefront with lead capture
- Assisted-channel onboarding tracking
- Inventory change propagation to active platforms
- Dealer-facing status dashboard and proof export

---

## Non-Negotiables

- One physical MySQL DB for MVP
- Credential references only — no raw secrets in DB or code
- Every readiness run links to an inventory snapshot and platform profile version
- Artifact content stored outside DB; DB stores metadata, path, checksum
- Pristine fixture (`validateAll`, `poc:green`, `poc:portal`, `npm test`) remains the regression standard
- `MOCK` / `SANDBOX` / `PRODUCTION` environment must be explicit on every submission attempt, artifact, and credential ref
- Inventory changes are event-sourced — every price change, photo change, sold, removed creates a `VehicleUpdate` record
- Dealer notifications on lead capture and application status changes
- Proof folder must be regenerable from DB records alone — no fixture dependency
- Platform profiles are versioned — a readiness run always names the profile version it ran against

---

## Schema Target (full v4 data model)

Additions beyond current v4 schema:

```
Environment           MOCK | SANDBOX | PRODUCTION
ReadinessRun          links dealer + inventory snapshot + profile versions + results
InventorySnapshot     point-in-time copy of dealer vehicles at run time
PlatformProfileVersion versioned snapshot of a profile at seed/update time
GeneratedArtifact     path, checksum, format, environment, expiry, linked to run/submission
PlatformCredentialRef platform + dealer + environment + encrypted ref + expiry + last validated
DealerNotification    type, channel, payload, delivered_at
```

`SubmissionAttempt` already has `artifactPath`. In v4+ it should reference a `GeneratedArtifact` row instead.

---

## ✅ Weeks 1–2: Data Foundation — COMPLETE (2026-06-03)

**Goal:** Schema and seed pipeline ready. Every subsequent phase builds on top of this.

Build:
- `Environment` enum: `MOCK`, `SANDBOX`, `PRODUCTION`
- `ReadinessRun` model: links dealershipId, inventorySnapshotId, runMode (BASELINE/STRICT), environment, overallStatus, validatorVersion, createdAt
- `InventorySnapshot` model: dealershipId, vehicleCount, snapshotJson (full payload), checksum, createdAt
- `PlatformProfileVersion` model: platformSlug, schemaVersion, profileJson, checksum, seededAt
- `GeneratedArtifact` model: platformSlug, format, filename, storagePath, checksum, sizeBytes, environment, expiresAt, linkedRunId, linkedSubmissionId
- `PlatformCredentialRef` model: platformSlug, dealershipId, environment, credentialKey (opaque ref), expiresAt, lastValidatedAt
- `DealerNotification` model: dealershipId, type (LEAD_CAPTURED | STATUS_CHANGED | ACTION_REQUIRED | REPORT_READY), payload, deliveredAt
- Seed command: insert `PlatformProfileVersion` rows for all 18 current profiles
- Seed command: insert pristine dealer + 2 vehicles from fixtures

Acceptance:
- `prisma db push` applies cleanly from scratch
- Pristine dealer can be persisted via seed
- 18 `PlatformProfileVersion` rows created with checksums
- `npm run typecheck`, `npm test`, `npm run validate:pristine` pass
- `npm run poc:v4` passes
- No raw credentials anywhere in schema or seed data

---

## ✅ Weeks 3–4: DB-Backed Pristine Validation — COMPLETE (2026-06-03)

**Goal:** Every readiness run is reproducible, versioned, and stored. No fixture-only paths for validation.

Build:
- `inventorySnapshotService`: capture point-in-time vehicle+media state from DB into `InventorySnapshot`
- `readinessRunService`: run baseline + strict validation from DB data, persist `ReadinessRun` with all platform results
- `validate:pristine` updated to run from DB mode (not fixture imports)
- Validator version string in `ReadinessRun` (semver or git hash)
- Separate baseline and strict run records per dealer per execution
- `profileVersionService`: look up current `PlatformProfileVersion` by slug, attach to run

Acceptance:
- `npm run validate:pristine` runs entirely from DB (no fixture imports in the hot path)
- All 18 platforms baseline GREEN for pristine dealer
- Strict mode produces 0 RED on pristine dealer
- Two `ReadinessRun` rows created per execution (baseline + strict)
- Each run links to `InventorySnapshot` and all 18 `PlatformProfileVersion` rows
- Re-running produces a new run row with the same results — reproducibility verified

---

## ✅ Weeks 5–6: Artifact Store and Proof Folder — COMPLETE (2026-06-03)

**Goal:** Every output the system generates is tracked, checksummed, and retrievable. Proof folder is the dealer-facing deliverable.

Build:
- `artifactWriterService`: write content to `./exports/{platformSlug}/{filename}`, generate SHA-256 checksum, create `GeneratedArtifact` row
- Artifact generation wired for: Google Vehicle Feed JSON, Meta Catalog CSV, ADF/XML, Owned Storefront JSON, generic FEEDABLE feed, authorization packets, mock receipts
- Proof folder manifest: single JSON document listing all artifacts for a dealer + run, with paths, checksums, generated timestamps
- `proofFolderService`: build manifest from DB `GeneratedArtifact` records — no filesystem scan needed
- Proof folder ZIP export (proof folder service packs all artifact files + manifest into a zip)
- `validate:pristine` generates and stores artifacts as part of the run

Acceptance:
- Every generated output has a `GeneratedArtifact` row
- DB contains metadata only — content lives in `./exports/`
- Proof folder can be regenerated from artifact records alone
- Google Vehicle JSON, Meta CSV, ADF/XML, and owned storefront JSON all covered
- Manifest checksum verifies against stored file checksums
- ZIP export contains all artifacts + manifest with no missing files

---

## ✅ Weeks 7–8: Owned Storefront MVP — COMPLETE (2026-06-04)

**Goal:** The owned channel is live, leads flow into the DB, and dealers get notified.

Build:
- Storefront listing JSON generated from DB inventory (not fixtures)
- Vehicle detail structure (JSON payload per vehicle with full spec + images + lead capture URL)
- `leadCaptureService` wired to DB: owned channel form leads → `Lead` row + `DealerNotification`
- ADF/XML lead routing: generate and deliver ADF payload, parse response, create `Lead` row
- `dealerNotificationService`: on lead capture, create notification row + log delivery (mock email in MOCK env, real SMTP in PRODUCTION)
- Owned channel `PlatformApplication` lifecycle: NOT_STARTED → ACTIVE on submission (no partner review)
- `GeneratedArtifact` row for each storefront JSON output
- Storefront appears in proof folder manifest

Acceptance:
- Pristine dealer storefront artifact generated from DB, stored, checksummed
- Each vehicle has a deterministic detail URL and `leadCaptureUrl`
- Owned channel lead form creates `Lead` row with dealershipId, vehicleId, source, platformSlug, contactInfo
- Lead creation creates `DealerNotification` row
- Storefront `PlatformApplication` is ACTIVE after submission
- Storefront artifact in proof folder

---

## ✅ Weeks 9–10: DB-Backed Inventory Update Propagation — COMPLETE (2026-06-04)

**Goal:** Activation is tracked per platform across all four integration classes. Inventory changes propagate to active platforms.

Build:
- Application creation for dealer-selected channels (all 18 profiles)
- Authorization packet generation from DB snapshots (not live fixture objects) → linked `GeneratedArtifact`
- Submission attempts linked to artifacts via `GeneratedArtifact.linkedSubmissionId`
- Assisted workflow: MOCK_EMAIL submission creates packet + receipt + `SubmissionAttempt` row with artifact link
- `vehicleUpdateService` wired to DB: `VehicleUpdate` row created on price change, photo change, sold, removed
- Propagation dispatch: OWNED → DELTA_UPDATE (immediate DB update), FEEDABLE → FEED_REFRESH (flag artifact for refresh), ASSISTED/PARTNER_DEPENDENT → UPDATE_PACKET (generate update notification)
- SOLD/REMOVED: all active `PlatformApplication` records for that vehicle's dealer flagged; `DealerNotification` created
- Platform profile freshness check: if any profile's `lastVerifiedAt` is older than 180 days, flag in readiness run and operator dashboard
- **First sandbox credential test**: one FEEDABLE platform (Google or Meta) tested against sandbox API with `PlatformCredentialRef` — proves the credential model works before MVP

Acceptance:
- All 18 platform applications creatable from DB dealer record
- CarGurus, Cars.com, Autotrader, TrueCar assisted packets generated and stored as artifacts
- Feedable platform submissions create mock receipts with artifact links
- Price change on one vehicle propagates to all 18 active platform records with correct action per integration class
- SOLD vehicle creates `VehicleUpdate`, updates `Vehicle.soldAt`, triggers REMOVE_LISTING propagation
- One sandbox credential ref stored (no raw key in DB), used for one real API call
- Stale profile (>180 days) appears as WARN in readiness run

---

## ✅ Operator Scripts — COMPLETE (2026-06-03) / ⬜ Weeks 11–12: Dealer Dashboard

**Goal:** A complete demoable flow from dealer profile through to proof export. Operator can run the full cycle without touching code.

**Operator scripts shipped (`dealer:create`, `dealer:status`, `dealer:proof`, `demo:reset`).** Remaining work in this section is the dealer dashboard data layer and the multi-dealer load test.

Build:

**Dealer dashboard (data layer — API or read-only service, not full UI yet):**
- Dealer overview: name, inventory count, active platform count, open action count, lead count (30 days)
- Inventory readiness panel: per-vehicle issue count and severity
- Platform status grid: status badge + headline copy + CTA per platform (using `dealerStatusService`)
- Artifact/proof folder view: list of `GeneratedArtifact` rows with download paths
- Lead list: last 30 days, grouped by source platform
- Application timeline: per platform, ordered status history from `SubmissionAttempt` records

**Operator tools:**
- `dealer:create` script: create dealer + import inventory from JSON → seed DB → run readiness → generate artifacts → build proof folder
- `dealer:status` script: print full status grid for a dealer by ID or slug
- `dealer:proof` script: regenerate and export proof folder ZIP for a dealer
- Operator action log: every assisted-channel interaction (packet sent, status update, manual follow-up note) recorded with operator ID and timestamp
- `platform:refresh` script: re-fetch and version a platform profile, flag staleness delta

**Multi-dealer load test:**
- Seed 5 dealers with 50 vehicles each
- Run full readiness + artifact generation for all 5
- Assert: all 5 dealers have GREEN baseline, artifacts stored, no cross-dealer contamination

Acceptance:
- Full demo can follow: profile → inventory → readiness → storefront → artifacts → submissions → leads → proof export
- Dashboard data layer uses DB only — no fixture imports in the demo path
- Operator can onboard a new dealer end-to-end using scripts, no code changes
- Operator action log shows assisted-channel history with timestamps
- 5-dealer load test passes without errors or cross-contamination
- Proof folder ZIP for pristine dealer contains all expected artifacts

---

## Week 13: MVP Hardening and Revenue Validation

**Goal:** The system is demo-ready for a real dealer and the business can charge for it.

Build:
- Media URL validation job: check each `VehicleMedia.url` returns HTTP 200 with image MIME type; flag dead links as WARN in readiness run
- Landing URL validation job: check each vehicle's `listingUrl` returns HTTP 200; flag dead links
- Stricter issue codes: top 5 blocker types get named codes (e.g., `INVALID_VIN`, `PRICE_SUSPICIOUS`, `MEDIA_MISSING`, `PROFILE_STALE`, `FEED_URL_UNREACHABLE`)
- Full demo reset command: `npm run demo:reset` — wipes demo data, re-seeds pristine dealer, runs full pipeline, exports proof folder
- Deployment checklist: ENV vars required, DB migration steps, seed order, smoke test commands
- Backup/export path: `dealer:export` script dumps all `GeneratedArtifact` files + DB records for a dealer to a portable archive

**Revenue validation milestone:**
- `DealerSubscription` record created for pristine dealer: `MONTHLY_MANAGED`, `setupFeeCents: 100000` ($1,000), `monthlyFeeCents: 39900` ($399)
- Setup invoice line items computable from: readiness run count, artifact count, platforms activated
- Monthly invoice line items computable from: active platform count, lead count, vehicle update count
- Manual invoice generation script: `dealer:invoice {dealerId} {period}` prints billable line items

Acceptance:
- Full demo reset runs clean and produces a complete proof folder
- All tests pass (`npm test`)
- `validate:pristine` passes (DB mode)
- `poc:green`, `poc:risk`, `poc:portal` all pass
- Proof folder generated for pristine dealer with all artifacts present and checksums valid
- No raw credentials in DB, no secrets in code
- `dealer:invoice` prints correct billable items for setup and first month
- Docs match actual command names and flags
- Deployment checklist is accurate and tested

---

## MVP Ready Definition

MVP is ready when all of the following are true:

- A real dealer can be entered once (DB, not fixture)
- Inventory can be imported or seeded from structured JSON
- Readiness can be run, stored, and explained platform by platform
- Storefront is generated, stored, and leads flow to DB
- Feed artifacts are generated, checksummed, and retrievable
- Assisted-channel workflows are tracked with operator action log
- Leads are captured with source attribution per platform
- Proof folder can be exported as a ZIP with manifest
- Application status is current and human-readable per platform
- An operator can onboard a dealer without touching code
- The business can generate a setup invoice from DB data
- All tests pass on a clean DB with no fixture dependency in the hot path

---

## Ongoing Management (Post-MVP, Month 2+)

This is where the recurring revenue lives. Build after MVP:

- **Scheduled inventory refresh**: nightly job re-syncs vehicle status across active platforms; flags vehicles that have been sold for >7 days but still show on feedable platforms
- **Platform profile maintenance cycle**: monthly re-verify of all 18 profiles against source docs; auto-create `PlatformProfileVersion` if checksum differs; notify operator of changes
- **Monthly dealer report**: auto-generated summary email per dealer — active platforms, lead count by channel, inventory changes, readiness score, next recommended actions
- **Dealer notification delivery**: real SMTP in PRODUCTION env; batching + retry on failure
- **Platform health monitoring**: periodic check that active feed URLs return valid responses; flag failures as `DEALER_ACTION_NEEDED`
- **Re-validation triggers**: when a platform profile version changes, auto-queue re-validation for all dealers active on that platform

---

## Aggressive Stretch Goals

Only after all core MVP acceptance gates pass:

- CSV inventory import (dealer uploads a spreadsheet)
- Dealer-facing web UI (beyond data layer — actual HTML/React views)
- Sandbox credential check for a second feedable platform
- Public storefront HTML pages (SEO-ready, schema.org Vehicle markup)
- Proof folder shareable link (time-limited signed URL)
- Structured `ReadinessIssue` model (replaces free-text `ValidationIssue`)
- First external object storage adapter (S3-compatible instead of local `./exports/`)
- ADF/XML webhook endpoint (accept inbound ADF leads from platforms)
- Multi-rooftop dealer group support (one account, multiple locations)
- Basic analytics dashboard (lead trends, platform performance, readiness score over time)

---

## Cut If Behind

Cut these before slipping the core offer:

- Live partner API submission (MOCK → SANDBOX is enough for MVP)
- Managed ads automation
- Finance/F&I fields
- Multi-rooftop dashboards
- White-label agency features
- Full CRM pipeline
- Physical DB split
- Real-time inventory sync (batch nightly is sufficient for MVP)
- Web UI (dashboard data layer is enough for demo)

---

## Risk Register

Track these explicitly — each can slip the timeline by a week or more:

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Platform profile API changes (partner docs out of date) | Medium | High | Weekly profile freshness check; treat MEDIUM confidence as YELLOW in strict mode |
| Prisma migration complexity at schema additions | Low | Medium | Additive-only changes in weeks 1–2; no destructive migrations until after test pass |
| Sandbox credential approval lag (Google/Meta) | High | Medium | Begin sandbox account setup in week 1; sandbox test not on critical path until week 9 |
| Multi-dealer data isolation bugs | Medium | High | Enforce `dealershipId` foreign key on every model; multi-dealer load test in week 11–12 |
| Proof folder ZIP size at scale | Low | Low | Artifact expiry field already in schema; prune old runs after 90 days |
| SMTP deliverability for dealer notifications | Medium | Medium | Use MOCK env notification log for MVP; SMTP only required for PRODUCTION flag |
| "Cut if behind" discipline | High | High | PM reviews cut list every Friday before adding scope |

---

## Weekly Scorecard

Track every Friday:

**Technical health:**
- Passing tests (target: 100%)
- Pristine baseline GREEN count (target: 18/18)
- Strict RED count (target: 0)
- `validate:pristine` DB mode: pass/fail
- Open schema blockers
- Open platform profile blockers (stale, needs review)

**Business readiness:**
- Platforms with full activation proof (artifact + submission + receipt)
- Leads captured in DB (owned + ADF)
- Proof folders generated and exportable
- Operator scripts functional (create, status, proof, invoice)
- Invoice line items computable: yes/no
- Demo reset command: pass/fail

**Manage side health (weeks 9+):**
- Vehicle updates propagated correctly: yes/no
- SOLD vehicles removed from active platforms: yes/no
- Platform profile freshness: any profiles >180 days old?
- Dealer notification delivery log: any failures?

---

## Architecture Principles (standing)

These apply to every decision through the roadmap:

1. **DB is the truth, artifacts are the proof.** If it's not in the DB, it didn't happen. If it's not in the proof folder, the dealer can't see it.
2. **Environment tagging is non-negotiable.** MOCK, SANDBOX, PRODUCTION must be explicit on every external interaction. Never silently submit to a live API.
3. **The pristine fixture is the regression contract.** Every phase must pass `npm test`, `poc:green`, `poc:risk`, `poc:portal`, and `validate:pristine` without modification.
4. **Additive schema changes only until MVP.** No destructive migrations. If a field is wrong, add the correct one and deprecate the old one.
5. **Operator-first before dealer-first.** The operator must be able to run the full lifecycle from CLI before building any dealer-facing UI. A demo that requires code changes is not a demo.
6. **The manage side funds the month.** Every sprint should include at least one manage-side improvement alongside launch-side features. Don't let the recurring revenue story slip to month 2.
