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
- `createDealership` still calls `upsertDefaultSyncPolicies` / `upsertDefaultPlatformAccounts` **after** the transaction that creates the dealership, owner invite, internal owner, activity and onboarding (now via `services/dealership/channelSetupService.ts`, `6268b1f`). If those defaults fail, the request still returns `201` with `channelSetup: NEEDS_ATTENTION` and the missing destinations; the failure is logged to Activity and blocks the CHANNELS onboarding step. `POST /api/admin/dealerships/{id}/channel-setup` retries idempotently. A repeated create returns `409` with `existingDealershipId` (staff with access only). `syncPolicyService` itself is unchanged.
- Only dealerships still setting up appear under "Needs action" for channel setup; live dealerships show the status and retry on their record only.
- **Schema:** `20261026030000_platform_account_dealer_enabled` adds `PlatformAccount.dealerEnabled` and `autoSyncReadyInventory` (backfill: marketplace + `desiredChannels`). `20261026040000_platform_site_availability` creates `PlatformSiteAvailability` and drops the extra `Lead.updatedAt` DEFAULT so it matches `@updatedAt`. Local databases created with `db push` may already have these objects — use `prisma migrate resolve` if deploy reports they exist.

## Removed UI

`components/dealers/WelcomeEmailModal.tsx` was deleted after nothing mounted it. Add Person (`components/people/AddPersonDialog.tsx`) replaces it, showing a copyable link and welcome message with honest delivery wording.

## Verification

- Backend: `node --test dist/src/tests/*.test.js` passes all 2,584 tests, including the new `dealershipAccessSafety.test.ts` (17).
- Web: `vitest run` passes 229 (3 skipped, a pre-existing dual-React issue), including `lib/dealershipManagement.test.ts` (12).
- End-to-end against a disposable `startergrid_v5_test_ux` database, dropped afterwards: 45 API checks and a 30-step Playwright walk-through. Both found real bugs that are now fixed: bodiless POSTs were rejected with 400, and invite links bounced signed-out users to sign-in.

## Real-API journey acceptance (2026-10-26)

`npm run e2e:journey -w auto-dealer-operator-ui` builds the backend, creates `startergrid_e2e_journey` from `prisma migrate deploy` only (local MySQL only; dropped afterwards unless `JOURNEY_KEEP_DB=1`), starts the real API and Vite, and drives one dealership with no intercepted responses: staff create it in the dialog → the owner accepts the invite link in the browser → the owner adds a priced vehicle with a photo and publishes it to Auto Marketplace (manual path, Autopilot off) → handoff stays blocked → a buyer posts a public marketplace inquiry → it shows in the owner's Leads → staff confirm the handoff. Mock VIN decoder; SMTP and Twilio disabled, so nothing is sent.

It asserts the evidence-backed handoff semantics that were uncommitted in the shared tree when it was written (`onboardingEvidence.ts`, `onboardingService.ts`): it fails on the earlier rules, where handoff was offered before a marketplace inquiry existed.

**Resolved review findings (integrated after `23201bc`):**
- Record reads no longer rewrite completion history. `upsertStep` keeps `completedAt`, `completedBy` and `evidenceJson` while a step stays COMPLETE; only a real status change clears or re-records them, and unchanged steps are not written. HANDOFF attribution comes from `DealershipProfile.handoffCompletedBy`. Covered by `onboardingStepHistory.test.ts` and the journey's real-database history check (both fail on the previous code).
- `PATCH /api/admin/dealerships/{id}/onboarding` rejects `stepKey`, `status` and `evidence` with 400 (documented as deprecated). Steps were already recomputed from evidence, but the hand-set path could demote a completed step and so re-stamp its history.
- `captureMarketplaceLead` now applies `PUBLISHED_LISTING_GATE`, matching the public detail page: drafts, opted-out and withdrawn vehicles return 404 and cannot notify the dealer.

The journey also checks, against the real API, that a dealer owner cannot open internal records, complete handoff, edit onboarding, retry channel setup, create dealerships, invite or issue logins for internal support, reset an internal account, or read/invite into another dealership — while still inviting their own staff.

These are automated correctness checks. They are not usability validation: no timed tasks, no first-time users, no observation of comprehension.
