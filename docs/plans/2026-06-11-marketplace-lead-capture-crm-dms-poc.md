# Marketplace Lead Capture CRM/DMS PoC

Status: Draft
Date: 2026-06-11
Owner: Marketplace / platform operations

## Decision

Marketplace lead capture needs a bounded third-party sync PoC before production go-live. The goal is reliable lead handoff to dealer systems, not a full CRM, DMS, or sales workflow.

The first production-quality path should support:

- Marketplace inquiry accepted from the VDP.
- Lead persisted in our system.
- Lead delivered to a dealer destination by email, ADF/XML, or webhook.
- Delivery attempt recorded with status and error details.
- Failed delivery visible to operations and retryable.

## Product Boundary

In scope:

- Lead handoff.
- CRM/DMS destination configuration.
- ADF/XML payload generation.
- Generic JSON webhook delivery.
- Email fallback.
- Delivery status, retry, and operator recovery.
- Exportable evidence that a lead was accepted and delivered or failed.

Out of scope:

- Full CRM inbox.
- Salesperson assignment.
- Customer timeline.
- Call notes, reminders, tasks, pipeline stages, or deal workflow.
- Replacing dealer DMS inventory, F&I, accounting, or desking tools.

## Why This Matters

Lead capture is only real if the dealer can receive the lead where they already work. A buyer success screen is not enough. For launch, every accepted inquiry needs an operational trail from buyer submission to dealer handoff.

## Current Foundation

Already present:

- Public marketplace lead route: `POST /api/marketplace/vehicles/{listingId}/leads`.
- Strict server validation for marketplace lead payloads.
- Backend dealer resolution from listing ownership.
- Canonical `Lead` persistence.
- `consumer-marketplace` platform slug.
- `DealerNotification` row creation.
- Email transport seam with mock outbox in development/test.
- ADF/XML payload generator exists for lead routing artifacts.
- ADF/XML lead routing is already represented as a platform profile.
- DMS-style inventory ingest patterns exist in archived docs and tests.

Current gaps:

- SMTP is still a placeholder in production mode.
- No dedicated delivery-attempt model for CRM/DMS sync attempts.
- No generic CRM/DMS destination configuration model.
- No retry worker for failed lead deliveries.
- No operator UI or report for failed lead handoff.
- No live vendor sandbox validation.

## MVP PoC Shape

### 1. Destination Types

Support three handoff methods in the PoC:

| Type | Purpose | Production Readiness |
| --- | --- | --- |
| `EMAIL` | Immediate dealer fallback and small-dealer compatibility. | Required for launch. |
| `ADF_XML_EMAIL` | Common automotive CRM lead format delivered to CRM-provided email. | Required PoC. |
| `JSON_WEBHOOK` | Generic integration lane for modern CRM/DMS middleware. | Required PoC. |

Defer direct vendor APIs until after the handoff contract is proven.

Examples of later direct adapters:

- VinSolutions
- DealerSocket
- Elead
- DealerCenter
- AutoManager
- Tekion
- Reynolds/CDK partner or middleware path

### 2. Destination Configuration

Add a small dealer-level configuration concept:

- `dealershipId`
- `destinationType`
- `label`
- `enabled`
- destination address or URL
- optional CRM/DMS vendor name
- optional shared secret or signing key
- last test status
- last test timestamp

Security requirements:

- Do not expose secrets in API responses.
- Webhook secrets must be encrypted or stored through the existing secret-management path before production.
- Operators can disable a destination without deleting historical delivery attempts.

### 3. Delivery Attempt Tracking

Before production CRM/DMS sync, add a dedicated delivery-attempt record rather than overloading `DealerNotification`.

Minimum fields:

- `id`
- `leadId`
- `dealershipId`
- `destinationType`
- `destinationLabel`
- `status`: `PENDING`, `SENT`, `FAILED`, `RETRYING`, `DISABLED`
- `attemptCount`
- `nextAttemptAt`
- `lastAttemptAt`
- `deliveredAt`
- `httpStatus` or SMTP result when available
- `errorCode`
- `errorMessage`
- `payloadFormat`
- payload checksum
- created/updated timestamps

Do not store raw secrets in attempts. Raw lead contact data is already in `Lead`; delivery records should point to the lead and store operational metadata.

### 4. Payload Formats

ADF/XML:

- Generate an ADF/XML 1.0 payload from the accepted marketplace lead and listing snapshot.
- Include buyer contact fields, message, vehicle interest, dealer identity, stock number, VIN only if allowed by the destination and internal data boundary.
- Validate payload shape in tests.

JSON webhook:

- Send a compact normalized payload:
  - lead ID
  - source/platform slug
  - submitted timestamp
  - buyer contact fields
  - message
  - vehicle summary
  - listing ID
  - dealer ID
  - category
- Sign requests with an HMAC header before production.
- Require timeout, retry, and non-2xx handling.

Email:

- Continue using dealer primary contact as fallback.
- For launch, real SMTP must be wired or email must remain explicitly non-production.

### 5. Runtime Flow

Target flow:

1. Buyer submits marketplace lead.
2. API validates body and resolves listing/dealer.
3. Lead is persisted.
4. Channel event is recorded.
5. Delivery job is created for enabled dealer destinations.
6. Synchronous MVP may attempt first delivery immediately, but it must not roll back the lead if delivery fails.
7. Failed attempts are marked `FAILED` or `RETRYING`.
8. Operations can inspect failed attempts and trigger retry.

Important rule:

- Lead acceptance and third-party delivery are separate concerns. A third-party outage must not erase the buyer inquiry.

## PoC Milestones

### Milestone 1: Internal Proof

Goal: prove the handoff architecture without external vendors.

Tasks:

- Add delivery destination config fixture for one demo dealer.
- Add delivery attempt persistence.
- Add JSON webhook adapter with injectable transport.
- Add ADF/XML adapter using existing payload generation patterns.
- Add tests for success, timeout, non-2xx, and disabled destination.
- Add mock receiver script or test server for local verification.

Exit criteria:

- A marketplace lead creates one or more delivery attempts.
- Successful mock delivery is marked `SENT`.
- Failed mock delivery is marked `FAILED` with error metadata.
- Lead persistence is unaffected by delivery failure.

### Milestone 2: Operator Recovery

Goal: make failures visible and recoverable.

Tasks:

- Add a failed lead delivery query/report.
- Add retry command or route for a failed delivery attempt.
- Add delivery attempt filters by dealer, destination, status, and date.
- Add a runbook for manual dealer notification fallback.

Exit criteria:

- Operations can answer: which leads failed to reach a dealer system today?
- Operations can retry a failed attempt without resubmitting the buyer form.
- Operations can manually send a fallback email using persisted lead context.

### Milestone 3: ADF/XML Vendor Sandbox

Goal: validate the common automotive CRM path.

Tasks:

- Pick one real or sandbox CRM endpoint that accepts ADF/XML.
- Configure dealer destination as `ADF_XML_EMAIL` or `ADF_XML_WEBHOOK`, depending on vendor support.
- Send test lead.
- Capture delivery response and timestamp.
- Confirm lead appears in the target system.

Exit criteria:

- At least one external CRM/DMS-style destination receives a marketplace lead.
- Payload mapping is documented.
- Known vendor limitations are documented.

### Milestone 4: Production Launch Gate

Goal: harden enough for pilot dealers.

Required:

- Real SMTP enabled or email explicitly removed from production claims.
- Webhook timeout and retry policy defined.
- HMAC signing for JSON webhook.
- Destination secrets handled safely.
- Failed delivery report available.
- At least one tested destination per launch dealer.
- Smoke test covers buyer submit -> lead row -> delivery attempt -> dealer receipt.

## DMS Considerations

DMS integration should be treated differently from CRM integration.

For MVP:

- DMS remains primarily an inventory source or inventory state system.
- Lead handoff to a DMS is acceptable only when the dealer's DMS exposes a lead intake endpoint, ADF/XML mailbox, or middleware connector.
- Do not build DMS deal, finance, accounting, forms, or desking workflows.

The PoC should preserve these IDs when available:

- listing ID
- vehicle ID
- stock number
- VIN, only when allowed for the destination
- dealer ID
- source platform slug

This keeps leads traceable back to inventory without making marketplace lead capture the DMS of record.

## Acceptance Checklist

- Valid buyer inquiry creates a `Lead`.
- Accepted lead resolves dealer from listing ownership only.
- Accepted lead creates delivery attempts for enabled destinations.
- ADF/XML payload can be generated from a marketplace lead.
- JSON webhook payload can be generated from a marketplace lead.
- Mock JSON webhook success marks attempt `SENT`.
- Mock JSON webhook 500/timeout marks attempt `FAILED` or `RETRYING`.
- Email/SMTP failure does not delete or fail the lead.
- Failed attempts are visible to operations.
- Retry does not create a duplicate buyer lead.
- Public marketplace GET APIs still expose no raw lead contact data.

## Recommended First Commit Shape

1. `marketplace: add lead delivery PoC plan`
2. `marketplace: add lead delivery attempt model`
3. `marketplace: add lead destination fixtures and adapters`
4. `marketplace: wire marketplace lead capture to delivery attempts`
5. `marketplace: add failed lead delivery report and retry path`

## Serious Launch Position

Do not claim CRM/DMS sync is production-ready until one real third-party destination has received a lead from a deployment-like environment and operations can inspect/retry failures.

For demo, it is acceptable to show:

- Buyer submission.
- Persisted lead.
- Mock ADF/XML payload.
- Mock JSON webhook delivery.
- Failed delivery visibility.

For production, mocked delivery is not enough.
