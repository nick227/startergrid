# Collective V5 integration review — 2026-10-25

Scope: combined changes since cff3f88, through b9889ce plus the current working tree. Reviewed UI, onboarding/account APIs, distribution engine and their contracts. This is a source and targeted-test review, not production/provider certification. No implementation files were changed during this review.

Recommendation: do not roll out this combined version yet. The principal problems are authorization boundaries and disconnected contracts, not navigation.

## Findings, ordered by severity

### 1. P0 — Dealership owners can reset arbitrary existing accounts

src/server/routes/dealershipPeople.ts:83 authorizes temporary-login with send_invite, which DEALER_OWNER has. src/services/dealership/peopleAccessService.ts:81 looks up the requested email globally, resets its password, reactivates it and returns the new credential without checking target membership or role. The existing global role is preserved. An owner can therefore target an administrator or internal account and take it over after the password-change API. This is a code-path finding; no actual account takeover was attempted.

Fix: separate account creation from global credential recovery; enforce actor/target role hierarchy and scope before any mutation. Dealer-facing actors must never reset internal/admin accounts or accounts outside their authorized identity-management scope. Review patchPerson too: a rooftop membership currently permits global suspension/password reset, potentially affecting every rooftop.

Owner: account/backend. Acceptance: authenticated dealer-owner tests targeting unrelated users, assigned internal support and SUPER_ADMIN must all fail without writes or credential disclosure.

### 2. P1 — Dealers can provision internal-support identities

src/server/requestValidation.ts:310 accepts INTERNAL_SUPPORT for invites and temporary logins. The corresponding routes require only send_invite. createInvitation's check only requires an actor ID; accountRoleForAccess then creates a global INTERNAL_SUPPORT identity. This independently exposes internal-only permissions, including dealership creation and safety-hold approval.

Fix: validate assignable roles against the authenticated actor in the service layer, including invitations, temporary logins and access patches. Do not rely on hiding an option.

Owner: account/backend.

### 3. P1 — Central dealership record crashes against its real API

src/services/dealership/dealershipRecordService.ts:126 returns channels as an object, people as a nested response and onboarding as an object. apps/web/src/lib/api/dealershipRecordApi.ts declares channels/people arrays and onboardingSteps at the top level, casting JSON without adaptation. DealershipRecordView.tsx:887 calls record.channels?.map and line 749 calls record.people?.map; these objects are non-null and have no map method. Setup also has no onboardingSteps to render. Inventory totals and ownership summaries disagree with the backend.

Fix: choose one wire contract, generate or share DTOs, and adapt explicitly where needed. Test the actual backend JSON through all six record tabs.

Owner: UI + backend.

### 4. P1 — Autopilot controls do not control the distribution engine

DealerHomeDashboard.tsx:40 and SimplifiedChannelsView.tsx:50 initialize local booleans to true; pause/resume only changes React state. The admin record at DealershipRecordView.tsx:104 updates autopilotPreference, which cannot create a distribution policy or qualify destinations. The Channels view labels connected/ready/scheduled accounts as live and promises automatic distribution across all connected channels. No V5 policy, capability or evidence API is consumed there.

Consequence: a disabled deployment looks active; refreshing reverses a dealer's pause; unsupported providers appear automatic; an admin's Activate action can do no publishing.

Fix: use the persistent policy and distribution APIs, expectedVersion, qualification and evidence states. Distinguish preference from activation and surface feature-disabled responses. Test state across refresh, dealer switch and failure responses.

Owner: UI + distribution integration.

### 5. P1 — Invite acceptance and forced password change have no UI route

invitationService.ts:23 creates #/invite/:token links. App.tsx has no invite acceptance page; unauthenticated visitors see ordinary login. App.tsx also has no mustChangePassword flow, while security.ts:235 blocks normal APIs for temporary-password users. Backend endpoints exist, but newly invited users cannot complete the intended browser onboarding flow and temporary-login users reach a blocked application.

Fix: public invite preview/accept page plus authenticated mandatory password-change screen before ordinary routes, including expired/revoked/existing-account cases.

Owner: UI + authentication.

### 6. P1 — Temporary-password response mismatch loses the one-time credential

peopleAccessService.ts:135 returns accountId/email/accessRole/temporaryPassword directly, and the route sends that directly. DealershipRecordView.tsx:149 instead reads res.person.email before showing the password. A successful server creation/reset therefore throws in the client and never displays the one-time credential.

Fix: align the response and consumer; test a real response through the reveal flow. Do not retry a credential-changing request automatically after a rendering error.

Owner: UI + backend.

### 7. P1 — Internal new hires cannot reach the internal workspace

App.tsx:67 explicitly redirects every role except SUPER_ADMIN away from /admin, and superAdminHome only renders AdminApp for SUPER_ADMIN. The backend deliberately permits scoped INTERNAL_SUPPORT/legacy OPERATOR on the new dealership/onboarding APIs. Thus the users this redesign is meant to support cannot access those screens.

Fix: expose the scoped internal workspace to internal roles, while keeping site-wide administration/integrations restricted. Audit AdminApp's legacy SUPER_ADMIN-only data requests too.

Owner: UI + access integration.

### 8. P1 — Invitation delivery is reported without sending; resend discards the replacement link

invitationService.ts:61 stores SENT without a mail-delivery operation. SettingsPage.tsx:48 says the invite was sent. Both SettingsPage's resend handler and DealershipRecordView.tsx:160 ignore the returned replacement setupUrl, while resend revokes the old token. With no actual delivery, the user has neither a working old link nor the new one.

Fix: explicitly model link-created/manual-delivery versus sent, or add confirmed delivery. Reveal/copy the new link after every rotation and test old-link invalidation.

Owner: onboarding + UI.

### 9. P1 — New role restrictions do not cover legacy connection mutation routes

platformConnect.ts:81 and :169 use requireDealerAccess alone. DEALER_STAFF has rooftop access but explicitly lacks connect_channels in the new capability map, so the legacy connection endpoints bypass the policy enforced on V5 reconnect. Capability tests exercise the matrix, not every existing write route.

Fix: audit existing mutation routes against the new capabilities and apply consistent authorization server-side.

Owner: backend + integration.

### 10. P1 — Distribution source safeguards are not atomic with inventory writes

autopilot/inventoryGuard.ts reads the source and baseline separately from writes in importService/inventoryUpdateService and lifecycle paths. Two overlapping removal batches can each remain below the threshold and jointly delist a large share; inventory writers can change between a guard check and mutation. Policy-row serialization protects distribution workers, not all ingestion writes.

Fix: perform source guard decision and mutation under a shared transactional scope/fence, with batch-wide authorization and tests for concurrent imports/removals. Until then, do not certify these safeguards for concurrent source writers.

Owner: distribution (this agent's implementation) + ingestion.

## Additional integration gaps

- AdminWorkTab fabricates an all-clear routine item when its legacy issue list is empty; it does not consult V5 incidents. Holds can therefore exist while Work claims normal operation.
- Record list returns internalOwnerId rather than the internalOwner email object used by My Work; unassigned detection and ownership display are unreliable.
- Onboarding step DTO uses stepKey/incompleteReason on the server and key/label/blockingReason in the UI.
- Real provider publishing remains unverified; local adapter existence and passing tests cannot establish production readiness.
- Shared working tree includes distribution changes captured inside another agent's UI commit. Review by final file/function ownership, not commit author/title alone.

## Verification

Fresh checks during this review:
- Backend TypeScript: passed.
- Operator UI TypeScript: passed.
- Operator UI suite: 211 passed, 3 skipped.
- Targeted backend suites (permissions, invitations/access, creation/onboarding, dealership list, Autopilot decisions, route contract): 41 passed.

Passing tests do not contradict these findings: handwritten client casts conceal response mismatches, and current tests do not exercise full browser onboarding, cross-role credential operations or UI-to-engine policy persistence. No real user records, production database or provider accounts were changed.

## Recommended integration sequence

1. Close credential takeover and internal-role escalation; add negative authenticated route tests.
2. Establish one shared/generated API contract and repair record/people/onboarding consumers.
3. Complete invite acceptance, password change, temporary credential reveal and scoped staff workspace.
4. Wire Autopilot and incident UI to persisted qualified/evidence-backed APIs.
5. Make ingestion guards atomic and run concurrent lifecycle tests.
6. Run browser acceptance tests with real API responses for a new internal hire and a dealership owner, then review deployment/provider qualification separately.
