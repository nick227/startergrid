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

## Wrap-up check, 2026-10-26 21:05 (shared tree, uncommitted frontend pass in progress)

Historical findings; the TypeScript, CSV selector and invitation-copy blockers below are resolved in the [validated redesign wrap-up](../redesign/wrap-up-2026-10-26.md). Scratch helpers are locally excluded. Parallel feature work continues separately.

Not committed by Claude — the owning agent was still editing (help docs, inventory, platform drawer). Before committing that pass:
- `apps/web` TypeScript fails: `PlatformDetailDrawer.tsx` imports `DestinationPrimarySetup`, `PagePrimaryState`, `destinationExperience` without using them.
- `npm run verify:redesign` fails at `scripts/redesign/csv-import.mjs:87` — no button named exactly `Import 0 vehicles` (label comes from `ImportModal.tsx:104`). Update the script or the label together. The real-API journey (`npm run e2e:journey -w auto-dealer-operator-ui`) passed on the same tree.
- Claude's only edit in that pass: `SimplifiedChannelsView.tsx` `sortedConnected` no longer wraps a never-hitting `useMemo` (React Compiler lint error). Lint errors elsewhere in the touched files pre-date the pass.
- `scratch/*.mjs` are local dev-database helpers with a hard-coded password; keep them out of git.
- Copy check: `lib/helpTasks.ts` says "StarterGrid does not email the link automatically"; invitations are emailed when SMTP is configured (`delivery: EMAIL_SENT`).

## CRM delivery, integration check and CI, 2026-10-27 (Claude)

**CRM send is real now.** `POST /leads/:leadId/delivery/retry` (`manage_leads`) emails the ADF/XML through the existing `emailTransport` to the address on the dealership's ADF/XML Lead Routing destination (`PlatformAccount.accountId`). There's no fallback to `primaryContactEmail`, no placeholder address, and the request can't choose the address or pass `markDelivered`. Each attempt is persisted as `PENDING` first. It becomes `SENT` (with `deliveredAt`) only after the transport accepts it, otherwise `FAILED` with the error, and failed sends can be retried. A send is refused (409, no attempt recorded) when there's no CRM email or `realEmailDeliveryEnabled()` is false (production + `SMTP_ENABLED=true`, the same gate invitations use). Statuses: `NOT_SENT | SENDING | SENT_TO_CRM_ADDRESS | FAILED`. There's no "imported" status: StarterGrid can't see CRM import. Planner rows from `planAndPersistMarketplaceLeadDeliveries` (`attemptCount 0`, never dispatched) are not shown as sends. `smtpSend` now throws when the server rejects the recipient.

**Window sticker (`2934710`).** Removed the invented "Installed Features" list, the spec defaults (FWD/Automatic/Sedan/Gasoline), the `(555) 000-0000` phone, and the QR block. The QR pointed at `/storefront/{dealer}/vehicles/{stock}`, which no SPA routes (it falls through to the splash page), generated its image through `api.qrserver.com`, and promised a 360° VDP, CARFAX and offers. To bring it back, link the public marketplace listing (`/marketplace/#/automotive/listing/{id}`) and generate the QR locally.

**Open, for the owning agent. Not changed by Claude:**
- `SyndicationSentryCard.tsx` (uncommitted at 01:58) replaces the server's take-down `message` with "Submitted removal to connected channels. External sites may take 24–48 hours to update." The engine does not submit external removals; the server message lists what is left and who must act (`c12e474`). Please keep `result.message` / `remaining[].nextAction`. "Sold vehicles are not advertised" also overclaims: the audit reads StarterGrid records only.
- `UsersTab.tsx` (`75ff0b0`) filters staff client-side from a server page of all accounts, so pages can be short or empty and "N staff" counts only the current page. Filter by role on the server.
- `InventoryPage.tsx` counts aging-price suggestions in "Needs a fix", so vehicles that can be listed appear as needing a fix.
- `PlatformDetailPage.tsx:180` and `ConnectionSetupPanel.tsx:104` call `useAuth()` after early returns. It's context-only, so it causes a dev hook-order warning, not a crash. Move it above the returns.
- Web lint has 35 errors, all present before `2934710`. So CI does not gate lint yet.
- `src/tests/adminRemediation.test.ts` and `mediaUpload.test.ts` use a default `PrismaClient`, so `npm test` writes test rows to whatever `.env` `DATABASE_URL` points at (usually the dev database). CI gives them a migrated MySQL service. Locally, consider pointing them at a disposable schema.

## Final integration pass, 2026-10-27 04:00 (Claude, backend/contracts/CI)

**Sold-vehicle take-down contract (`0726bf0`).** Backend defect fixed: the audit used to drop withdrawals at NEEDS_SETUP, FAILED, PROCESSING or SUBMITTED, so they counted as "taken down and confirmed" and could make a run `RECONCILED`. No external marketplace is qualified for automatic removal today, so every external withdrawal stops at `NEEDS_SETUP / CHANNEL_UNQUALIFIED`. StarterGrid sends nothing to those sites. Every listing now has `removalStatus`, the reconcile response has `removalCounts` and `notPublishedCount`, and `RECONCILED` requires VERIFIED_REMOVED evidence for every published listing.

| removalStatus | Means | Truthful display |
|---|---|---|
| NOT_REQUESTED | no take-down started | "Not requested" |
| QUEUED_LOCALLY | recorded in StarterGrid, nothing sent | "Queued in StarterGrid, not sent yet" |
| SUBMISSION_ATTEMPTED | sent, no destination response | "Sent, no response yet" |
| PROVIDER_ACCEPTED | destination acknowledged it (reference) | "Accepted by {site}, removal not confirmed" |
| VERIFIED_REMOVED | readback confirmed it is gone | "Removed (verified)" |
| FAILED | failed or not confirmable | "Removal failed. {nextAction}" |
| UNSUPPORTED | StarterGrid cannot remove it there | "End it on {site} yourself. {nextAction}" |

**For Antigravity (`SyndicationSentryCard.tsx`, `f480591`). Not edited by Claude:**
- Each row shows a hard-coded "Removal pending" badge. Show `ghost.removalStatus` instead. UNSUPPORTED (every external site today) is not pending: nothing happens until a person acts.
- The NEEDS_ACTION banner says "Local operation recorded … manual action on the destination portal" for every outcome. Build it from `result.removalCounts` (or show `result.message`, which the backend writes from those counts). An UNSUPPORTED listing has no local operation, and a queued or submitted removal needs no manual action.
- "All advertised vehicles match your active lot inventory" (CLEAN, or RECONCILED with zero removals) overclaims. The audit reads StarterGrid records only. Use "No StarterGrid record shows a sold vehicle as still listed", and on RECONCILED mention `notPublishedCount` when it is above 0.
- `commercialFeatures.test.tsx` fixtures use backend messages the server never sends ("Took down 2 listings and confirmed removal.", "Removal requested on CarGurus…"), and they lack `removalStatus` / `removalCounts`. Use the real response shape.

**For Antigravity (`LeadCrmHandoffModal.tsx:111`):** `isSending` requires `data.canSend`, but the server always returns `canSend: false` with `sendBlocker: 'SEND_IN_PROGRESS'` while a send is in flight. The modal then falls through to "Ready to send". Use `data.deliveryStatus === 'SENDING'` on its own.

**Velocity (`90a08fe`):** suggestion reasons no longer claim search-ranking, "Price Drop" badge or floor-plan effects. `daysOnLot` counts from `Vehicle.createdAt` (when the vehicle was added to StarterGrid). For imported stock that is not the arrival date, so UI labels saying "days on lot" overstate precision. The "Aging" filter uses `performance.daysOnline`, but its count uses velocity milestones, so the count and the filtered list can disagree.

**Test isolation (`0f09ce8`):** database suites run only with `V5_TEST_DATABASE_URL=…/startergrid_v5_test_*`. They skip otherwise, and CI fails instead of skipping (`REQUIRE_DATABASE_TESTS`). `mediaUpload.test.ts` was `assert.ok(true)` placeholders; they are todos now and are not real coverage.

## Needs Attention list: backend ready for UI, 2026-10-27 (Claude → Antigravity)

`GET /api/dealers/:dealershipId/attention` (`c56f81c`). Typed client: `apps/web/src/lib/api/attentionApi.ts` (`fetchAttention`). Schema: `AttentionResponse` in `openapi.yaml`. Read access is the same as other dealer pages.

Each item has `summary`, `nextAction`, `owner` (DEALERSHIP | INTERNAL_SUPPORT | PARTNER | SYSTEM, plus `ownerId` when an incident names a person), `severity` (BLOCKING | WARNING | WAITING), `count`, up to 50 `records` (id, label, detail, vehicleId, channel), and `action { kind, enabled, disabledReason, channel }`. Items arrive sorted: blocking first, then dealership-owned. `key` is stable per problem and owner.

Suggested action routing (UI decision):

| action.kind | Go to |
|---|---|
| FIX_VEHICLES | Vehicles, filtered to `records[].vehicleId` (Needs a fix) |
| ADD_PHOTOS | Vehicles, filtered to those vehicles |
| REVIEW_REMOVALS | Sold-vehicle take-down card (Home/Channels) |
| END_EXTERNAL_LISTING | The take-down card; `action.channel` names the site when there is one |
| COMPLETE_CHANNEL_SETUP | Channels → `action.channel` setup, or Channels when null |
| RETRY_CRM_DELIVERY | Leads, filtered to `records[].id`; the CRM modal sends |
| CONTACT_SUPPORT | Support contact; show "StarterGrid support is handling this" for dealer roles |
| NONE | No button; show who it is waiting on (`owner`) |

Rules the UI must keep:
- When `action.enabled` is false, show `disabledReason` and don't render a working button. CRM retry is disabled when no CRM email is set or email sending is off.
- When `unavailableAreas` is not empty, the list is incomplete. Never show "nothing needs attention" in that case.
- WAITING items are someone else's work; show them collapsed or secondary, not as dealer tasks.
- The summaries are plain backend text and safe to show; replace them freely with UI copy.

## Bulk vehicle correction: backend ready for UI, 2026-10-27 (Claude → Antigravity)

Endpoints from `9c2e5ab`. Typed client: `apps/web/src/lib/api/bulkEditApi.ts`. All three require `edit_inventory` for the dealership.

1. `previewBulkEdit(dealerId, edits)` writes nothing. Each edit is `{ vehicleId, fields }`: use the same fields for a common edit across selected vehicles, or different fields per row for spreadsheet corrections. Rows return `WILL_CHANGE` with `changes[{field, from, to}]`, `NO_CHANGE`, or `REJECTED` (with a reason such as sold, removed or not found), plus `updatedAt`.
2. `applyBulkEdit(dealerId, edits)`: send each row's preview `updatedAt` as `expectedUpdatedAt`. Every vehicle commits on its own. Rows come back `APPLIED`, `NO_CHANGE`, `REJECTED`, `CONFLICT` (changed after the preview; preview again), `HELD` (an Autopilot price safeguard opened `incidentId`; support reviews it) or `FAILED`. Show every row; don't collapse them into one total.
3. `undoBulkEdit(dealerId, batchId)` is available when `undoAvailable`. It restores only vehicles nobody changed since; others return `SKIPPED` with a reason. It runs once (409 after that). Show the `note`: restored values reach channels on their next update, and StarterGrid cannot recall what a channel already showed.

Editable fields: priceCents, mileage, condition, exteriorColor, trim, interiorColor, bodyStyle, drivetrain, fuelType, transmission (nullable ones accept null to clear). There is no description field on vehicles yet. Up to 500 edits per request, one per vehicle. The old `PATCH /inventory/bulk` endpoint is unchanged.

## Guided channel setup: backend ready for UI, 2026-10-27 (Claude → Antigravity)

`GET /api/dealers/:id/channels/setup` (plans for enabled channels) and `GET /api/dealers/:id/channels/:channel/setup` (one channel). Typed client: `apps/web/src/lib/api/channelSetupApi.ts`.

The backend now writes the dealer instructions: short brand names ("CarGurus", not "CarGurus Dealer Marketplace"), at most 4 steps, one sentence each, no SFTP/API/token jargon (a test enforces this for all 73 channels). The regex rewriting in `partnerSetupPresentation.ts` is no longer needed for these screens.

Rendering rules for a foolproof screen:
1. Show `plan.headline` first. It already says what to do, or "Nothing for you to do right now".
2. Show the steps as a checklist. Only the step whose `id === plan.currentStepId` gets a button; every other step is text with a check, a clock (WAITING) or a warning (BLOCKED).
3. Owner chip: DEALERSHIP = "You", INTERNAL_SUPPORT = "StarterGrid", PARTNER = `plan.name`.
4. Map `action.kind` to the button: CONNECT_ACCOUNT → the existing connect-url sign-in; ENTER_DETAILS → inline inputs from `action.fields` (validate `pattern`, show `validationHint`), saved through `PATCH /accounts/:channel` using `saveAs`; OPEN_PROVIDER_SITE → open `action.url` in a new tab; CONTACT_SUPPORT → support contact.
5. If `action.markDone` is set, show it as a secondary button ("I asked them", "I signed up", "I have an account") that sends `markDone.patch` to `PATCH /accounts/:channel`, then refetch the plan.
6. If `viewerCanAct` is false, replace "You" buttons with "Your dealership owner finishes this step".
7. Show `postingNote` when present (manual-posting channels). Show `providerEstimate` as "{name} says this usually takes {providerEstimate}".
8. READY means set up. Never say "live" or "listing" from this endpoint; publication evidence comes from distribution status.
