# User Types & Auth Boundary Plan

**Created:** 2026-06-06  
**Status:** Phase B complete (2026-06-06) · Phase C2/C3 complete (2026-06-06) — marketplace auth + favorites API implemented; apps/marketplace UI wiring is separate future work  
**Scope:** Define all user/account models and route boundaries for both authenticated surfaces before any auth implementation begins.

---

## Routing Clarification (approved 2026-06-06)

All backend routes — operator auth, marketplace auth, and marketplace favorites — live in `src/server/`. `apps/marketplace` and `apps/web` are frontend-only and consume their respective generated OpenAPI SDK clients. No server/API logic goes inside the app packages.

---

## Guiding Principle

The operator portal (`apps/web`) and consumer marketplace (`apps/marketplace`) are different security domains. They have different threat models, different session lifetimes, different privacy surfaces, and different role sets. They must not share a single User model. Auth tokens must not be interchangeable across domains.

---

## 1. Operator User Types

Operator accounts belong to us — the platform team. They authenticate internal staff and, eventually, dealer operators who need limited access to their own data. These accounts live in the operator Prisma schema alongside all platform data.

### 1.1 — `OperatorAccount`

Represents a human with login credentials. This is the primary identity record.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (CUID) | Primary key |
| `email` | `String` (unique) | Login identifier |
| `passwordHash` | `String` | Argon2id |
| `role` | `OperatorRole` | Enum — see §1.4 |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |
| `lastLoginAt` | `DateTime?` | Updated on each successful login |
| `isActive` | `Boolean` | Soft disable without deleting |

### 1.2 — `OperatorDealerAccess`

Junction record linking an operator account to one or more dealerships. Not all operator roles need this (SUPER_ADMIN has implicit global access). Used by DEALER_OPERATOR role.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (CUID) | |
| `operatorAccountId` | `String` | FK → `OperatorAccount` |
| `dealershipId` | `String` | FK → `DealershipProfile` |
| `grantedAt` | `DateTime` | |
| `grantedBy` | `String` | FK → `OperatorAccount` (who granted access) |

Unique constraint on `(operatorAccountId, dealershipId)`.

### 1.3 — `OperatorSession`

Server-side session record for token revocation and audit. Operator sessions use opaque tokens (not JWTs) so revocation is immediate.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (CUID) | Token value (random 32-byte hex, stored hashed) |
| `tokenHash` | `String` (unique) | SHA-256 of the raw token |
| `operatorAccountId` | `String` | FK → `OperatorAccount` |
| `createdAt` | `DateTime` | |
| `expiresAt` | `DateTime` | 8-hour sliding window |
| `revokedAt` | `DateTime?` | Set on logout; NULL = active |
| `ipAddress` | `String?` | Client IP at creation |
| `userAgent` | `String?` | |

Auth middleware checks `expiresAt > now AND revokedAt IS NULL`. Expired and revoked rows are kept for audit; a background job prunes rows older than 90 days.

### 1.4 — `OperatorRole` Enum

```
SUPER_ADMIN       — Full platform access, no scoping restrictions
OPERATOR          — Full platform access scoped to assigned dealerships (or all if no restrictions set)
DEALER_OPERATOR   — Read-only access to their dealership's listing/performance data only (deferred to Phase D)
```

`DEALER_OPERATOR` is defined in the enum now so the schema is stable, but no routes or UI will use it until Phase D.

---

## 2. Marketplace User Types

Marketplace users are anonymous consumers who opt into an account to save favorites. These records live in a separate Prisma schema (or a schema namespace) and are never joined to operator data by application code.

### 2.1 — `MarketplaceUser`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (CUID) | Primary key |
| `email` | `String` (unique) | Login identifier |
| `passwordHash` | `String` | Argon2id |
| `displayName` | `String?` | Optional, consumer-facing only |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |
| `lastLoginAt` | `DateTime?` | |
| `isActive` | `Boolean` | Soft disable |

No operator-side fields. No role field — all marketplace users are CONSUMER.

### 2.2 — `MarketplaceSession`

Same structure as `OperatorSession` but a separate table. Tokens are domain-scoped and cannot be replayed against operator routes.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (CUID) | |
| `tokenHash` | `String` (unique) | SHA-256 of raw token |
| `marketplaceUserId` | `String` | FK → `MarketplaceUser` |
| `createdAt` | `DateTime` | |
| `expiresAt` | `DateTime` | 30-day sliding window (consumer UX expectation) |
| `revokedAt` | `DateTime?` | |
| `ipAddress` | `String?` | |
| `userAgent` | `String?` | |

### 2.3 — `MarketplaceFavorite`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (CUID) | |
| `marketplaceUserId` | `String` | FK → `MarketplaceUser` |
| `vehicleId` | `String` | FK → `Vehicle` — the listing ID only |
| `savedAt` | `DateTime` | |

Unique constraint on `(marketplaceUserId, vehicleId)`. When a vehicle is sold/delisted, favorites are not deleted — the UI shows "no longer available" using the listing ID lookup. No VIN, no operator state, no sync data is stored here.

### 2.4 — Roles / Scopes

There is one marketplace role: **CONSUMER**. No enum field is stored on the model — the token's domain (`MarketplaceSession`) is the scope boundary. This keeps the model simple and prevents role-escalation at the data level.

---

## 3. Route Groups

### 3.1 — Operator Auth Routes

All operator routes live under `/api/` (no `/marketplace/` prefix). They are in the main Express app (`src/server/`).

```
POST   /api/auth/login          — Email + password → set HttpOnly cookie with session token
POST   /api/auth/logout         — Revoke session token, clear cookie
GET    /api/auth/me             — Return { id, email, role, dealerAccess[] } for the active session
```

**Auth cookie:** `op_session`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api`. No token in response body.

**Middleware:** `requireOperatorAuth` — validates cookie token, checks session table, attaches `req.operatorAccount` to request context. All existing operator routes add this middleware in Phase B.

**Rate limiting:** 5 attempts per IP per 15 minutes on `/api/auth/login`. Existing per-IP limiter covers this; login endpoint gets a tighter sub-bucket.

### 3.2 — Marketplace Auth Routes

Marketplace auth lives under `/api/marketplace/auth/`. Favorites under `/api/marketplace/me/`. Both served from the marketplace Express app (`apps/marketplace/` or the shared server depending on final deployment shape).

```
POST   /api/marketplace/auth/login                      — Email + password → set HttpOnly cookie with marketplace session token
POST   /api/marketplace/auth/logout                     — Revoke session, clear cookie
GET    /api/marketplace/auth/me                         — Return { id, email, displayName } — no operator fields
GET    /api/marketplace/me/favorites                    — List favorited vehicles (public listing fields only)
POST   /api/marketplace/me/favorites/:listingId         — Add a vehicle to favorites
DELETE /api/marketplace/me/favorites/:listingId         — Remove a vehicle from favorites
```

**Auth cookie:** `mp_session`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/marketplace`. Different cookie name and path from operator — cannot be replayed.

**Middleware:** `requireMarketplaceAuth` — validates `mp_session`, checks `MarketplaceSession` table, attaches `req.marketplaceUser`. The public listing routes (`GET /api/marketplace/vehicles`, `GET /api/marketplace/vehicles/:id`) remain unauthenticated.

**Rate limiting:** 10 attempts per IP per 15 minutes on login. Favorites mutations: 30 per IP per minute (same as existing marketplace POST limiter).

---

## 4. OpenAPI Split

### 4.1 — `openapi/openapi.yaml` (Operator)

Add operator auth routes to the existing operator OpenAPI spec:

```yaml
/api/auth/login:
  post: { ... }
/api/auth/logout:
  post: { ... }
/api/auth/me:
  get: { ... }
```

Components to add: `OperatorAuthLoginRequest`, `OperatorAuthMeResponse`, `OperatorAuthError`.

### 4.2 — `openapi/openapi-marketplace.yaml` (Marketplace)

Add marketplace auth and favorites routes:

```yaml
/api/marketplace/auth/login:
  post: { ... }
/api/marketplace/auth/logout:
  post: { ... }
/api/marketplace/auth/me:
  get: { ... }
/api/marketplace/me/favorites:
  get: { ... }
/api/marketplace/me/favorites/{listingId}:
  post: { ... }
  delete: { ... }
```

Components to add: `MarketplaceAuthLoginRequest`, `MarketplaceAuthMeResponse`, `MarketplaceFavoriteItem`, `MarketplaceFavoritesResponse`.

### 4.3 — SDKs

Generated clients remain separate:
- `packages/operator-client/` — from `openapi.yaml`
- `packages/marketplace-client/` — from `openapi-marketplace.yaml`

No cross-SDK imports. The marketplace SDK must not expose types from `OperatorAuthMeResponse` or any operator-side model.

---

## 5. Privacy Rules

These rules are absolute. Any route that returns vehicle data to a marketplace user or an unauthenticated caller must strip the following fields before serialization.

**Never expose to marketplace users or public callers:**

| Category | Fields |
|---|---|
| Identification | `vin` — **except** on the Vehicle Detail Page (VDP): full VIN is intentionally exposed per `docs/plans/2026-06-06-marketplace-vdp-design.md`. VIN is never in the list feed or card SELECT. |
| Sync state | `syncState`, `lastSyncedAt`, `syncSource`, `ingressRunId`, `externalId` |
| Account / operator state | `operatorId`, `dealerAccountId`, `readinessScore`, `readinessFlags`, `publishQueueItems` |
| Workflow internals | `authorizationPackets`, `submissionAttempts`, `mockValidationRuns` |
| Billing / subscription | `DealerSubscription.*`, `PlatformCredentialRef.*` |
| Performance internals | `VehiclePerformanceCache.*`, `PlatformPerformanceSummary.*` (raw caches — aggregated stats for a public listing page are OK if designed for it) |
| Operator notes | Any `notes`, `internalNotes`, `operatorNotes` fields |
| Infrastructure | `SyncPolicy.*`, `SyncRun.*`, `SyncEvent.*`, `IngressRun.*`, `PublishQueueItem.*` |

**Safe to expose (marketplace listing fields):**

`id`, `year`, `make`, `model`, `trim`, `bodyStyle`, `exteriorColor`, `interiorColor`, `mileage`, `price`, `condition`, `fuelType`, `transmission`, `drivetrain`, `stockNumber` (listing reference, not VIN), `description`, `VehicleMedia.*` (URLs only), `DealershipProfile.displayName`, `DealershipProfile.city`, `DealershipProfile.state`.

Enforcement: marketplace query service (`src/services/marketplace/marketplaceQueryService.ts`) applies a Prisma `select` projection. No `include` of raw operator relations. This is already partially in place — auth additions must not weaken it.

---

## 6. Implementation Phases

### Phase A — Schema Only

- Add `OperatorAccount`, `OperatorDealerAccess`, `OperatorSession` to `prisma/schema.prisma`
- Add `MarketplaceUser`, `MarketplaceSession`, `MarketplaceFavorite` to `prisma/schema.prisma`
- Add `OperatorRole` enum
- Run migration — no application code changes
- Write seed script for at least one SUPER_ADMIN account

**Deliverables:** migration file, seed script, `OperatorRole` enum in schema.  
**Does not:** touch any route, middleware, or client.

### Phase B — Operator Auth ✅ Complete (2026-06-06)

**Implemented across three sub-phases:**

- **B1** — Password hashing (argon2id) + session token primitives (SHA-256 hashed, 8-hour lifetime, DB-backed revocation). Services: `src/services/auth/passwordService.ts`, `sessionService.ts`. Tests: `operatorAuth.test.ts`.
- **B2** — Auth routes: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. op_session HttpOnly cookie; Secure flag in production. Tests: `operatorAuthRoutes.test.ts`.
- **B3** — Production guard migration: `requireOperator` and `requireDealerAccess` in `src/server/security.ts` migrated to real session-cookie auth. Production rejects x-operator-id and DEV_OPERATOR_ID fallbacks. SUPER_ADMIN has global dealer access; OPERATOR is scoped to OperatorDealerAccess rows. Dev/test retains x-operator-id fallback. Tests: `operatorGuardMigration.test.ts`.
- **Consolidation** — OpenAPI `OperatorAuth` security scheme updated from stale bearer placeholder to op_session cookie type. Auth domain boundary tests added: `authBoundary.test.ts` (marketplace routes ignore op_session; no operator SDK imports in apps/marketplace). Tests: `authBoundary.test.ts`.

**Current state:** `openapi/openapi.yaml` has auth routes with operationIds. Generated SDK (`packages/api-client/`) has `AuthService` with `operatorLogin`, `operatorLogout`, `getOperatorMe`. All 19 operator routes protected by real session auth in production.

**Does not:** touch marketplace auth (Phase C).

### Phase C2 — Marketplace Auth ✅ Complete (2026-06-06)

**Implemented:**
- `POST /api/marketplace/auth/login` — verifies password (argon2id), creates `MarketplaceSession`, sets `mp_session` HttpOnly cookie (`Path=/api/marketplace`, `SameSite=Strict`, Secure in production, 30-day `Max-Age`). Unknown email and wrong password return identical 401 (no user enumeration).
- `POST /api/marketplace/auth/logout` — revokes session if present, clears cookie. Always 200.
- `GET /api/marketplace/auth/me` — validates `mp_session`, returns `{ id, email, displayName }`. 401 for missing/invalid/revoked/expired/inactive.
- `requireMarketplaceUser` helper in `src/server/security.ts` — validates `mp_session` cookie against `MarketplaceSession` table via `getMarketplaceUserFromSessionToken`.
- `MarketplaceAuthError` — typed error class with codes: `session_not_found`, `session_revoked`, `session_expired`, `account_inactive`.
- `MarketplaceCookieAuth` security scheme added to `openapi/openapi-marketplace.yaml`.
- Marketplace SDK regenerated — `MarketplaceAuthService`, `MarketplaceUserIdentity`, `MarketplaceLoginRequest`, `MarketplaceLogoutResponse`.
- 28 route-level tests in `src/tests/marketplaceAuthRoutes.test.ts`. Service-level tests in `src/tests/marketplaceAuth.test.ts`.
- Cross-domain isolation proven: `op_session` cannot authenticate marketplace routes; `mp_session` cannot authenticate operator routes.

**Does not:** change public listing/browse routes. Does not share tokens or models with operator domain.

### Phase C3 — Marketplace Favorites ✅ Complete (2026-06-06)

**Implemented:**
- `GET /api/marketplace/me/favorites` — returns `{ favorites: MarketplaceVehicleCard[], total }`. Eligibility filter applied at query time; ineligible vehicles (sold/removed/unpriced) are silently omitted. `MarketplaceFavorite` row is preserved so the card reappears if re-listed.
- `POST /api/marketplace/me/favorites/:listingId` — idempotent upsert. 404 if listing not found or not marketplace-eligible. Returns `{ favorited: true, listingId }`.
- `DELETE /api/marketplace/me/favorites/:listingId` — idempotent `deleteMany`. Always 200 with `{ ok: true }`.
- `src/services/marketplace/marketplaceFavoriteService.ts` — `addFavorite`, `removeFavorite`, `isVehicleEligible`.
- `getMarketplaceFavoriteCards` added to `marketplaceQueryService.ts` — uses same `VEHICLE_CARD_SELECT` as browse; VIN never fetched.
- Favorites routes added to `openapi/openapi-marketplace.yaml` under `MarketplaceAuth` tag with `MarketplaceCookieAuth` security.
- Marketplace SDK regenerated — `MarketplaceFavoritesResponse`, `MarketplaceFavoriteAddResponse`, `MarketplaceFavoriteRemoveResponse` in `packages/marketplace-client/`.
- 27 route-level tests in `src/tests/marketplaceFavorites.test.ts`.
- Contract tests updated: `marketplaceRouteContract.test.ts`, `routeRegistryContract.test.ts`, `openapiSecurityConsistency.test.ts`.

**Unavailable favorite policy:** sold/removed/unpriced vehicles are **omitted** from GET (not returned as unavailable). The `MarketplaceFavorite` row is preserved — cards reappear automatically if the vehicle is re-listed. This keeps the list clean without losing saved intent.

**Does not:** add marketplace registration UI. Does not add favorites UI. `apps/marketplace` UI wiring is separate future work.

### Phase C — Remaining Work

- **Registration endpoint** (`POST /api/marketplace/auth/register`) — not yet implemented. Phase C2 only covers login for already-seeded users.
- **apps/marketplace UI wiring** — login page, favorites pages, `mp_session` cookie handling in the browser app. Backend API is ready; frontend is separate future work.
- **Email verification** — required before Phase C goes to real users; not implemented yet.

### Phase D — Dealer Marketplace Portal (Deferred)

### Phase D — Dealer Marketplace Portal (Deferred)

- Activate `DEALER_OPERATOR` role on `OperatorAccount`
- Add read-only routes returning dealership-scoped listing and performance data
- Separate UI surface (may be a subdomain or route group within `apps/web`)
- Scoped by `OperatorDealerAccess` records

**Deliverables:** dealers can log in to see their own inventory and lead stats.  
**Does not:** give dealer operators access to other dealers' data or any platform-admin functions.

---

## 7. What This Plan Defers

| Item | Why |
|---|---|
| OAuth / social login | Adds OAuth state management; not needed for internal or MVP consumer use |
| Magic link / passwordless | Nice-to-have; adds email dependency in auth path |
| MFA / TOTP | Important before dealer-operator login; deferred to Phase D pre-work |
| Dealer inbox / messaging | Separate feature with its own auth surface |
| JWT tokens | Opaque tokens + server-side session table is simpler to revoke; JWT considered for stateless scale-out only if needed later |
| Email verification flow | Required before Phase C goes to real users; not needed for dev/staging |
| Marketplace registration UI | Deferred — API exists in Phase C, UI follows |
