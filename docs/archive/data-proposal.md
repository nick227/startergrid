# Data Architecture Proposal

## Decision Summary

We have adequately vetted the broad data strategy for the next product phase:

```txt
One ingress. Multiple bounded data domains. One physical DB for now.
```

Do not split into many physical databases yet. The product is still proving the workflow. Split the data model by domain first, add credential isolation immediately, and defer physical DB separation until volume, security, or ownership pressure justifies it.

v4 schema priority:

```txt
ReadinessRun + InventorySnapshot + PlatformProfileVersion + GeneratedArtifact
```

## Current State

Current physical store:

```txt
MySQL via Prisma
DATABASE_URL
```

Current schema domains:

- dealer identity: `DealershipProfile`
- inventory: `Vehicle`, `VehicleMedia`, `VehicleUpdate`
- platform registry: `PlatformProfile`
- activation workflow: `PlatformApplication`, `AuthorizationPacket`, `SubmissionAttempt`
- validation/readiness: `MockValidationRun`
- lead capture: `Lead`
- business model: `DealerSubscription`

This is enough for the next MVP, but some names and relationships still reflect the POC era.

## Recommendation

Keep one MySQL database for MVP, but reorganize around explicit domain ownership.

Recommended near-term domain boundaries:

| Domain | Owns | Current Models |
| --- | --- | --- |
| Dealer Identity | legal/contact/location/docs | `DealershipProfile` |
| Inventory | vehicles/media/update events | `Vehicle`, `VehicleMedia`, `VehicleUpdate` |
| Platform Registry | partner requirements/capabilities | `PlatformProfile` |
| Readiness | validation decisions/snapshots | `MockValidationRun` now, `ReadinessRun` next |
| Activation | applications/packets/submissions | `PlatformApplication`, `AuthorizationPacket`, `SubmissionAttempt` |
| Leads | source-attributed inquiries | `Lead` |
| Commercial | plan/status/pricing | `DealerSubscription` |
| Credentials | OAuth/API/SFTP secrets | not in app DB; add references only |

## Why Not Split DBs Now

Physical separation now would slow the product down without solving the highest-risk questions.

Current higher-risk questions:

- Can pristine DB-backed dealer data pass all platform readiness checks?
- Can readiness runs be reproduced from snapshots?
- Can generated artifacts become proof-folder records?
- Can the owned storefront capture leads?
- Can assisted marketplace workflows be tracked clearly?
- Can credential references be modeled without storing secrets?

Answer these before splitting physical stores.

## Immediate Schema Changes

### 1. Replace `MockValidationRun`

Current name is too narrow.

Proposed model:

```txt
ReadinessRun
```

Minimum fields:

- `id`
- `dealershipId`
- `platformId`
- `mode`: `BASELINE`, `STRICT`, `PRISTINE`, `SANDBOX_PREFLIGHT`
- `status`: `PASS`, `WARN`, `FAIL`
- `overallStatus`: `GREEN`, `YELLOW`, `RED`
- `validatorVersion`
- `validationRuleSetId` when available
- `platformProfileVersionId`
- `dealerSnapshot`
- `inventorySnapshotId`
- `issuesJson`
- `generatedOutputsJson`
- `createdAt`

Why:

Readiness must be dealership-specific, explainable, and reproducible. It should point to the exact inventory snapshot, platform profile version, and validator/rule set used at the time of validation.

### 2. Add `InventorySnapshot`

The proposal currently references inventory snapshots. That should be a real model, not a vague reference.

Proposed model:

```txt
InventorySnapshot
```

Minimum fields:

- `id`
- `dealershipId`
- `source`: `PRISTINE_FIXTURE`, `DB_CURRENT`, `IMPORT`, `MANUAL`
- `vehicleCount`
- `inventoryHash`
- `snapshotJson`
- `createdAt`

Why:

Readiness depends on the exact inventory state used at validation time. If a price, photo, sold status, or VIN changes later, old readiness decisions still need to be explainable.

v4 compromise:

Store the snapshot payload as JSON for now, but store a stable hash and count. Later, move to snapshot item rows if querying individual snapshot vehicles becomes important.

### 3. Add `PlatformProfileVersion`

The current `PlatformProfile` row changes over time. Readiness should not depend on whatever the row says today.

Proposed model:

```txt
PlatformProfileVersion
```

Minimum fields:

- `id`
- `platformId`
- `schemaVersion`
- `profileConfidence`
- `needsReview`
- `integrationClass`
- `requiredDealershipFields`
- `requiredVehicleFields`
- `requiredMediaRules`
- `capabilitiesJson`
- `credentialRequirementsJson`
- `sourceUrls`
- `sourceHash`
- `createdAt`

Why:

If Google, Meta, eBay, Cars.com, or another profile changes, past readiness runs should still point to the version that produced the result.

v4 rule:

Every new readiness run should reference a platform profile version.

### 4. Add `ValidationRuleSet`

`validatorVersion` is useful, but it should eventually point to a named rule set.

Proposed model:

```txt
ValidationRuleSet
```

Minimum fields:

- `id`
- `name`
- `version`
- `mode`: `BASELINE`, `STRICT`, `PRISTINE`, `SANDBOX_PREFLIGHT`
- `rulesJson`
- `createdAt`

Why:

The product needs to know whether a result came from baseline readiness, strict launch readiness, pristine fixture validation, or a sandbox preflight rule set.

v4 compromise:

Keep `validatorVersion` as a string and add nullable `validationRuleSetId`. Require the string now; require the relation later.

### 5. Add `GeneratedArtifact`

Current artifact paths are embedded in submission payloads.

Proposed model:

```txt
GeneratedArtifact
```

Minimum fields:

- `id`
- `dealershipId`
- `platformId`
- `readinessRunId`
- `submissionAttemptId`
- `kind`: `STOREFRONT_JSON`, `FEED`, `PACKET`, `ADF_XML`, `LEAD_FORM`, `PROOF_FOLDER`
- `format`
- `filename`
- `storagePath`
- `checksum`
- `environment`: `MOCK`, `SANDBOX`, `PRODUCTION`
- `createdAt`

Why:

Artifacts are the business proof. They should be queryable and tied to runs/submissions.

Storage rule:

```txt
DB stores metadata, checksum, and path only.
File content lives in filesystem or object storage.
```

Do not put large feed, packet, image, PDF, or proof-folder content directly in MySQL.

### 6. Add Credential References

Do not store secrets in the app DB.

Proposed model:

```txt
PlatformCredentialRef
```

Minimum fields:

- `id`
- `dealershipId`
- `platformId`
- `environment`
- `credentialRef`
- `credentialKind`: `OAUTH`, `API_KEY`, `SFTP`, `WEBHOOK_SECRET`, `MANUAL_ACCOUNT`
- `status`
- `lastVerifiedAt`
- `createdAt`
- `updatedAt`

Why:

The app needs to know whether credentials exist and are valid, but actual secrets belong in a vault/secrets manager.

### 7. Add Platform Capabilities

Current `testFixtures` is doing too much.

Either add structured JSON:

```txt
capabilities Json
credentialRequirements Json
```

Or later normalize into child tables.

Useful capability flags:

- `supportsInventoryFeed`
- `supportsInventoryDelta`
- `supportsLeadSync`
- `supportsCatalogApi`
- `supportsOAuth`
- `requiresPartnerAgreement`
- `requiresManualRep`
- `requiresPixelOrConversionsApi`
- `supportsOwnedLandingPages`

Why:

Sales, validation, and technical routing all need the same truth.

### 8. Add Partner Attribution

Proposed model:

```txt
PartnerAttribution
```

Minimum fields:

- `id`
- `dealershipId`
- `platformId`
- `source`
- `authorizationPacketId`
- `submissionAttemptId`
- `status`
- `partnerContact`
- `revenueStatus`
- `notes`
- `createdAt`
- `updatedAt`

Why:

If referral/partner revenue ever matters, attribution must exist before formal agreements.

## Data Flow Proposal

MVP ingress should work like this:

```txt
Dealer intake payload
  -> validate syntax
  -> upsert dealer identity
  -> upsert inventory/media
  -> generate inventory snapshot
  -> run baseline readiness
  -> run strict readiness
  -> generate artifacts
  -> create/update platform applications
  -> produce proof folder
```

Owned storefront flow:

```txt
DB inventory
  -> storefront artifact
  -> public-style vehicle pages
  -> lead form
  -> Lead record
```

Assisted marketplace flow:

```txt
Readiness GREEN/YELLOW
  -> authorization packet
  -> partner packet artifact
  -> submission attempt
  -> handoff status
  -> partner attribution record
```

Feedable channel flow:

```txt
Readiness GREEN
  -> feed/catalog artifact
  -> credential check
  -> mock/sandbox/live submission
  -> receipt/response
  -> application status update
```

## Physical DB Split Plan

### Phase 1: One DB, Better Model

Use one MySQL database.

Do now:

- add `ReadinessRun`
- add `GeneratedArtifact`
- add `PlatformCredentialRef`
- add platform capabilities
- add partner attribution

### Phase 2: Secrets Outside App DB

Use a vault/secrets manager before real credentials.

App DB stores:

```txt
credentialRef only
```

### Phase 3: Registry Split

Split platform registry when:

- profiles change independently from app releases
- multiple services need registry data
- source verification becomes scheduled
- profile history matters operationally

Candidate store:

```txt
platform_registry
```

### Phase 4: Event/Artifact Split

Split readiness/submission/artifact data when:

- generated artifacts grow large
- webhook/API events become high-volume
- audit history needs separate retention
- reporting queries slow app workflows

Candidate store:

```txt
activation_events
artifact_metadata
object storage for content
```

### Phase 5: Inventory Split

Split inventory when:

- DMS/feed imports become frequent
- media checks run asynchronously
- sold/price/photo changes are high-volume
- multiple dealer storefronts read inventory heavily

Candidate store:

```txt
inventory
inventory_events
```

## Validation Requirements

Before a data model change is accepted:

- `npm run typecheck` passes
- `npm test` passes
- `npm run validate` passes
- `npm run validate:pristine` passes
- `npm run poc:risk` passes

For DB-backed data milestone:

- pristine dealer persists
- pristine vehicles/media persist
- readiness runs are DB-backed
- generated artifacts are stored as records
- proof folder can be regenerated from DB records

## Open Risks

### JSON Overuse

JSON is useful for POC speed but risky for stable business concepts.

Move out of JSON when:

- field is queried
- field appears in UI filters
- field affects billing/status
- field affects partner activation
- field needs audit history

Readiness-specific rule:

```txt
issuesJson is acceptable for v4.
Issue codes should become queryable soon.
```

Likely follow-up model:

```txt
ReadinessIssue
```

Minimum fields:

- `id`
- `readinessRunId`
- `code`
- `path`
- `severity`
- `message`
- `nextAction`

### Credential Scope

OAuth and API secrets can create security debt quickly.

Rule:

```txt
No raw partner secrets in the app DB.
```

### Readiness Reproducibility

A readiness result without snapshots is not trustworthy.

Rule:

```txt
Every readiness run must know which dealer data, inventory data, platform profile, and validator version produced it.
```

### Platform Registry Drift

Platform docs and policies change.

Rule:

```txt
Strict mode should punish stale or medium-confidence profiles.
```

## Proposed Next Sprint

1. Add `ReadinessRun`.
2. Add `InventorySnapshot`.
3. Add `PlatformProfileVersion`.
4. Add `GeneratedArtifact`.
5. Add `PlatformCredentialRef`.
6. Add `Environment` enum: `MOCK`, `SANDBOX`, `PRODUCTION`.
7. Add nullable `validationRuleSetId` or at least required `validatorVersion`.
8. Add pristine DB seed/import.
9. Make `validate:pristine` able to run against DB-backed data.
10. Store generated storefront/feed/packet outputs as artifact records.
11. Add proof folder generation from artifact records.

## Proposal Verdict

The strategy is vetted enough for the next technical milestone.

Recommended decision:

```txt
Proceed with one physical MySQL database for MVP.
Refactor into explicit domain models now.
Add InventorySnapshot and PlatformProfileVersion before relying on DB-backed readiness history.
Isolate credentials immediately.
Delay physical DB splits until registry, event, artifact, or inventory volume justifies it.
```
