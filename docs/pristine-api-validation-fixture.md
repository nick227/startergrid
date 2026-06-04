# Pristine API Validation Fixture

This fixture is the documentation-grade happy path for validating partner platform profiles.

It is intentionally fictional but realistic:

- complete dealership legal/contact/location fields
- complete compliance document URLs
- 3 varied vehicles across sedan, EV, and pickup inventory
- 17-character VIN-like identifiers that pass the local validator
- HTTPS landing/media/document URLs
- 4 high-resolution images per vehicle
- enough vehicle attributes for marketplaces, catalog ads, lead forms, and local discovery profiles

Source:

```txt
src/fixtures/pristineApiValidation.fixture.ts
```

Validation command:

```bash
npm run validate:pristine
```

Expected result:

```txt
18/18 baseline platform profiles GREEN
0 strict platform profiles RED
```

## Data Boundary

The fixture uses reserved `.example.com` URLs. That is correct for documentation and local validation, but most live partner APIs require reachable public landing pages, image URLs, document URLs, and account-owned domains.

Before using this shape against a real sandbox or production API:

- replace `inventory.prairieridge.example.com` with the dealer inventory domain
- replace `media.prairieridge.example.com` image URLs with real public image assets
- replace `docs.prairieridge.example.com` document URLs with secure document delivery URLs
- replace synthetic VINs with inventory records allowed by that partner's sandbox or test account
- verify each platform account, OAuth scope, catalog, pixel/conversion, feed, and policy requirement

## Example Dealer

```txt
Legal name: Prairie Ridge Motors LLC
DBA: Prairie Ridge Motors
License: TX-PDM-482917
Location: Plano, TX 75024
Website: https://inventory.prairieridge.example.com
Primary contact: Avery Morgan, Inventory Operations Director
Inventory size: 64
```

## Example Vehicles

```txt
PRM-24001 | 2021 Honda Accord EX-L | Used | 37,240 miles | $23,995
PRM-24002 | 2022 Tesla Model 3 Long Range | Used | 21,890 miles | $32,995
PRM-24003 | 2021 Ford F-150 XLT SuperCrew | Used | 44,615 miles | $36,995
```

## Platform Coverage

The fixture is designed to pass baseline readiness for:

- owned channel: Dealer Storefront
- vehicle/catalog ad feeds: Google, Meta, TikTok, Microsoft, Pinterest, Reddit, X, Snapchat
- marketplaces/feed-assisted channels: CarGurus, Autotrader/Cox, eBay Motors, Cars.com, TrueCar
- lead/local channels: LinkedIn Lead Gen Forms, ADF/XML, Nextdoor, Apple Business

Strict mode may return YELLOW for partner-confirmation or policy-review channels. That is expected. Strict mode should not return RED for this fixture.
