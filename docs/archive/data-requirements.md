# Data Requirements And Roadmap

Last updated: 2026-06-03

## Purpose

This document captures the current data model for the Auto Dealer Sales Portal POC and lays out the next data architecture goals.

The current implementation uses one MySQL datasource through Prisma. That is acceptable for the POC, but the product is already showing clear bounded data domains:

- dealer identity
- inventory
- platform registry
- validation/readiness
- submissions/integrations
- leads
- business/subscription state
- credentials and partner secrets

The guiding strategy is:

```txt
One ingress. Multiple bounded data domains.
```

Single ingress keeps onboarding convenient. Domain boundaries keep validation, ownership, security, and lifecycle rules clean.

## Current Physical Store

Current datasource:

```txt
provider: MySQL
env: DATABASE_URL
schema: prisma/schema.prisma
```

The current schema is still one database, but it already contains several conceptual domains.

## Current Domains

### Dealer Profile Domain

Current model:

```txt
DealershipProfile
```

Current fields include:

- legal name
- DBA name
- dealer license
- rooftop address JSON
- website URL
- primary contact JSON
- inventory size
- desired channels JSON
- document references JSON
- timestamps

Current relationships:

- vehicles
- platform applications
- leads
- vehicle updates
- dealer subscription

Requirements:

- Must be the source of truth for dealer identity.
- Must support complete profile validation before platform submission.
- Must preserve enough detail for partner-assisted onboarding packets.
- Must be auditable because legal/license/contact data can affect platform approval.

Near-term improvements:

- Normalize address/contact/documents out of opaque JSON once workflows stabilize.
- Add account/tenant ownership.
- Add profile verification state.
- Add document status, expiration, and review metadata.

### Inventory Domain

Current models:

```txt
Vehicle
VehicleMedia
VehicleUpdate
```

Current vehicle fields include:

- VIN
- stock number
- year/make/model/trim
- mileage
- price
- condition
- exterior/interior color
- body style
- drivetrain
- fuel type
- transmission
- options JSON
- STAR core JSON
- sold/removed timestamps

Current media fields include:

- URL
- kind
- sort order
- dimensions
- MIME type

Current update event fields include:

- update kind
- previous value
- new value
- propagated platforms

Requirements:

- Must support high-change inventory workflows.
- Must support per-platform field validation.
- Must track sold, removed, relisted, price change, photo change, and detail-change flows.
- Must preserve enough source data to regenerate catalog/feed/API outputs.

Near-term improvements:

- Add inventory source metadata, such as DMS/feed/manual import.
- Add canonical vehicle taxonomy fields.
- Add media validation status and image fetch checks.
- Add inventory version/snapshot IDs for reproducible submissions.
- Consider splitting inventory into its own database once imports and updates become frequent.

### Platform Registry Domain

Current model:

```txt
PlatformProfile
```

Current fields include:

- slug
- name
- kind
- integration class
- submission methods
- required dealership fields
- required vehicle fields
- required media rules
- output format
- schema version
- last verified date
- profile confidence
- needs review
- source note
- mock endpoint
- integration URLs
- source URLs
- test fixtures

Current platform count:

```txt
18 platform profiles
```

Current platform categories:

- owned storefront
- vehicle/catalog ad feeds
- social catalog ads
- marketplaces
- lead routing
- local discovery
- local advertising

Requirements:

- Must be treated as product/partner knowledge, not dealer data.
- Must capture public docs, partner portals, feed/API bases, confidence, and freshness.
- Must distinguish live API/feed integration from assisted partner workflows.
- Must support strict mode to prevent medium-confidence or partner-dependent platforms from looking production-ready.

Near-term improvements:

- Add platform profile history/versioning.
- Add source verification jobs.
- Add explicit credential requirements per platform.
- Add capability flags, such as `supportsInventoryDelta`, `supportsLeadSync`, `supportsCatalogApi`, `requiresPartnerAgreement`.
- Consider splitting into its own registry database or config service.

### Platform Application Domain

Current models:

```txt
PlatformApplication
AuthorizationPacket
SubmissionAttempt
```

Current application fields include:

- dealership
- platform
- status
- referral code
- missing fields
- next action
- notes

Current packet fields include:

- authorization key
- scope
- verification URL
- revocation URL
- dealership snapshot
- platform snapshot
- inventory snapshot
- packet payload
- revoked timestamp

Current submission fields include:

- method
- destination
- subject
- payload
- status
- response
- receipt JSON
- mock accepted flag
- rejection reasons
- artifact path

Requirements:

- Must track the lifecycle from readiness to packet generation to submission to active/rejected state.
- Must store immutable-enough snapshots used for each submission.
- Must support idempotency and retry-safe future live API calls.
- Must keep partner response data separate from canonical dealer/inventory data.

Near-term improvements:

- Add external platform IDs per application/submission.
- Add idempotency keys.
- Add retry state and attempt numbers.
- Add webhook/callback correlation.
- Add live-vs-mock environment field.
- Add artifact records instead of only paths embedded in submissions.

### Validation And Readiness Domain

Current model:

```txt
MockValidationRun
```

Current fields include:

- platform
- validation status
- overall readiness
- summary
- results JSON
- platform results JSON
- timestamp

Current code-level reports include:

- baseline readiness
- strict readiness
- schema freshness
- profile confidence
- generated outputs
- issues
- next action

Requirements:

- Must support reproducible readiness decisions.
- Must explain why a platform is GREEN, YELLOW, or RED.
- Must separate baseline mock readiness from strict launch readiness.
- Must provide historical comparison: why did readiness change?

Near-term improvements:

- Promote validation runs from mock-only naming to general readiness runs.
- Add dealership and inventory snapshot references.
- Add validator version.
- Add issue codes and remediation metadata.
- Add scenario type: baseline, strict, stale profile, negative fixture, pristine fixture, live API preflight.

### Lead Domain

Current model:

```txt
Lead
```

Current fields include:

- dealership
- optional vehicle
- source
- platform slug
- contact name/email/phone
- message
- vehicle interest JSON
- ADF payload JSON
- timestamp

Requirements:

- Must support owned storefront, ADF/XML, platform forms, and manual lead capture.
- Must preserve source/platform attribution.
- Must support vehicle-specific and general dealership inquiries.

Near-term improvements:

- Add consent and marketing opt-in metadata.
- Add lead status/assignment.
- Add deduplication keys.
- Add raw payload storage by source.
- Add CRM delivery attempts.

### Business / Subscription Domain

Current model:

```txt
DealerSubscription
```

Current fields include:

- dealership
- plan
- setup fee
- monthly fee
- active dates
- status
- timestamps

Requirements:

- Must support commercial packaging and activation.
- Must not become tangled with platform validation logic.

Near-term improvements:

- Add billing customer references.
- Add plan capability limits.
- Add invoices/payment status through a billing integration.
- Add entitlement checks for platform/channel access.

## Current Validation Assets

Current fixtures:

- default mock dealer/inventory fixtures
- negative dealership fixture
- negative vehicle fixture
- stale platform profile fixture
- pristine API validation fixture

Current scripts:

```txt
npm run validate
npm run validate:pristine
npm run poc:green
npm run poc:risk
npm test
```

Requirements:

- The pristine fixture must remain documentation-grade.
- The negative fixtures must remain intentionally broken.
- The risk matrix must keep proving that GREEN is meaningful.

## Proposed Future Data Stores

The product does not need all stores split immediately. The recommendation is to introduce boundaries first, then split physical databases when justified.

### Phase 1: One Database, Strong Domain Boundaries

Keep one MySQL database.

Actions:

- Prefix or group tables by domain in docs and migrations.
- Add domain-level services rather than cross-writing everywhere.
- Stop adding new opaque JSON fields when data has stable meaning.
- Add explicit snapshot/version models for readiness and submissions.

### Phase 2: Separate Credentials Store

Credentials should not live in the normal app database.

Store externally:

- OAuth access tokens
- refresh tokens
- API keys
- SFTP credentials
- webhook secrets
- partner app secrets

Application DB should store only:

```txt
credentialRef
platformSlug
dealershipId
environment
status
lastVerifiedAt
```

Recommended options:

- cloud secrets manager
- encrypted vault
- isolated encrypted credential database

### Phase 3: Split Platform Registry

Move platform registry data into a dedicated database or configuration service.

Reason:

- platform data is product knowledge
- dealer data is customer data
- source freshness, confidence, and schema versions have a different lifecycle

Candidates:

- `PlatformProfile`
- platform source URLs
- credential requirement templates
- validation rule templates
- output mapping templates

### Phase 4: Split Readiness / Event Store

Readiness and submission events should become append-heavy/audit-heavy.

Candidates:

- validation runs
- readiness snapshots
- submission attempts
- webhook events
- partner responses
- generated artifact metadata
- vehicle update propagation events

Reason:

- supports audit/debugging
- protects canonical dealer/inventory data from noisy operational events
- enables history and reporting

### Phase 5: Split Inventory Store

Inventory may deserve its own physical database once imports, deltas, media checks, and feed generation become frequent.

Reason:

- inventory changes far more frequently than dealer identity
- feed updates and media validation can become high-volume
- inventory snapshots need reproducibility

## Ingress Strategy

Keep one convenient ingress API for onboarding.

Recommended ingress flow:

```txt
Incoming onboarding payload
  -> syntactic validation
  -> normalize dealer identity
  -> normalize inventory
  -> validate platform selections
  -> create readiness run
  -> generate next actions
```

Ingress should route writes by domain:

```txt
Dealer Profile Store
Inventory Store
Platform Registry Store
Readiness Store
Submission Store
Credential Store
```

Ingress should not imply one database forever.

## Data Ownership Rules

Dealer identity owns:

- legal and contact truth
- license/document references
- rooftop data

Inventory owns:

- vehicle truth
- vehicle media truth
- inventory lifecycle

Platform registry owns:

- partner/platform requirements
- docs/source references
- integration URLs
- profile confidence

Readiness owns:

- validation outputs
- issue lists
- readiness decisions
- scenario results

Submission owns:

- packets
- attempts
- partner responses
- external IDs
- artifacts

Credentials own:

- secrets
- token lifecycle
- OAuth refresh state

## Immediate Next Goals

1. Rename `MockValidationRun` to a production-safe concept such as `ReadinessRun`.
2. Add `dealershipId` and inventory snapshot references to readiness runs.
3. Add `environment` fields where needed: `MOCK`, `SANDBOX`, `PRODUCTION`.
4. Add credential reference models without storing secrets directly.
5. Add artifact metadata records for generated feeds, packets, and lead forms.
6. Add platform capability flags to replace overloaded `testFixtures` JSON.
7. Add source freshness checks for platform docs and profile metadata.
8. Add versioned validation rule sets.
9. Add lead delivery/CRM attempt tracking.
10. Add inventory source/import models.

## Open Decisions

- Should platform requirements remain code-seeded, database-managed, or hybrid?
- Should inventory snapshots be full copies or content-addressed artifact references?
- Which partner integrations need sandbox credentials first?
- Which data needs tenant isolation before production?
- Should readiness runs be immutable after creation?
- Should lead payloads be stored as raw source payloads plus normalized fields?

## Definition Of Done For Next Data Milestone

The next data milestone is complete when:

- pristine fixture validates all active platforms
- platform registry has capability flags and credential requirements
- readiness runs are dealership-specific and snapshot-based
- credentials are represented by references only
- generated artifacts have metadata records
- the schema clearly separates canonical data from operational events
- docs explain which domain owns each major field
