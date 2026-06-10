# Dealer Distribution Mock Seed Pack

Generated mock data for a dealer inventory distribution platform.

## Contents

- `mock-data/dealers.json`
- `mock-data/platformProfiles.json`
- `mock-data/vehicles.json`
- `mock-data/vehiclePhotos.json`
- `mock-data/categoryItems.json`
- `mock-data/oauthAccounts.json`
- `mock-data/socialDestinations.json`
- `mock-data/catalogAccounts.json`
- `mock-data/partnerFeedSetups.json`
- `mock-data/syncRuns.json`
- `mock-data/syncEvents.json`
- `mock-data/validationErrors.json`
- `mock-data/marketplaceListings.json`
- `mock-data/queueItems.json`
- `mock-data/performanceMetrics.json`
- `mock-data/leadEvents.json`
- `mock-data/priceChanges.json`
- `mock-data/soldEvents.json`
- `mock-data/notifications.json`
- `mock-data/users.json`
- `scripts/seed-mock-data.mjs`

## Dataset size

- Dealers: 5
- Vehicles: 160
- Vehicle photos: 1020
- Cross-category units: 50
- Platform profiles: 12
- OAuth accounts: 40
- Sync runs: 80
- Sync events: 768
- Performance rows: 3150
- Lead events: 350

## Usage

Copy this folder into your repo root, then run:

```bash
node scripts/seed-mock-data.mjs
```

Dry run:

```bash
DRY_RUN=1 node scripts/seed-mock-data.mjs
```

Custom data dir:

```bash
MOCK_DATA_DIR=./mock-data node scripts/seed-mock-data.mjs
```

## Notes

The seed script is schema-tolerant and tries common Prisma model names for each file. If your project uses different model names or field names, edit `MODEL_MAP` in `scripts/seed-mock-data.mjs`.

The data is intentionally mixed:
- one clean happy-path dealer
- one messy dealer with missing VINs/prices/photos
- several externally blocked platform examples
- OAuth connected/expired/revoked states
- catalog sync, marketplace listing, social destination, partner feed, and performance scenarios
