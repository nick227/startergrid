# AI Handoff — Marketplace Auth & Favorites

**Session date:** 2026-06-07  
**Status:** Complete — merged to working tree, all checks green  
**Next session:** Business category wiring (see below)

---

## What was built this session

Marketplace consumer authentication + favorites, wired entirely through `@dealer-marketplace/client`. No backend changes. No `@auto-dealer/api-client`. No operator routes touched.

### Files created

| File | Purpose |
|------|---------|
| `apps/marketplace/src/contexts/AuthContext.tsx` | Auth context: user, authReady, favoriteIds, login/logout, toggleFavorite, loginModalOpen |
| `apps/marketplace/src/components/ui/LoginModal.tsx` | Email + password modal; opens on unauthenticated favorite click; backdrop-dismiss; 401 vs generic error copy |
| `apps/marketplace/src/components/ui/FavoriteButton.tsx` | Filled/outline heart; `aria-pressed`; `e.stopPropagation()` prevents link navigation; unauthenticated → opens modal |
| `apps/marketplace/src/pages/FavoritesPage.tsx` | Auth-guarded; redirects unauthenticated to `#/`; fetches full cards via `fetchFavorites()`; filters by live `favoriteIds` set for optimistic unfavorite |

### Files modified

| File | Change |
|------|--------|
| `src/lib/api.ts` | Added `fetchMe`, `login`, `logout`, `fetchFavorites`, `addFavorite`, `removeFavorite` via `MarketplaceAuthService`; re-exported `MarketplaceUserIdentity`, `MarketplaceFavoritesResponse` |
| `src/lib/routes.ts` | Added `{ page: 'favorites' }` union member; `favoritesHref()` helper; `favorites` path match in `parseRoute()` |
| `src/App.tsx` | Wrapped in `AuthProvider`; added `<LoginModal />`; routed `#/favorites` → `FavoritesPage` |
| `src/components/layout/PageShell.tsx` | Nav right side: Sign in button (unauthed) or Saved link + display name + Sign out (authed); hidden until `authReady` |
| `src/components/VehicleCard.tsx` | Split image into its own `<a>`; FavoriteButton absolutely positioned top-right of image; content body in second `<a>` to same destination |
| `src/components/feed/FeedCards.tsx` | Same overlay pattern on `VehicleFeedCard` image |
| `src/pages/VehicleDetailPage.tsx` | FavoriteButton + "Save this vehicle" label between CoreHeaderSection and CommerceSection |

### Auth architecture decisions

- **No localStorage.** Relies entirely on `mp_session` HttpOnly cookie (30-day, set by backend).
- **On app load:** `fetchMe()` → on success `fetchFavorites()`. 401 = not logged in, caught silently, `authReady` still fires.
- **Optimistic favorites:** toggle updates `favoriteIds` Set immediately; reverts on server error.
- **FavoritesPage filters live:** fetches full `MarketplaceVehicleCard[]` from API, then filters by `favoriteIds` from context — so unfavoriting from another page removes cards without re-fetch.
- **Login modal is context-controlled:** `openLoginModal()` in AuthContext; any component can call it, including FavoriteButton when unauthenticated.

### Checks run

```
marketplace:boundary:check  ✅  73 files, 0 violations
marketplace tsc --noEmit    ✅  no errors
marketplace build           ✅  115 modules, 217 kB JS
marketplace vitest          ✅  18 tests passing
build:all                   ✅  operator + marketplace both clean
```

---

## What to do next — Business Category Phase 1

**Design lock doc:** `docs/plans/2026-06-06-business-category-schema-design.md`  
**One-org-one-category decision:** confirmed (see doc update in same session).

### The exact gap between today's code and the design

| Layer | Today (gap) | Target |
|-------|------------|--------|
| `prisma/schema.prisma` | `DealershipProfile` has no `businessCategory` | Add `BusinessCategory` enum + field, default `AUTOMOTIVE` |
| `apps/web/src/lib/copy/index.ts` line 9 | `activeVertical = genericVertical` **hardcoded** | Remove hardcode; resolve from `CategoryContext` |
| `apps/web/src/lib/copy/vertical.ts` | `VerticalCopyAdapter` covers inventory labels only | Full `CategorySchema` from design doc |
| `packages/` | No `category-schemas` package | Create with `registry.ts`, `types.ts`, `generic/`, `automotive/`, 14 stub folders |
| `src/server/routes/dealers.ts` | Returns org without `businessCategory` | Add field to dealer/org API response |
| `apps/web/src/` | No `CategoryProvider` | Create; mount after org pick (same boundary as dealer scope) |

### Phase 1 task list (in order)

1. **Prisma** — Add `BusinessCategory` enum + `DealershipProfile.businessCategory @default(AUTOMOTIVE)`. Run `db:push`. Update seed to set `AUTOMOTIVE` on all existing orgs.
2. **API** — Expose `businessCategory` in dealer/org GET response (`src/server/routes/dealers.ts`). Add to OpenAPI spec.
3. **Category schemas package** — `packages/category-schemas/`:
   - `types.ts` — `CategorySchema`, `CategoryCopyBundle`, `BusinessCategorySlug`
   - `registry.ts` — `REGISTRY`, `resolveCategorySchema()`, `listCategories()`, `isActive()`
   - `generic/copy.en.ts` — fallback asset nouns
   - `automotive/copy.en.ts` — full automotive labels (migrate from `vertical.ts`)
   - `automotive/fields.ts` — inventory column defs
   - `automotive/formatters.ts` — `assetLead`, `assetMeta` for vehicle rows
   - 14 stub folders (one per non-automotive slug) — each with a `copy.en.ts` that extends `generic`
4. **CategoryProvider** — `apps/web/src/contexts/CategoryContext.tsx`. Reads from org; provides `useCategorySchema()`, `useCategoryCopy()`, `useInventoryLabels()`.
5. **Wire** — Replace `activeVertical` constant in `index.ts` with `useCategorySchema()` from context. Shell components read context, not import.
6. **Activate automotive** — `useInventoryLabels()` returns `automotiveVertical.inventory` for `AUTOMOTIVE` orgs; `taskActionLabel('SOLD')` returns "Sold" for automotive.
7. **Tests** — `category-schemas.test.ts`: org with `automotive` → correct labels; unknown slug → falls back to `generic`; placeholder category → working copy.

### What does NOT change in Phase 1

- `Vehicle` table stays as-is — no generic Asset model
- `apps/marketplace` untouched — consumer-facing category wiring is deferred
- Platform channel filtering by category is deferred
- The `VerticalCopyAdapter` type in `vertical.ts` can be kept as a compatibility shim while migration happens — migrate consumers to `CategorySchema` one page at a time

---

## Rules to carry forward

1. Shell components (`pages/`, `components/operator/`) call `useCategoryCopy()` — never import string literals for asset nouns.
2. New categories = new folder under `category-schemas/` + registry entry. Zero new pages.
3. Placeholder categories must render a working console with generic labels — no crashes, no `??` guards in render.
4. `BUSINESS_CATEGORY_SLUGS` is the single source of truth; enum and registry stay in sync.
5. Stop adding car-specific strings outside `category-schemas/automotive/`.

---

## Boundaries preserved this session

- No `@auto-dealer/api-client` imported into marketplace
- No operator routes touched
- No VIN in favorites list or card responses (enforced by backend `getMarketplaceFavorites`)
- No registration, no buyer profile, no dealer inbox, no messaging
- `apps/web` not touched
