# Platform Registry Playbook

## Registry Purpose

The platform registry is product knowledge. It is not dealer data.

It answers:

- what this channel is
- whether it is owned, feedable, assisted, or partner-dependent
- what dealer fields are required
- what vehicle/media fields are required
- which docs prove the profile
- whether live activation is realistic

## Required Fields For Every Platform

- `slug`
- `name`
- `kind`
- `integrationClass`
- `schemaVersion`
- `lastVerifiedAt`
- `profileConfidence`
- `needsReview`
- `sourceNote`
- `integrationUrls`
- `sourceUrls`
- `submissionMethods`
- `requiredDealershipFields`
- `requiredVehicleFields`
- `requiredMediaRules`
- `outputFormat`

## Confidence Rules

`HIGH`:

- official docs exist
- feed/API shape is clear
- account/credential path is understandable
- readiness rules are defensible

`MEDIUM`:

- official docs exist but are generic commerce/local/lead docs
- automotive mapping needs policy/account review
- partner flow is real but not self-serve

`LOW`:

- docs are incomplete
- activation depends on private partner access
- requirements are inferred from marketing/support pages

## Strict Mode Rules

Strict mode should warn when:

- profile confidence is `MEDIUM` or `LOW`
- `sourceUrls` are missing
- profile is older than freshness threshold
- assisted marketplace path is not partner-confirmed
- generic catalog channel needs automotive policy review

Strict mode should fail when:

- `needsReview` is true
- required docs are stale or contradicted
- platform cannot be validated with pristine fixture

## Adding A Platform

Minimum work:

1. Find official docs or partner portal references.
2. Decide channel class.
3. Define required dealer fields.
4. Define required vehicle/media fields.
5. Add generated output format.
6. Add mock portal responses.
7. Run pristine validation.
8. Run risk matrix.

## Channel Class Rules

`OWNED`: we control publishing and lead capture.

`FEEDABLE`: public or account-approved API/feed path exists.

`ASSISTED`: packet, email, rep, portal, or provider workflow.

`PARTNER_DEPENDENT`: commercial agreement or private API needed before activation.

## Downgrade Triggers

- official docs disappear
- API version deprecated
- partner blocks dealer use case
- sandbox cannot accept pristine fixture
- activation requires unplanned contract
- repeated dealer failures from same field/rule

