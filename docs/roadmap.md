Stabilize DB-Backed Pristine Flow

Persist pristineApiDealership, vehicles, media, docs.
Add seed/import command for pristine demo data.
Keep validate:pristine passing from DB data, not only fixtures.
Promote Readiness Runs

Rename/replace MockValidationRun with ReadinessRun.
Store dealershipId, platform, baseline/strict mode, validator version.
Attach issue codes, next actions, and inventory snapshot reference.
Add Artifact Store

Create GeneratedArtifact model.
Store feed/packet/ADF/storefront outputs with format, path, checksum, platform, dealership.
Link artifacts to readiness runs and submission attempts.
Build Owned Storefront MVP

Generate dealer storefront from DB inventory.
Add vehicle detail pages and lead form.
Persist leads with vehicle/platform/source attribution.
Improve Platform Registry

Add credential requirements and capability flags.
Replace overloaded testFixtures with structured fields.
Add profile history/versioning and freshness checks.
Add Credential Reference Layer

Create credential reference model only.
Store actual secrets outside app DB.
Support MOCK, SANDBOX, PRODUCTION environments.
Make Submission Workflow Realistic

Add idempotency keys, external IDs, retry state.
Separate mock receipts from sandbox/live responses.
Track assisted handoff events.
Inventory Update Propagation

Persist price/photo/sold/removed events.
Generate platform-specific refresh/remove actions.
Show propagation status per platform.
API Surface

Add endpoints for dealer intake, inventory import, readiness run, artifact generation, submission tracking.
Keep one ingress, route by domain.
Operational Hardening

Add migrations, CI, fixture regression tests.
Add audit logging.
Add URL/media validation jobs.
Add docs for mock/sandbox/live behavior.