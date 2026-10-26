# V5 distribution contract — implementation v1

Status: implemented on a best-effort additive basis, as authorized by the user. Cursor reconciliation remains required before rollout. No external publishing is authorized. Existing dealership/account schemas remain owned by Cursor.

## Ownership and persistence

Codex owns the distribution implementation and new distribution-specific records; Cursor owns dealership/account models and onboarding APIs. Additive records reference existing dealership and vehicle IDs, never replace them:

- AutopilotPolicy: dealership ID (unique), OFF/ON/PAUSED, version, included channel keys, excluded vehicle IDs, validated guard thresholds, actor/time. Absent means OFF. Conditional policy updates require the current version.
- DistributionTarget: unique dealership/vehicle/channel; current desired revision/hash/snapshot, operation, generation, attempts/next attempt, evidence/outcome, last verified snapshot, held approval bound to desired generation. An atomic compare/upsert makes repeated identical snapshots a no-op. A MySQL transaction locks the policy and inventory rows, serializing workers and atomically committing first-party effects and evidence. External network dispatch is not implemented in this transaction.
- DistributionIncident: stable target/reason key, dealership/channel/item/batch, severity, impact, owner role/ID, plain description, next action, sanitized evidence, OPEN/ACKNOWLEDGED/RESOLVED, verification and audit timestamps.
- Existing AdminAuditLog and SyncEvent persist policy/approval/retry/reconnect/closure actions and verified publication generations.

Use existing PublishQueueItem/scheduler for compatibility where feasible; V5 owned jobs must never be dispatched by legacy MOCK paths. Recover missed inventory hooks via durable desired-state reconciliation, including media edits and imports. Do not depend on process-local debounce timers for correctness.

## Stable public types

Type module: src/services/autopilot/contracts.ts (no Prisma types in DTOs). Version 1; additive evolution only after agreement.

Policy state: OFF | ON | PAUSED. Channel qualification: VERIFIED_AUTOMATIC | CONFIGURED_UNVERIFIED | MANUAL | PARTNER_ASSISTED | UNAVAILABLE.

Distribution status: NEEDS_SETUP | NEEDS_VEHICLE_INFORMATION | PROCESSING | SUBMITTED | VERIFIED_LIVE | FAILED | UNKNOWN | HELD | PAUSED | EXCLUDED | VERIFIED_REMOVED. Only provider/read-model evidence can establish VERIFIED_LIVE/VERIFIED_REMOVED. HTTP/queue success is SUBMITTED. Evidence identifies revision, method and observation time.

Owner roles: DEALERSHIP | INTERNAL_SUPPORT | SYSTEM | PARTNER. An owner role/queue is always present; person ID is optional until assigned. The UI must show nextAction and not reconstruct business status from queue states.

## Endpoints

GET /api/dealers/:dealershipId/autopilot — policy, capabilities, coverage, counts and freshness.
PUT /api/dealers/:dealershipId/autopilot — validated policy + expectedVersion, audit; reject automatic inclusion of unqualified channels.
GET /api/dealers/:dealershipId/distribution — paginated outcomes, optional vehicleId/channel/status.
GET /api/dealers/:dealershipId/distribution/incidents — paginated incidents.
POST .../incidents/:incidentId/retry — scoped persisted retry; never claims resolution.
POST .../incidents/:incidentId/approve — explicit generation-bound guard approval, authorized internal actor.
POST .../incidents/:incidentId/resolve — recheck evidence before resolution; administrative closure remains distinct.
POST .../incidents/:incidentId/reconnect — real existing OAuth connect flow; initiation is not recovery.

Existing requireDealerAccess applies to reads. Cursor capabilities change_autopilot and connect_channels authorize mutations; approvals additionally require internal staff. Manual publishing remains separate and available through existing authorized paths.

## Required semantics

ON applies only selected qualified operations. OFF and PAUSED stop ordinary promotions; lifecycle withdrawals of already managed listings remain eligible only on qualified removal paths, subject to bulk safeguards. Unknown external removal becomes an owned incident, never fake success. Exclusions stop promotion, do not silently delist. Resume recomputes current intent.

No provider except the first-party marketplace qualifies initially. External adapters and credential presence establish at most configured/unverified; evidence-based contract tests and authorized account qualification are required.

Current marketplace public reads project live Vehicle fields, so holding a dispatch alone cannot hold a price already written to inventory. Safeguards must either gate the inventory mutation or introduce a verified public snapshot. Likewise mass-removal protection must run before lifecycle writes that immediately affect public visibility. This cross-cutting boundary needs explicit agreement; a background queue hold alone is insufficient.

## Coordination and rollout

Cursor: reconcile these additive distribution models with onboarding. Onboarding autopilotPreference can disable/pause delivery, but ON alone cannot enable a qualified distribution policy. Antigravity: consume the DTOs and OpenAPI endpoints, including nextAction, evidence observation time and incident owner. Do not derive live status from account ACTIVE, queue SENT or reconnect initiation.

See [operations and verification](distribution-operations.md) for enablement and remaining boundaries. Endpoints authenticate first and return 503 when V5_AUTOPILOT_ENABLED is not true. Policy writes require expectedVersion; conflicts return 409. Incident actions return 409 until preconditions are satisfied. Missing policy means OFF within V5; legacy manual workflows remain available.

OFF/PAUSED prevents automatic promotion/reactivation. Existing Auto Marketplace listings project current inventory directly: these modes do not freeze already public prices/details/photos. Supported price/removal entry points apply pre-write safeguards, including while paused. Other source writes need equivalent guards.

Outcome reads compare current inventory hashes against stored verification and return UNKNOWN for changed inventory. Evidence is timestamped. Status filters select persisted worker state, so a VERIFIED_LIVE page may contain UNKNOWN after freshness checks.
