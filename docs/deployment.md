# Deployment Guide

## Railway Topology

Four Railway services in one project, all pointing at the same GitHub repo:

| Service | Type | Build root | Start command |
|---|---|---|---|
| `db` | Railway MySQL plugin | — | — |
| `api` | Fastify backend | `/` | `npx prisma migrate deploy && node dist/src/scripts/server.js` |
| `web` | Operator portal SPA | `/` | `npx serve apps/web/dist -s -l $PORT` |
| `marketplace` | Consumer marketplace SPA | `/` | `npx serve apps/marketplace/dist -s -l $PORT` |

Each service has its own `railway.toml` at its root (root `railway.toml` covers the API service; `apps/web/railway.toml` and `apps/marketplace/railway.toml` cover the SPAs).

---

## Environment Variables

### API service (required)

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{MySQL.DATABASE_URL}}` (Railway plugin reference) |
| `APP_BASE_URL` | HTTPS URL of this API service |
| `SESSION_SECRET` | Min 32 chars. Generate: `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs: `https://portal-xxx.up.railway.app,https://marketplace-xxx.up.railway.app` |
| `PUBLIC_WRITE_RATE_LIMIT` | `20` (requests per window per IP) |
| `PUBLIC_WRITE_RATE_WINDOW_MS` | `60000` |

### API service (optional)

| Variable | Default | Notes |
|---|---|---|
| `DISPATCH_ENVIRONMENT` | `MOCK` | `MOCK` \| `SANDBOX` \| `PRODUCTION`. Leave as MOCK until platforms are wired. |
| `SMTP_ENABLED` | `false` | Set `true` + all `SMTP_*` vars to enable transactional email |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | — | Required when `SMTP_ENABLED=true` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | — | Optional. SMS lead alerts. |
| `STORAGE_DRIVER` | `local` | `local` \| `s3`. Use `s3` in production (local disk is ephemeral on Railway). |
| `S3_BUCKET` / `S3_REGION` / `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_PUBLIC_BASE_URL` | — | Required when `STORAGE_DRIVER=s3` |
| `OAUTH_REDIRECT_BASE_URL` | — | Must match registered OAuth redirect URIs in each provider console |

### Web service (build-time)

| Variable | Value |
|---|---|
| `VITE_API_URL` | HTTPS URL of the API service |

### Marketplace service (build-time)

| Variable | Value |
|---|---|
| `VITE_API_URL` | HTTPS URL of the API service |

`VITE_*` variables are baked into the JS bundle at build time by Vite — they must be set on the Railway service, not at runtime.

---

## First Deploy (new environment)

1. **Create Railway project** → add MySQL plugin → note the `DATABASE_URL`.
2. **Deploy API service** — set all required env vars. First deploy runs `prisma migrate deploy` (creates schema from migrations) then starts the server. Confirm `/health` returns `{ ok: true }`.
3. **Seed the database** (one-time):
   ```bash
   railway run npm run db:seed
   ```
   This creates platform profiles and a seed admin account (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars, defaults `admin@example.local` / `dev-change-me` — override these).
4. **Deploy Web service** — set `VITE_API_URL`. Confirm the portal loads and login works.
5. **Deploy Marketplace service** — set `VITE_API_URL`. Confirm the marketplace feed loads.

---

## Subsequent Deploys

Railway redeploys on push to the connected branch. Each deploy:
- Rebuilds the app
- Runs `npx prisma migrate deploy` at start (API service only) — applies any new migrations against the live DB
- Restarts the server

Migrations must be additive. Never drop columns in a production migration. Column removal requires a two-deploy strategy: deprecate first, remove after.

---

## Pre-Deploy Checklist

Run locally or in CI before merging to the deploy branch:

```bash
npm run verify:all
```

This runs: OpenAPI lint (both specs) → backend tests → frontend tests → boundary checks.

Individual gates:
```bash
npm run openapi:validate
npm run openapi:validate:marketplace
npm test
npm run marketplace:boundary:check
npm run operator:boundary:check
```

---

## Database Strategy

| Context | Command | Notes |
|---|---|---|
| Local dev | `npx prisma migrate dev` | Creates migration files, applies them, regenerates client |
| Local reset | `npm run db:reset` | Wipes + re-migrates + re-seeds |
| Production deploy | `npx prisma migrate deploy` | Applies pending migrations only — no schema inference |
| First prod baseline | `npm run db:baseline` | One-time: marks existing schema as baselined if DB was created via `db push` |

Never use `prisma db push` in production. It bypasses the migration chain.

---

## Self-Hosted (PM2)

If deploying to a VPS instead of Railway, use PM2. See `docs/examples/ecosystem.config.js` for a ready-to-use config covering the API server + three background jobs.

```bash
cp docs/examples/ecosystem.config.js ecosystem.config.js
# fill in env vars
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## Dispatch Safety

`DISPATCH_ENVIRONMENT` controls whether the sync scheduler makes real platform API calls:

| Value | Behavior |
|---|---|
| `MOCK` (default) | All dispatch writes to `mock-platform-receipts/` — no external HTTP |
| `SANDBOX` | Calls platform sandbox APIs (per-platform adapter required) |
| `PRODUCTION` | Live dispatch — requires explicit opt-in; hard gate in `dispatchAdapter.ts` |

Do not set `DISPATCH_ENVIRONMENT=PRODUCTION` until per-platform live adapters are implemented and tested in sandbox.
