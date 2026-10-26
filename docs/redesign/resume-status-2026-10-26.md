# Redesign recovery status — October 26, 2026

Source review on `main` at `a9be0a5`. This is a recovery audit, not a new runtime or production verification.

## Where the previous session stopped

The original plans in this directory were followed by V5 implementation and integration repairs. Read `docs/v5/dealership-management-consolidation.md`, the **Repair status** section of `docs/v5/collective-review-2026-10-25.md`, and `docs/v5/distribution-operations.md` before treating the original plans or review findings as outstanding work.

Latest work, October 26 (America/Chicago):

- `6268b1f`, 04:15: recoverable default channel provisioning with an idempotent retry action.
- `8f06868`, 04:21: actionable primary states for the daily dealership screens.
- `a9be0a5`, 04:32: persisted setup recovery, distribution safeguards/control integration, first-login browser tests, and validation notes.

At recovery, the only uncommitted change was an update to `docs/v5/dealership-management-consolidation.md` explaining the already-implemented channel setup recovery. Preserve it. There were no uncommitted application changes and no `.claude/handoffs` documents.

## Confirmed remaining work

### 1. Evidence-backed launch and handoff — first implementation priority

`src/services/dealership/onboardingService.ts` still uses:

- Any vehicle count **or waiting for stock** for `vehiclesReady`.
- Default channel rows plus a non-OFF onboarding preference (or prior launch timestamp) for `channelsReady`.
- `completeHandoff` writes both `handoffCompletedAt` and `launchCompletedAt`, and sets `ACTIVE`, without checking verified listing outcomes or a verified lead/contact route.

This falls short of `site-admin-plan.md`: launch and handoff are separate milestones; waiting-for-stock dealerships remain Setting up; launch requires actual evidence and handoff includes verified contact/lead routing. The distribution engine already distinguishes preferences from qualified policy and verified outcomes, but onboarding has not fully adopted that distinction.

Next: add regression coverage for waiting-for-stock, preference-only setup, missing publication evidence, and missing lead-route evidence; then implement the milestone/evidence contract consistently across service, API types and record UI. Preserve the legitimate manual-distribution path rather than requiring Autopilot ON for every launch.

### 2. Acceptance coverage is narrower than the original usability gates

`apps/web/e2e/v5-contracts.spec.ts` has three browser workflows: invitation acceptance, mandatory password replacement, and scoped internal-support access. They intercept API responses. They do not establish the complete real-API create/import/publish/verify/handoff journey or the timed new-hire/dealer usability targets in the plans.

The consolidation handoff reports a prior disposable-database API/browser walkthrough; its reported results should not be confused with a reproducible full-journey test in this suite. Historical test totals were not rerun during this recovery audit.

### 3. External Autopilot expansion remains unfinished

`src/services/autopilot/capabilities.ts` qualifies the owned marketplace path; external providers remain configured/unverified, manual/partner-assisted, or unavailable. The provider examples in the original redesign diagrams are proposed outcomes, not shipped certification. Provider-account verification, large-rooftop load testing, and production rollout remain separate work documented in `docs/v5/distribution-operations.md`.

### 4. Small cleanup and plan-to-implementation gaps

- `apps/web/src/components/dealers/WelcomeEmailModal.tsx` has no consumers in `apps/web/src`; Add Person superseded it. The previous handoff explicitly left it for reconciliation/deletion.
- CSV import supports file selection/paste, mapping, preview and commit. The planned drag-and-drop input and inline correction of invalid preview rows are not implemented in `ImportStepUpload.tsx` / `ImportStepPreview.tsx`; the latter directs users back to mapping or source-data corrections.
- Historical failure sources are not all migrated into the unified incident experience, per the distribution operations notes.

## Resume order

1. Repair and verify onboarding launch/handoff evidence semantics.
2. Add a reproducible full-journey acceptance test against a disposable real API/database.
3. Reconcile the unused welcome modal and remaining import interaction gaps.
4. Continue provider qualification and rollout work within its separate account/environment scope.

Do not restart the redesign or reimplement repaired authorization, invitation, navigation, or persisted Autopilot controls based on the older review text.

## Continuation: onboarding evidence repair

Implemented the first continuation slice in the shared working tree:

- Server-owned public marketplace eligibility replaces preference-only channel completion; manual publication remains valid with Autopilot OFF.
- Waiting-for-stock cannot launch or complete handoff. Launch observation and handoff use separate timestamps.
- Handoff requires an eligible owner's completed first login and an actual marketplace-form inquiry in the dealership's shared inbox. This verifies the inbox route only, not external notification delivery.
- Handoff is transactional and idempotent; stale completion metadata is cleared when checks fail. Record/onboarding reads refresh the checks.
- UI guidance exposes missing publication/inbox evidence and opens Leads when appropriate; handoff no longer claims to make the dealership live.

No schema migration or external-provider activation is part of this change. Other agents are editing the shared tree concurrently; unrelated UI and channel-provisioning changes are theirs and must be preserved.

Validation: backend build and operator TypeScript checks passed; full backend suite passed 2,604 tests; full operator suite passed 247 tests with 3 existing skips. Four additional tests passed against a freshly migrated disposable local MySQL schema, including public eligibility exclusions, cross-dealership/manual-lead rejection, concurrent idempotent handoff, and waiting-for-stock rejection. That schema was dropped afterwards. No notification or provider call was made by these tests.

Concurrent commits observed during the continuation: `fbfb927` removed the unused welcome modal; `13de9c4` improved channel-setup error reporting; `e81a110` updated primary UI actions and also captured shared handoff UI edits. Inspect final files, not commit titles alone. Backend evidence changes and the dedicated new tests remain reviewable separately in the working tree at this checkpoint.
