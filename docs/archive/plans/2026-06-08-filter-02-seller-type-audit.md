# FILTER-02: Seller Type Audit

**Date:** 2026-06-08  
**Status:** Audit complete — implementation blocked on product decisions documented below  
**Scope:** Determine whether a seller type filter is schema-backed, what it would actually filter on, and what decisions must be made before any implementation begins

---

## What the Backlog Ticket Said

> Add sellerType filter where seller data supports it; hide if unavailable.

This framing assumes a `sellerType` field exists somewhere in the data model. It does not.

---

## Existing Data Sources

### DealershipProfile fields relevant to seller classification

| Field | Type | Nullable | Marketplace-exposed? |
|---|---|---|---|
| `businessCategory` | `BusinessCategory` enum | No | Yes — used for category scoping, never for type |
| `dealerLicense` | `String` | Yes | **No** — never selected in `VEHICLE_CARD_SELECT` or `DEALER_SELECT` |
| `dealerType` | — | — | **Does not exist** |
| `sellerType` | — | — | **Does not exist** |
| `accountType` | — | — | **Does not exist** |
| `isPrivate` | — | — | **Does not exist** |

There is no seller classification field of any kind. Every listing in the marketplace belongs to a `DealershipProfile`. The model supports exactly one seller type: **platform-registered dealer-business**.

### The MarketplaceFilterRole 'seller' — what it actually means

`MarketplaceFilterRole 'seller'` exists in `packages/category-schemas/src/types.ts` and is used by four categories today:

| Category | Field | Label | What it filters |
|---|---|---|---|
| `apartments` | `make` | Property manager | Seller's *name*, stored in `make` column |
| `commercial_property` | `make` | Broker | Seller's *name*, stored in `make` column |
| `homes` | `make` | Broker | Seller's *name*, stored in `make` column |
| `vacation_rentals` | `make` | Host | Seller's *name*, stored in `make` column |

The `'seller'` role filters **who is selling this item by name** (a specific entity), not **what category of seller** they are (dealer vs. private party). These are fundamentally different features under the same label.

### What the current 'dealer' filter does

The existing `MarketplaceListFilters.dealer` parameter (mapped to `WHERE dealershipId = ?`) already allows filtering by a specific seller's id. This is a "show me listings from this exact seller" filter, not a type filter. It is implemented and works.

### What 'seller' role is NOT in the filter config

`listingFilterConfig.ts` maps filter roles to enabled UI filters. The `'seller'` role is present in `MarketplaceFilterRole` but is absent from `LISTING_FILTER_TO_ROLE` and `FILTER_ROLE_FALLBACK_KEY`. It is schema-declared but not yet wired to any filter UI or query parameter.

### dealerLicense as a proxy

`dealerLicense String?` on `DealershipProfile` is optional and was designed to collect dealer license numbers for operator compliance tracking. Its presence/absence cannot reliably signal "licensed dealer" vs. other:

- A legitimate franchise dealer who hasn't entered their license yet has `dealerLicense = null`.
- A private seller (if the platform ever supports them) would also have `dealerLicense = null`.
- Null is ambiguous — it means "not provided," not "not licensed."

`dealerLicense` is never selected in marketplace queries. Using it as a backend filter would require both fetching it from the DB and adding fragile null-inference logic.

---

## The Fundamental Problem

**The platform currently has one seller archetype:** a business entity that goes through onboarding (`DealershipProfile`) to list inventory. There are no private sellers, no individual sellers, no creator accounts, no broker-specific records. The model was designed around B2B dealer onboarding, not consumer-to-consumer or multi-type seller marketplaces.

A seller type filter on the current data model would be a filter over a set that contains only one type. It would be UI that exists but does nothing meaningful.

---

## Seller Type Taxonomy — What the Platform Would Need to Support

The following types are commonly supported on similar marketplaces. A product decision is needed on which apply here:

| Type | Examples | Requires schema change? | Notes |
|---|---|---|---|
| **Franchise dealer** | New car dealer with OEM franchise | Yes — new enum value | Derivable from dealerLicense in automotive only, unreliable |
| **Independent dealer** | Used car lot, boat dealer | Yes — new enum value | Currently indistinguishable from franchise |
| **Private seller / FSBO** | Individual listing their own car, home | Yes — entire new seller model | Platform has no P2P seller path today |
| **Broker** | Real estate broker, auto broker | Yes — new enum value | Already in category schemas as a label; no type field |
| **Property manager** | Apartment complex, rental company | Yes — new enum value | Same as broker problem |
| **Creator / Publisher** | Ebook author, song artist, digital art creator | Yes — new enum value | DealershipProfile doesn't fit a solo creator |
| **Platform store / brand** | Apparel brand, sneaker retailer | Yes — new enum value | Could be a DealershipProfile specialty type |
| **Platform / institutional** | Bank repo, fleet sale, auction house | Yes — new enum value | No current support |

None of these types exist as a field. Implementing any of them requires a product decision, a Prisma migration, an onboarding flow change to capture the type at registration, and a backfill strategy for existing dealers.

---

## Two Separate Features Under One Ticket

FILTER-02 conflates two distinct features that need to be separated:

### Feature A: Filter by seller name (already schema-backed)

Four categories (`apartments`, `commercial_property`, `homes`, `vacation_rentals`) have `marketplaceFilter: 'seller'` on their `make` field. This means the seller's name/entity is stored in `make` for these categories, and a text filter on `make` would let buyers filter by property manager, broker, or host name.

This is **implementable today** without any schema change:
- Add `'seller'` to `LISTING_FILTER_TO_ROLE` and `FILTER_ROLE_FALLBACK_KEY` in `listingFilterConfig.ts`
- Wire the existing `make` filter in `marketplaceQueryService.ts` to accept the seller name
- Show the filter only in categories that declare the `'seller'` role
- Filter is hidden for automotive (no seller role declared there)

This is a text filter, not a type filter. The label is category-defined ("Broker", "Host", "Property manager").

### Feature B: Filter by seller type/class (requires schema design)

Filtering on whether a seller is a dealer, private party, broker, creator, etc. requires:
1. A product decision on the taxonomy of seller types for this platform
2. A new field on `DealershipProfile` (or a new seller model for non-business sellers)
3. A Prisma migration
4. An onboarding flow change to capture the type
5. A backfill for existing records

This is **not implementable without schema design work**.

---

## Recommended Split

**Split FILTER-02 into two separate tickets:**

**FILTER-02a — Seller name filter (schema-backed, unblocked):**
Wire the existing `'seller'` filter role from category schemas to the filter bar and API. Show seller name input (text filter on `make` column) for categories that declare the seller role. Automotive does not get this filter. 4 real estate and rental categories do.

Acceptance:
- Apartments, homes, commercial_property, vacation_rentals show a "Broker" / "Property manager" / "Host" text filter
- Filter applies `make LIKE '%input%'` in the WHERE clause
- Filter hidden in categories without the seller role
- No new backend fields

**FILTER-02b — Seller type / classification filter (blocked on schema):**
Add a `dealerType` or `sellerType` field to `DealershipProfile`. Decide the taxonomy. Migrate. Add to onboarding. Backfill. Wire to marketplace filter. Downgrade to P1 or P2 — this is a significant product scope expansion.

Acceptance (deferred until taxonomy decision):
- Product defines at minimum: [franchise dealer, independent dealer, private seller, other]
- Field exists on DealershipProfile before any filter UI is built
- All existing records have a backfill value

---

## Automotive Seller Type Note

For automotive specifically, the buyer expectation of "dealer vs. private seller" is high — it's a core filter on Cars.com, AutoTrader, CarGurus, etc. However:

- The platform does not support private seller listings today.
- All automotive listings in the DB come from `DealershipProfile` records with onboarded dealers.
- Adding a "private seller" option to the filter bar when no private sellers exist is fake UI.

If private seller support is ever added to the platform (a significant product decision), it would require a separate seller model or significant changes to `DealershipProfile`. Until then, a seller type filter for automotive is either fake (filter exists but only one type matches) or absent (filter hidden because no meaningful distinction exists).

---

## Decisions Required Before Implementation

1. **Does this platform intend to support private/individual sellers?** If yes, the schema needs a new seller model or a new classification field before FILTER-02 is meaningful.

2. **Which seller types apply to which categories?** The taxonomy differs by vertical. Automotive needs dealer/private distinction. Real estate needs agent/FSBO/developer. Digital goods need creator/publisher. A single `sellerType` enum cannot serve all categories cleanly.

3. **Should FILTER-02a (seller name filter, schema-backed) ship independently?** Yes — it is already schema-backed, can ship without any new fields, and provides real value for the real estate and rental categories.

4. **What is the onboarding implication?** Any seller type field requires capture at dealer registration time. The current onboarding flow has no seller type step.

---

## Tickets to Update

| Ticket | Change |
|---|---|
| FILTER-02 | Split into FILTER-02a (seller name, unblocked) and FILTER-02b (seller type, blocked on schema) |
| FILTER-02a | New ticket: Wire seller name filter for categories with seller filter role. No schema change. P0 (unblocked). |
| FILTER-02b | Rename/update FILTER-02: Blocked on product taxonomy decision + schema migration. Downgrade to P1. |
