# Auth & Security Model

## Two Independent Domains

The operator surface and the consumer marketplace are separate security domains. Their sessions, roles, and route sets are fully isolated — tokens are never interchangeable.

| Domain | Cookie | Issued by | Covers |
|---|---|---|---|
| Operator | `op_session` (HttpOnly, SameSite=None in prod) | `POST /api/auth/login` | `apps/web`, all `/api/dealers/*` routes |
| Consumer | `mp_session` (HttpOnly, SameSite=None in prod) | `POST /api/marketplace/auth/login` | `apps/marketplace`, favorites, profile |

---

## Operator Auth

### Identity model

```
OperatorAccount          — human with login credentials (email + argon2id hash)
OperatorDealerAccess     — junction: which dealerships an operator can see
OperatorSession          — active session (tokenHash SHA-256, 8h expiry, DB-backed)
```

### Roles

| Role | Access |
|---|---|
| `SUPER_ADMIN` | Global — all dealerships, all admin routes |
| `OPERATOR` | Scoped to `OperatorDealerAccess` rows |

### Session lifecycle

1. `POST /api/auth/login` — validates email + password, creates `OperatorSession` row, sets `op_session` cookie with raw 32-byte token.
2. Subsequent requests — `requireOperator` middleware resolves the SHA-256 hash of the token, loads `OperatorIdentity` (id, email, role, dealerAccessIds) from the session row.
3. `POST /api/auth/logout` — revokes the session row, clears the cookie.
4. Sessions expire after 8 hours. Revoked or expired sessions return 401.

### Dealer scoping

`requireDealerAccess` enforces that the operator has a row in `OperatorDealerAccess` for the requested `dealershipId`. SUPER_ADMINs bypass this check (global access).

---

## Consumer (Marketplace) Auth

### Identity model

```
MarketplaceUser          — consumer account (email + argon2id hash, displayName, phone)
MarketplaceSession       — active session (tokenHash SHA-256, 30d expiry, DB-backed)
MarketplaceFavorite      — vehicle listing saved by a consumer
```

### Routes

| Route | Auth required |
|---|---|
| `GET /api/marketplace/vehicles` and all browse routes | None — public |
| `POST /api/marketplace/vehicles/:id/leads` | None — public write (rate-limited) |
| `POST /api/marketplace/auth/register` | None |
| `POST /api/marketplace/auth/login` | None |
| `GET /api/marketplace/auth/me` | `mp_session` cookie |
| `GET /api/marketplace/me/favorites` | `mp_session` cookie |
| `POST/DELETE /api/marketplace/me/favorites/:id` | `mp_session` cookie |

---

## Route Classification

All routes are classified in `src/server/security.ts`. Every `operator` route is verified to return 401 with no auth by `src/tests/routeContract.test.ts` and `dataSafetyBoundary.test.ts`.

| Class | Description |
|---|---|
| `public` | No auth. GET reads, health check, OAuth callback. |
| `public-write` | No auth but rate-limited by IP. Dealer signup, lead submission, event tracking. |
| `auth` | Operator login/logout/me — no prior session required. |
| `operator` | Requires valid `op_session`. All dealer management routes. |
| `marketplaceAuth` | Requires valid `mp_session`. Consumer profile + favorites. |

---

## Dev-Only Auth Bypass

In `NODE_ENV=development`, the `DEV_OPERATOR_ID` env var enables passwordless login — any request without an `op_session` cookie is treated as that operator ID. This is rejected at startup in production by `validateEnv()`.

Do not set `DEV_OPERATOR_ID` in any environment other than local development.

---

## Data Boundary: VIN Isolation

VINs are internal identifiers and must never appear in marketplace API responses or feed artifacts. Enforced at three layers:

1. **Prisma query layer** — `VEHICLE_CARD_SELECT` and `VEHICLE_DETAIL_SELECT` in `marketplaceQueryService.ts` never select the `vin` field.
2. **Feed artifact layer** — `generateMarketplaceListingJson` explicitly excludes VIN.
3. **Compile-time boundary check** — `npm run marketplace:boundary:check` fails if the marketplace app ever imports a type or value that could expose VINs.

---

## Cookie Configuration

In production (`NODE_ENV=production`):

```
op_session: HttpOnly; SameSite=None; Secure; Path=/api; Max-Age=28800
mp_session: HttpOnly; SameSite=None; Secure; Path=/api; Max-Age=2592000
```

`SameSite=None; Secure` is required because the frontend SPAs and the API are on different Railway subdomains. Do not change to `SameSite=Strict` in production — it will block all credentialed cross-origin requests.

---

## Rate Limiting

Public write routes are rate-limited by IP using an in-memory bucket. Configured via env vars:

```
PUBLIC_WRITE_RATE_LIMIT=20        # max requests per window
PUBLIC_WRITE_RATE_WINDOW_MS=60000 # window duration in ms
```

**Limitation:** rate limit state is per-process and resets on restart. For multi-instance deployments a Redis or DB-backed bucket is required (currently deferred — single instance assumed).

Returns HTTP 429 with `Retry-After` header when the limit is exceeded.
