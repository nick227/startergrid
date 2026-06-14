# Platform Profile POC Notes

The first milestone is not live posting. It is proving that each platform profile can be represented as data, validated, and submitted through a fake controlled flow.

## Green flag definition

A platform profile is green when:

- required dealership fields are present
- required vehicle fields are present
- media rules pass
- a mock output target can be generated
- a mock authorization packet can be generated
- a mock submission attempt can be tracked

## Schema freshness

Each platform profile includes:

- `schemaVersion`
- `lastVerifiedAt`
- `sourceUrls`
- `requiredDealershipFields`
- `requiredVehicleFields`
- `requiredMediaRules`

Later, add a scheduled check that marks profiles stale when `lastVerifiedAt` is older than a chosen threshold.

## Why mock first

Premium marketplaces may require rep-assisted setup, dealer approval, provider approval, paid marketplace accounts, or partner contracts. The POC still proves value by preparing data, generating packets, testing feed shape, writing mock emails, and tracking status.
