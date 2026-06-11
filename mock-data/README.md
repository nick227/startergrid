# Dealer Schema Mock Seed Pack

Generated for the Prisma schema pasted on 2026-06-10.

## What this contains

This pack is aligned to your actual models/enums, including:

- `DealershipProfile`
- `Vehicle`
- `VehicleMedia`
- `PlatformProfile`
- `PlatformApplication`
- `PlatformAccount`
- `PlatformOAuthToken`
- `SocialPageAccount`
- `SocialPost`
- `PlatformCatalogSync`
- `MarketplaceListing`
- `SyncPolicy`
- `PublishQueueItem`
- `SyncRun`
- `SyncEvent`
- `Lead`
- `ChannelEvent`
- `VehiclePerformanceCache`
- `PlatformPerformanceSummary`
- `InventorySource`
- `IngressRun`
- `DealerNotification`
- `OperatorAccount`
- `OperatorDealerAccess`
- `AdminAuditLog`

## Mock scenario coverage

- 5 dealers / rooftops
- 116 inventory records
- 842 media records
- 12 platform profiles
- OAuth-ready, blocked, partner-dependent, active, and messy setup states
- Social posting examples
- Catalog sync examples
- eBay marketplace listing lifecycle examples
- Queue/history/sync/performance/lead/channel event data
- Messy dealer with missing VINs, missing prices, and missing photos

## Install

Run from the project root (the `mock-data/` directory is already in place):

```bash
node mock-data/scripts/seed-mock-data.mjs
```

Dry run:

```bash
DRY_RUN=1 node mock-data/scripts/seed-mock-data.mjs
```

Clear and reseed mock rows:

```bash
CLEAR_MOCK=1 node mock-data/scripts/seed-mock-data.mjs
```

## Demo credentials

Both operator accounts use the same password. Log in at `/operator/login`.

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | admin@example.invalid | Password123! |
| OPERATOR | operator@example.invalid | Password123! |

Passwords are hashed with argon2id. Generated from the project's own `@node-rs/argon2` dependency.

## Notes

The script expects `@prisma/client` and `DATABASE_URL` to already work in your repo.

The seed is ID-based and upsert-heavy, so it can be run repeatedly.

The clear mode deletes rows with mock ID prefixes only.
