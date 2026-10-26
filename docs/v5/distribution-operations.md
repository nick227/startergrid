# V5 distribution operations and verification

V5_AUTOPILOT_ENABLED=true enables this implementation; the default is disabled. No production migration, account activation or external publication was performed.

## Enablement

1. Reconcile Cursor's account/onboarding migrations with prisma/migrations/20261026020000_autopilot_distribution/migration.sql. Generate Prisma and apply reviewed migrations to the intended environment using the existing migration process.
2. Start the server with V5_AUTOPILOT_ENABLED=true. Its nonoverlapping worker reconciles durable policies every 15 seconds; restart recovers inventory intent without in-memory events.
3. Save an ON policy with consumer-marketplace included. The destination must be enabled and ACTIVE, with site/category eligibility, READY inventory, essential information and photos.
4. Check distribution outcomes and incidents. Only authoritative marketplace readback establishes VERIFIED_LIVE or VERIFIED_REMOVED.

Missing-policy V5 default is OFF. Manual publishing stays available. Once a dealership has a V5 policy, automatic inventory enqueue/reconcile uses V5 instead of the legacy mock queue.

## Qualification

- Auto Marketplace (consumer-marketplace): database listing activation/withdrawal and public query readback tested against disposable MySQL. This verifies repository behavior, not a deployed site's health.
- All external providers remain unqualified. Google, Meta, eBay, catalog/social integrations and partner feeds need authorized account tests demonstrating updates, removal, idempotency and confirmation. Credentials, adapters, setup guides and mock submissions do not qualify them.
- Registry distinguishes configured/unverified, manual, partner-assisted and unavailable. Unqualified channels cannot be saved as automatic inclusion.

## Holds and recovery

Large price changes are held before supported inventory writes. Internal approval checks the original source timestamp, applies the exact proposed price and records snapshot-bound authorization. The worker subsequently verifies it. Old evidence cannot resolve a proposal.

Bulk-removal guards inspect the complete batch before lifecycle changes. Internal approval grants the exact vehicle set a 15-minute retry window; the operator retries the original source action. Resolution requires verified withdrawal for every approved vehicle. Managed lifecycle withdrawals continue when OFF/PAUSED.

Retry persists state without claiming resolution. Worker-level failures have an audited retry action. Known transient database failures back off; ambiguous failures require intervention. Reconnect initiates the real configured OAuth flow, without claiming recovery. Failures carry an owner queue and next action.

## Verification

Pure policy/evidence/retry tests: src/tests/autopilot.test.ts.
Disposable MySQL tests: src/tests/autopilotDatabase.test.ts. Set V5_TEST_DATABASE_URL to a schema-synchronized database named startergrid_v5_test_*. Other names are refused.

Regression coverage includes scheduler, inventory distribution/update/import, prepare/publish and route/OpenAPI security contracts. No external account credentials or provider calls are required.

## Boundaries before broad rollout

- Auto Marketplace reads current inventory. OFF/PAUSED stops listing operations, not changes to already public fields. Frozen publication requires a different read model.
- Guards cover the wired inventory price/detail, bulk lifecycle, CSV/JSON import and connected-source lifecycle paths. Direct SQL, new ingestion paths, channel deselection and custom mutations need equivalent guards. Guard checks and source writes are separate transactions; concurrent source writers need further transactional integration.
- Reconciliation scans and locks a dealership in a transaction with a 30-second timeout. Load-test large rooftops; partitioning and external job leases/outboxes are needed before network adapters join.
- Hard deletion loses the source snapshot; use sold/removed lifecycle markers. Missing-source targets require review; hash checks prevent falsely reporting current live status.
- Scalar references avoid changes to Cursor's account relations; account deletion/retention cleanup needs agreement.
- External retries and confirmation have pure decision tests, not provider-account certification. verificationTimeoutMs is reserved for future asynchronous confirmation; the owned path verifies immediately.
- New incidents have real actions. Migrating every historical failure source and wiring Antigravity's existing issue UI remain coordinated follow-up. Legacy diagnostics do not certify publication.

## Implementation file inventory

Distribution core: src/services/autopilot/contracts.ts, policy.ts, capabilities.ts, decisions.ts, service.ts, inventoryGuard.ts, worker.ts.

Persistence: prisma/schema.prisma and prisma/migrations/20261026020000_autopilot_distribution/migration.sql (three additive models).

API/runtime: src/server/routes/autopilot.ts, platformConnect.ts, admin.ts; src/server/security.ts, app.ts; src/scripts/server.ts; openapi/openapi.yaml; .env.example.

Existing integration points: src/services/publishing/autoReconcileService.ts, publishQueueService.ts, schedulerService.ts, prepareAndPublishService.ts; src/services/inventory/inventoryDistributionService.ts, vehicleChannelService.ts, inventoryUpdateService.ts, importService.ts, salesStatusReconcileService.ts; src/server/routes/inventory.ts.

Tests: src/tests/autopilot.test.ts, autopilotDatabase.test.ts, routeContract.test.ts. Some core files were included in concurrent V5 commits; the working-tree diff alone does not represent this entire implementation.

Validation: TypeScript check passed; 154 targeted regression tests passed; 11 disposable-MySQL integration tests passed, including concurrent workers and audited approval/verification flows. No production database was migrated.
