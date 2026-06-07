# Business Category Schema — Phase 1 Lock

**Created:** 2026-06-06  
**Status:** Phase 1 shipped — schema boundary wired; UI context deferred to Phase 2  
**Related:** [2026-06-06-business-category-schema-design.md](./2026-06-06-business-category-schema-design.md) · [channel console architecture](./2026-06-06-operator-channel-console-architecture.md)

---

## Rule

**Business category belongs to the organization (`DealershipProfile`), not the operator user.**

One category per organization (Option A for v1). Operator inherits category from the selected org after pick.

---

## Prisma

```prisma
enum BusinessCategory {
  AUTOMOTIVE
  SONGS
  EBOOKS
  WATCHES
  SNEAKERS
  COLLECTIBLES
  APPAREL
  VACATION_RENTALS
  APARTMENTS
  HOMES
  COMMERCIAL_PROPERTY
  BOATS
  TRAILERS_POWERSPORTS_RV
  HEAVY_EQUIPMENT
  FURNITURE
  VIDEO_DISTRIBUTION
}

model DealershipProfile {
  businessCategory BusinessCategory @default(AUTOMOTIVE)
  // ...
}
```

Existing orgs default to `AUTOMOTIVE`. Additive schema change via `prisma db push`.

---

## API

`GET /api/dealers` → `DealerSummary.businessCategory` (OpenAPI `BusinessCategory` enum).

Used by `apps/web` org picker when CategoryProvider ships in Phase 2.

---

## Package: `packages/category-schemas`

```txt
Registry → resolveCategorySchema(category) → CategorySchema
```

| Path | Role |
|------|------|
| `src/types.ts` | `CategorySchema`, `BusinessCategoryId`, field/copy types |
| `src/registry.ts` | All 16 categories registered |
| `src/resolveCategorySchema.ts` | Factory — known enum → schema; unknown → generic fallback |
| `src/generic/` | Generic asset/channel labels + placeholder factory |
| `src/automotive/` | **Active** — vehicle copy, fields, formatters |
| `src/{category}/` | **Placeholder** — label + generic asset/channel copy |

### CategorySchema (v1 shape)

`id` · `label` · `status` · `copy` · `asset` · `channel` · `fields` · `lifecycle` · `readiness` · `performance` · `formatters`

---

## Phase 1 done

- [x] `BusinessCategory` enum + `DealershipProfile.businessCategory` (default `AUTOMOTIVE`)
- [x] `GET /api/dealers` exposes `businessCategory`
- [x] OpenAPI + operator SDK regenerated
- [x] `packages/category-schemas` with automotive + 15 placeholders
- [x] Tests: enum/registry parity, resolution, API field, defaults

## Phase 2 (done)

- [x] `CategoryProvider` in `apps/web` after org pick
- [x] Replace `activeVertical` with resolved schema context (`activeCategoryCopy.ts`)
- [ ] Move `inventoryConfig` columns → `automotive/fields` (backlog)

## Explicitly out of scope

- Generic `Asset` model / vehicle API rename
- Multiple categories per org
- Deep placeholder schemas
- `apps/marketplace` changes
