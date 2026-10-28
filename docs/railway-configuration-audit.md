# Railway configuration audit and IaC plan

Audited 2026-10-27. Scope: startergrid / production. No remote changes or deployments performed.

## Verified topology

Production has two services, not separate API and frontend services:

| Service | Role | Source |
| --- | --- | --- |
| auto-dealer-operator-ui | Fastify API plus operator, marketplace, and splash SPAs | nick227/startergrid, main |
| MySQL | Database with persistent volume at /var/lib/mysql | mysql:9 |

`src/server/app.ts` serves the operator bundle at `/app/`, marketplace at `/marketplace/`, and splash at `/`. Root `package.json` builds the backend and all three SPAs via `build:all`. The archived four-service deployment proposal does not describe the current topology.

## Confirmed commands

Application build (live Railway settings):

```sh
npm ci && npx prisma generate && npm run build:all
```

Application start (live settings and local railway.toml):

```sh
npx prisma migrate deploy && node dist/src/scripts/server.js
```

Application uses Nixpacks, `/health`, a 300-second healthcheck timeout, three restart retries, and one replica in `us-east4-eqdc4a`. The latest deployment manifest reports `ON_FAILURE` restart policy. The local TOML build omits the live command's initial `npm ci`; preserve the live command when importing.

Database has no application build command; it uses the mysql:9 image. Its live start command is:

```sh
docker-entrypoint.sh mysqld --innodb-use-native-aio=0 --disable-log-bin --performance_schema=0 --innodb-buffer-pool-size=1G
```

Preserve the database volume, one replica, region, private endpoint, and image update policy.

## Config ownership

The application service's live `configFile` is an empty string. `railway config migrate status` reports: **No services in production read Config as Code.** Neither service has staged changes at audit time.

The local `railway.toml` describes the combined application, despite the UI-oriented service name. It is not currently the production configuration source. The earlier service-scoped migration preview finding no file therefore does not establish a service mismatch.

## Proposed migration sequence — import and plan now verified

1. Reconfirm the linked project and production environment immediately before import. Preserve the existing service names and combined application topology.
2. Import current live settings with `railway config pull --variables=unmanaged`. This writes local `.railway/railway.ts` and supporting files; it does not apply remote configuration. Leave variable ownership in Railway and do not use `--include-variables`.
3. Review the generated project graph against both services above. Preserve database storage, networking, image-update policy, application build/start commands, healthcheck, restart policy, and placement. Do not split or rename services as part of adoption.
4. Install the required TypeScript authoring SDK in the appropriate package environment if needed, then run `railway config plan`. Resolve any unexpected updates or resource deletions before proceeding. Target a no-change adoption plan. The follow-up verification imported `.railway/railway.ts` and ran both verbose and JSON plans successfully: `changes: []`, `diagnostics: []`, exit code 0.
5. Review how the installed CLI handles adoption of existing resources. Apply only after an explicit request approving the reviewed plan. No Config as Code cutover is indicated by the current migration status.
6. After adoption is verified, remove the unused root `railway.toml` in a reviewed change and update deployment documentation. Retain it during this audit.

The legacy-file deprecation deadline is December 1, 2026, per Railway's migration guidance. Since production currently reads no legacy config files, the audit found no active production dependency on that deadline. IaC adoption remains useful for versioning the live settings.

## Evidence

- Railway CLI: `railway status --json`, `railway config migrate status`, `railway config pull --help`.
- Railway MCP: live service configuration reads for both production services, including staged state.
- Local sources: `railway.toml`, root `package.json`, `apps/web/package.json`, `src/server/app.ts`.
- Migration documentation: https://docs.railway.com/infrastructure-as-code#migrating-from-config-as-code

Follow-up verification: imported live settings with variables unmanaged, pinned Railway SDK 3.16.0 in an isolated `.railway/package.json`, and evaluated using Node 22.23.4. Both plan runs reported no changes; nothing was applied or deployed. The importer does not explicitly represent the existing MySQL volume attachment or image-update policy, so this validates adoption against the existing environment, not recreation of infrastructure from scratch. The legacy TOML remains in place. Infrastructure work can remain secondary to StarterGrid usability work.
