# Dealership management consolidation — handoff (2026-10-26)

Implements the approved consolidation (A–F) and the P0 access fixes. This note is for the agents who own adjacent areas: **Cursor** (backend contracts / OpenAPI / generated client) and **Codex** (distribution / Autopilot state).

## Contract changes (Cursor)

All are in `openapi/openapi.yaml`, `routeClassifications` and `routeContract.test.ts`; the client was regenerated.

| Change | Route / schema |
|---|---|
| New | `DELETE /api/dealers/{dealershipId}/people/{accountId}` removes dealership access only (the login is kept). Requires `manage_dealer_users`. Returns 409 when it would leave no active owner, or when the person is the internal owner. |
| New | `GET /api/dealers/{dealershipId}/activity?limit&before` returns `DealershipActivityResponse`: recorded events only, newest first. Requires `view_access`. |
| New field | `InviteCreated.delivery` / `InvitePersonResponse.delivery`: `EMAIL_SENT \| EMAIL_FAILED \| LINK_ONLY`. `deliveryStatus` is `SENT` only after SMTP accepts the message; otherwise `PENDING`. |
| New fields | `DealershipRecordSummary.internalOwner`, `lastActivityAt`, `blockedStepCount`. `DealershipPerson.isInternal`. `DealershipInvitation.createdAt`, `deliveryError`. `InvitePreview.accountExists`. |
| Behaviour | `GET /people` lists **open** invitations only (accepted ones appear as people, revoked ones in Activity). |
| New schema | `POST /api/admin/dealerships` takes `CreateDealershipRecordRequest`: address and contact name are optional. Public signup keeps `CreateDealershipRequest`. `nextHref` is now `#/admin/dealers/:id` (it used to point at a route that did not exist). |
| New query | `GET /api/admin/dealerships?mine=true` (internal owner = caller). |
| Authorization | `POST /api/dealers` now requires internal staff (dealer accounts could create dealerships and owner logins). |
| Authorization | Admin-created users and admin password resets set `mustChangePassword`. |
| Documented | `POST /api/dealers/{dealershipId}/people/invites/prepare` — preview-only invite copy (`InviteEmailPreview`). Requires `send_invite`. Does not create an invitation. |
| Documented | `POST /api/dealers/{dealershipId}/autopilot/preview` — read-only `AutopilotSimulationResult`. Optional `{ mode?, includedChannels? }`. Requires dealer access; does not require `V5_AUTOPILOT_ENABLED`. |
| Schema | `V5DistributionOutcome.evidence` is a nullable `$ref` with `type: object` so `redocly lint` accepts it. |

## Distribution boundary (Codex)

- No distribution, Autopilot policy or publishing code was changed. `DealershipAutopilot` is reused as-is on the dealership Overview.
- `createDealership` still calls `upsertDefaultSyncPolicies` / `upsertDefaultPlatformAccounts` **after** the transaction that creates the dealership, owner invite, internal owner, activity and onboarding. If those defaults fail, the dealership exists but the request returns 500.
- **Schema:** `20261026030000_platform_account_dealer_enabled` adds `PlatformAccount.dealerEnabled` and `autoSyncReadyInventory` (backfill: marketplace + `desiredChannels`). `20261026040000_platform_site_availability` creates `PlatformSiteAvailability` and drops the extra `Lead.updatedAt` DEFAULT so it matches `@updatedAt`. Local databases created with `db push` may already have these objects — use `prisma migrate resolve` if deploy reports they exist.

## Orphaned UI

`components/dealers/WelcomeEmailModal.tsx` is no longer mounted. Add Person (`components/people/AddPersonDialog.tsx`) replaces it, showing a copyable link and welcome message with honest delivery wording. The modal was being edited concurrently, so it was left in place for its owner to fold in or delete.

## Verification

- Backend: `node --test dist/src/tests/*.test.js` passes all 2,584 tests, including the new `dealershipAccessSafety.test.ts` (17).
- Web: `vitest run` passes 229 (3 skipped, a pre-existing dual-React issue), including `lib/dealershipManagement.test.ts` (12).
- End-to-end against a disposable `startergrid_v5_test_ux` database, dropped afterwards: 45 API checks and a 30-step Playwright walk-through. Both found real bugs that are now fixed: bodiless POSTs were rejected with 400, and invite links bounced signed-out users to sign-in.
