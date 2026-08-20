# Deployment Guide

## Railway Topology

Two Railway services in one project, both in the `startergrid` project:

| Service | Type | Notes |
|---|---|---|
| `MySQL` | Railway MySQL plugin | Provides `DATABASE_URL` via `${{MySQL.MYSQL_URL}}` |
| `auto-dealer-operator-ui` | Fastify backend + all 3 SPAs | Single service. Build: `npx prisma generate && npm run build:all`. Start: `npx prisma migrate deploy && node dist/src/scripts/server.js` |

The Fastify server (`src/server/app.ts`) serves the built operator UI at `/app/`, the marketplace UI at `/marketplace/`, the splash/landing page at `/`, and the API at `/api/*` — all from one process, one deploy. There is no separate `web`/`marketplace`/`splash` service; that 4-service split was consolidated into one service to cut build complexity and cost for the POC stage. Config lives in the root `railway.toml` — `apps/*/railway.toml` no longer exist.

Nixpacks needs `NIXPACKS_PKGS=python3 gcc` set on the service (build-time variable, not in `railway.toml`) — `@cardog/corgi`'s `better-sqlite3` dependency compiles from source on this platform and Railway's default Nixpacks Node image has neither.

---

## Environment Variables

All variables below live on the single `auto-dealer-operator-ui` service — there's no separate frontend service to configure.

### Required

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` (Railway plugin reference) |
| `APP_BASE_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` — this service's own public URL |
| `SESSION_SECRET` | Min 32 chars. Generate: `openssl rand -hex 32` |
| `PUBLIC_WRITE_RATE_LIMIT` | `20` (requests per window per IP) |
| `PUBLIC_WRITE_RATE_WINDOW_MS` | `60000` |
| `NIXPACKS_PKGS` | `python3 gcc` — build-time only, needed for `better-sqlite3` native compile |

### Optional

| Variable | Default | Notes |
|---|---|---|
| `DISPATCH_ENVIRONMENT` | `MOCK` | `MOCK` \| `SANDBOX` \| `PRODUCTION`. See [Dispatch Safety](#dispatch-safety) below — this is a different, narrower gate than platform integrations. |
| `ALLOWED_ORIGINS` | — | Only needed if something outside this origin calls the API with credentials. The 3 SPAs are same-origin now, so this is normally unset. |
| `SMTP_ENABLED` | `false` | Set `true` + all `SMTP_*` vars to enable transactional email |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | — | Required when `SMTP_ENABLED=true` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | — | Optional. SMS lead alerts. |
| `STORAGE_DRIVER` | `local` | `local` \| `s3`. **Use `s3` in production** — local disk is ephemeral on Railway; uploaded files (vehicle photos, etc.) are lost on every redeploy under `local`. |
| `S3_BUCKET` / `S3_REGION` / `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_PUBLIC_BASE_URL` | — | Required when `STORAGE_DRIVER=s3` |
| `OAUTH_REDIRECT_BASE_URL` | — | Must match registered OAuth redirect URIs in each provider console. See [Platform Integrations Go-Live](./integrations-go-live.md). |

Platform integration credentials (Meta, Google, eBay, TikTok, etc.) are their own topic — see [`docs/integrations-go-live.md`](./integrations-go-live.md).

---

## First Deploy (new environment)

1. **Create Railway project** → `railway add --database mysql`.
2. **Create the service** from the GitHub repo, set all required env vars above, and generate a public domain (`railway domain`) so `APP_BASE_URL` has something to reference.
3. **First deploy** runs `prisma generate && npm run build:all` at build time, then `prisma migrate deploy` (creates schema from migrations) before starting the server. Confirm `/health` returns `{ ok: true }`, and that `/`, `/app/`, and `/marketplace/` all load.
4. **Seed the database** (one-time):
   ```bash
   railway run npm run db:seed
   ```
   This creates platform profiles and a seed admin account (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars, defaults `admin@example.local` / `dev-change-me` — override these).

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

`DISPATCH_ENVIRONMENT` gates the generic submission/scheduler pipeline (`src/services/publishing/dispatchAdapter.ts`) — the code path behind the sync scheduler and the broader multi-platform submission lifecycle:

| Value | Behavior |
|---|---|
| `MOCK` (default) | All dispatch returns a mock receipt — no external HTTP |
| `SANDBOX` | **Not implemented.** Throws `DispatchNotImplementedError` unconditionally, regardless of credentials. |
| `PRODUCTION` | **Not implemented.** Same — throws `DispatchNotImplementedError` even when explicitly set. |

As of this writing, there is no live implementation behind this specific adapter for any value other than `MOCK` — changing the env var does not unlock anything.

This is a **different, narrower gate** than platform integrations as a whole. The Catalog Sync feature (10 ad-catalog platforms — Meta, Google, TikTok, Microsoft, Pinterest, Snapchat, Reddit, X, Nextdoor, TikTok Shop) and the eBay listing/OAuth flow are separate subsystems that make real API calls today, independent of `DISPATCH_ENVIRONMENT`, once their OAuth credentials are configured and an account is connected. See [`docs/integrations-go-live.md`](./integrations-go-live.md) for the full picture.
