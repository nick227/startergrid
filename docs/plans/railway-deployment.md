# Railway Deployment Plan

## Topology

Four Railway services in one project:

| Service | Type | URL pattern |
|---|---|---|
| `db` | Railway MySQL plugin | (internal) |
| `api` | Fastify backend | `api-<project>.up.railway.app` |
| `web` | Operator portal SPA | `portal-<project>.up.railway.app` |
| `marketplace` | Consumer marketplace SPA | `marketplace-<project>.up.railway.app` |

All app services point to the **same GitHub repo** with different build/start commands. Root directory stays at `/` (repo root) so npm workspaces can resolve `apps/*` + `packages/*` from a single install.

---

## Blockers — Code Changes Required First

### 1. `src/scripts/server.ts` — HOST default
`HOST` defaults to `127.0.0.1`. Railway's load balancer requires the server to bind `0.0.0.0`.
```ts
// line 9 — change:
const HOST = process.env['HOST'] ?? '0.0.0.0';
```

### 2. `src/server/app.ts` — Add CORS
No CORS exists. When frontend is on a different domain, all credentialed API calls will be blocked by the browser.
- Install `@fastify/cors` (add to root `package.json` dependencies)
- Register at the top of `buildApp()`:
```ts
import cors from '@fastify/cors';
// inside buildApp(), before route registration:
await app.register(cors, {
  origin: (process.env['ALLOWED_ORIGINS'] ?? '').split(',').filter(Boolean),
  credentials: true,
});
```

### 3. `src/server/routes/auth.ts` — Cookie SameSite
`SameSite=Strict` blocks cookies on cross-origin requests. Must be `SameSite=None; Secure` in production.
```ts
// line 23 — change makeSessionCookieHeader():
const sameSite = isProd ? 'None' : 'Strict';
const secure   = isProd ? '; Secure' : '';
return `op_session=${rawToken}; HttpOnly; SameSite=${sameSite}; Path=/api; Max-Age=${maxAge}${secure}`;
// line 27 — change makeClearCookieHeader():
return `op_session=; HttpOnly; SameSite=${isProd ? 'None' : 'Strict'}; Path=/api; Max-Age=0${isProd ? '; Secure' : ''}`;
```

### 4. `src/server/routes/marketplaceAuth.ts` — Cookie SameSite
Same fix as above for `mp_session` cookie (lines 22–27).

### 5. `apps/web/src/lib/api/configureOpenApi.ts` — API base URL
Currently hardcodes `OpenAPI.BASE = ''` (same-origin). In production the API is on a different domain.
```ts
// Change:
OpenAPI.BASE = import.meta.env.VITE_API_URL ?? '';
```
`VITE_API_URL` is set as a Railway build-time env var on the web service and baked into the bundle at build time.

### 6. `apps/marketplace/src/main.tsx` — Marketplace API base URL
The marketplace client also sets `OpenAPI.BASE = ''` at package import time (`packages/marketplace-client/index.ts`). Override it before the app renders:
```ts
// Add at top of main.tsx, before App render:
import { OpenAPI } from '@dealer-marketplace/client';
OpenAPI.BASE = import.meta.env.VITE_API_URL ?? '';
```

### 7. `railway.toml` (new — repo root) — API service config
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npx prisma generate && npx prisma db push && npm run build"

[deploy]
startCommand = "node dist/src/scripts/server.js"
healthcheckPath = "/health"
healthcheckTimeout = 60
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```
> `prisma db push` runs during the build phase (not on every restart). It is idempotent — safe to run on every deploy.

### 8. `apps/web/railway.toml` (new) — Web service config
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run ui:build"

[deploy]
startCommand = "npx serve apps/web/dist -s -l $PORT"
```

### 9. `apps/marketplace/railway.toml` (new) — Marketplace service config
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run marketplace:build"

[deploy]
startCommand = "npx serve apps/marketplace/dist -s -l $PORT"
```

---

## Environment Variables

### API service
| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{MySQL.DATABASE_URL}}` (Railway plugin ref) |
| `APP_BASE_URL` | `https://api-<project>.up.railway.app` |
| `SESSION_SECRET` | 48-char random string (generate once, store) |
| `PUBLIC_WRITE_RATE_LIMIT` | `20` |
| `PUBLIC_WRITE_RATE_WINDOW_MS` | `60000` |
| `ALLOWED_ORIGINS` | `https://portal-<project>.up.railway.app,https://marketplace-<project>.up.railway.app` |
| `HOST` | `0.0.0.0` (or handled by code default above) |

### Web service (build-time — baked into bundle)
| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://api-<project>.up.railway.app` |

### Marketplace service (build-time — baked into bundle)
| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://api-<project>.up.railway.app` |

---

## Deployment Order

1. **Create Railway project** → add MySQL plugin → copy `DATABASE_URL`
2. **Deploy API service** first
   - Set all env vars listed above
   - First deploy runs `prisma db push` (creates schema) + starts server
   - Confirm `/health` returns `{ ok: true }`
3. **Seed the database** (one-time)
   - Railway CLI: `railway run npm run db:seed`
4. **Deploy Web service**
   - Set `VITE_API_URL` to the API service URL
   - Confirm the portal loads and can log in
5. **Deploy Marketplace service**
   - Set `VITE_API_URL` to the API service URL
   - Confirm the marketplace feed loads

---

## Files to Modify (summary)

| File | Change |
|---|---|
| `package.json` | Add `@fastify/cors` to dependencies |
| `src/scripts/server.ts` | HOST default → `'0.0.0.0'` |
| `src/server/app.ts` | Register `@fastify/cors` with `ALLOWED_ORIGINS` |
| `src/server/routes/auth.ts` | `SameSite=None` + `Secure` in production |
| `src/server/routes/marketplaceAuth.ts` | Same cookie fix |
| `apps/web/src/lib/api/configureOpenApi.ts` | `VITE_API_URL ?? ''` for `OpenAPI.BASE` |
| `apps/marketplace/src/main.tsx` | Set `OpenAPI.BASE` from `VITE_API_URL` |

## New Files

| File | Purpose |
|---|---|
| `railway.toml` | API service build + start config |
| `apps/web/railway.toml` | Web SPA build + serve config |
| `apps/marketplace/railway.toml` | Marketplace SPA build + serve config |

---

## Notes

- **`file:` package links** resolve correctly because the build root stays at `/` for all services. `npm ci` in the repo root satisfies the `file:../..` root-package dep in `apps/web`.
- **`VITE_API_URL`** is a Vite build-time variable — it gets baked into the JS bundle at build time, not read at runtime. Setting it in Railway's env vars for the service covers this.
- **`serve`** (`npx serve`) is used to host the SPA dist folders. It handles SPA mode (`-s`) so all routes fall back to `index.html`. Both apps use hash routing so this is mainly for robustness.
- **No custom domains** are required — Railway's generated `.up.railway.app` subdomains work fine for the CORS allowlist and cookie `Secure` flag (Railway provides HTTPS on these domains).
- **SMTP**: `SMTP_ENABLED` defaults to false so no SMTP vars are needed initially.
- **`DISPATCH_ENVIRONMENT`**: Omit for now (defaults to MOCK behavior — no real external dispatch calls).
