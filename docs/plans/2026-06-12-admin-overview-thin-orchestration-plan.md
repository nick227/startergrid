# Admin Overview Thin Orchestration Migration Plan
_Date: 2026-06-12 | Scope: `apps/web/src/pages/AdminOverviewPage.tsx` | Goal: make the page a thin orchestration layer_

---

## Decision

This migration is worthwhile, as long as it is done in small vertical slices instead of as one large rewrite.

`AdminOverviewPage.tsx` is currently about 1,450 lines and owns seven tabs:

- System Status
- Finances / Insights
- Dealerships
- Platforms
- Blockers / Triage
- Audit Log
- Users

The page is not only selecting the active tab. It also owns tab-specific filter state, sorting state, derived collections, credential validation, admin user loading, create/update/delete user flows, dealership creation modals, access assignment modals, confirmation dialogs, and a set of local display helpers. That makes every new admin view or workflow harder to extend because unrelated tabs must share one stateful component body.

The refactor should proceed because it improves maintainability, testability, and feature velocity. The main caution is that the Users tab has the highest behavioral risk and should be extracted after shared utilities and simpler tabs are separated.

---

## Progress Log

- **2026-06-12**: Began Phase 1/2. Created `features/adminOverview`, moved shared local table/status/style utilities, extracted System Status, Blockers/Triage, Audit Log, and Finances/Insights tab modules, and verified with `npm run typecheck -w auto-dealer-operator-ui`.
- **2026-06-12**: Completed Phase 3. Extracted the Dealerships tab, including search/category filters, sorting, triage counts, and the add-dealership modal. Verified with `npm run typecheck -w auto-dealer-operator-ui`.
- **2026-06-12**: Completed Phase 4. Extracted the Platforms tab, including filters, sorting, credential validation, live validation overlay state, and platform table rendering. Verified with `npm run typecheck -w auto-dealer-operator-ui`.
- **2026-06-12**: Completed Phase 5/6. Extracted the Users tab and replaced `AdminOverviewPage.tsx` with a thin tab orchestration layer. Verified with `npm run typecheck -w auto-dealer-operator-ui`.

---

## Current Shape

`AdminApp.tsx` already owns the outer admin shell, route-to-tab mapping, top navigation, and top-level dashboard/dealer/user count loading. `AdminOverviewPage.tsx` receives that page-level data and then handles nearly everything inside the overview area.

Current responsibilities inside `AdminOverviewPage.tsx`:

- Cross-tab loading and error rendering for `fetchAdminDashboard`.
- Dealership list filtering, sorting, triage issue counting, add-dealership modal, and navigation links.
- Platform list filtering, sorting, maturity and credential status display, and live credential validation.
- System health, queue snapshot, and readiness checklist rendering.
- Audit log filtering and sort direction.
- Triage tab delegation to `DealerTriagePanel`.
- Insights tab delegation to `DealerDashboard` with inline admin navigation handlers.
- Users tab data loading, search, filtering, pagination, create user modal, generated password callout, suspend/reinstate/reset/delete actions, dealership access modal, and inline busy state.
- Local table helpers (`SortTh`, `ResultCount`) and repeated control class constants.
- Repeated status badge configuration maps and string formatting helpers.

The current code works, but its shape makes unrelated changes collide. For example, a Users change requires reading through platform credential validation and dealer sort logic, while a Platform change must coexist with account creation modal state.

---

## Target Shape

Keep `AdminOverviewPage.tsx` as the smallest possible composition layer:

```tsx
export default function AdminOverviewPage(props: Props) {
  if (props.loading && !props.data) return <AdminOverviewLoading />;
  if (props.error) return <ErrorState message={props.error} />;

  return (
    <AdminOverviewTabRouter
      activeTab={props.activeTab}
      data={props.data}
      dealersData={props.dealersData}
      dealersLoading={props.dealersLoading}
      dealersError={props.dealersError}
      onDealersChanged={props.onDealersChanged}
      onUsersChanged={props.onUsersChanged}
    />
  );
}
```

The page should orchestrate:

- Which tab is active.
- Which top-level data is available.
- Which callbacks are passed down.
- Shared loading and error shell behavior.

The page should not own:

- Per-tab filter state.
- Per-tab sorting state.
- Per-tab modal state.
- User mutation flows.
- Credential validation details.
- Table row rendering.
- Reusable display config maps.

---

## Proposed Folder Structure

Create a dedicated admin overview feature area:

```text
apps/web/src/features/adminOverview/
  AdminOverviewTabRouter.tsx
  types.ts
  index.ts

  components/
    AdminOverviewLoading.tsx
    AdminToolbarButton.tsx
    AdminStatusBadge.tsx
    ResultCount.tsx
    SortableHeaderCell.tsx
    index.ts

  constants/
    styles.ts
    statusConfig.ts
    platformConfig.ts

  utils/
    formatDuration.ts
    adminOverviewNav.ts
    dealerTriage.ts

  tabs/
    system/
      SystemStatusTab.tsx
      SystemHealthGrid.tsx
      PublishQueuePanel.tsx
      ReadinessChecklist.tsx
      index.ts

    dealerships/
      DealershipsTab.tsx
      DealershipsToolbar.tsx
      DealershipsTable.tsx
      AddDealershipModal.tsx
      useDealershipFilters.ts
      index.ts

    platforms/
      PlatformsTab.tsx
      PlatformsToolbar.tsx
      PlatformsTable.tsx
      usePlatformFilters.ts
      useCredentialValidation.ts
      index.ts

    triage/
      TriageTab.tsx
      index.ts

    audit/
      AuditLogTab.tsx
      AuditLogToolbar.tsx
      AuditLogTable.tsx
      useAuditFilters.ts
      index.ts

    insights/
      AdminInsightsTab.tsx
      index.ts

    users/
      UsersTab.tsx
      UsersToolbar.tsx
      UsersTable.tsx
      CreateUserModal.tsx
      DealershipAccessModal.tsx
      ConfirmUserActionDialog.tsx
      PasswordCallout.tsx
      useAdminUsers.ts
      useUserMutations.ts
      index.ts
```

This keeps admin overview behavior discoverable without overloading the generic `components/admin` folder. Existing `components/admin/DealerTriagePanel.tsx` can remain where it is for now and be wrapped by `tabs/triage/TriageTab.tsx`, or it can move later if we decide `features/adminOverview` should fully own the tab.

---

## Reuse and DRY Opportunities

Extract first:

- `SortTh` to `SortableHeaderCell`.
- `ResultCount` to a shared overview component.
- `INPUT_CLS`, `SELECT_CLS`, and `CLEAR_CLS` to `constants/styles.ts`, or replace them with existing shared UI controls if the app has suitable equivalents.
- Status config maps for health, readiness, validation, and maturity into `constants/statusConfig.ts`.
- `formatDuration` into `utils/formatDuration.ts`.
- Triage count and issue-weight logic into `utils/dealerTriage.ts`.
- Inline admin navigation object for the Insights tab into `utils/adminOverviewNav.ts`.

Then evaluate whether these should stay local to admin overview or graduate into broader app shared components:

- Sortable table header.
- Result count.
- Confirmation dialog.
- Status badge mapping.

Do not prematurely globalize these helpers. Keep them under `features/adminOverview` until at least two other feature areas need them.

---

## Migration Phases

### Phase 0: Guardrails

- Add this plan.
- Run the current typecheck/test command to capture the baseline.
- Note any existing failures before moving code.
- Avoid changing behavior, routes, copy, or visual styling during extraction.

Recommended baseline checks:

```bash
npm run typecheck
npm test -- --run
```

If those scripts do not exist or are too broad, use the repo's nearest web typecheck and focused tests.

### Phase 1: Shared Local Utilities

- Create `features/adminOverview/components`, `constants`, and `utils`.
- Move `SortTh`, `ResultCount`, status config maps, form control class constants, and `formatDuration`.
- Update `AdminOverviewPage.tsx` imports.
- Keep all tab JSX in the page during this phase.

Acceptance criteria:

- No visual or behavioral changes.
- `AdminOverviewPage.tsx` shrinks modestly.
- Helper names clarify intent without changing call sites heavily.

### Phase 2: Extract Low-Risk Render-Only Tabs

Extract tabs with little or no local mutation state:

- `SystemStatusTab`
- `AuditLogTab`
- `AdminInsightsTab`
- `TriageTab`

Audit has filter/sort state, but its state is self-contained and low risk.

Acceptance criteria:

- `AdminOverviewPage.tsx` no longer contains System, Audit, Insights, or Triage JSX.
- Audit search and sort behavior remain unchanged.
- Insights admin navigation still points to the same hashes.

### Phase 3: Extract Dealerships Tab

Move dealership-specific state and rendering into `tabs/dealerships`.

Own inside `DealershipsTab`:

- Search/category filter.
- Sort field and direction.
- Add dealership modal state.
- `DealershipIntakeFlow` wiring.
- Dealer triage issue display.

Keep passed in:

- `dealersData`
- `dealersLoading`
- `dealersError`
- `dealerAttention`
- `onDealersChanged`

Acceptance criteria:

- Add Dealership still closes, refreshes dealers, and navigates to `response.nextHref`.
- Dealer triage counts match current behavior.
- Existing admin dealer, platforms, and inventory links are unchanged.

### Phase 4: Extract Platforms Tab

Move platform filters, sorting, and live validation into `tabs/platforms`.

Own inside `PlatformsTab`:

- Platform search/category/capability/validation/maturity filters.
- Platform sort field and direction.
- Live credential validation state and metadata.
- `validatePlatformCredentials` and `fetchPlatformCredentials` coordination, ideally via `useCredentialValidation`.

Acceptance criteria:

- Filter behavior is unchanged.
- Credential validation still overlays live status by platform slug.
- Existing platform detail links are unchanged.

### Phase 5: Extract Users Tab Last

Move Users into `tabs/users` after the easier extractions prove the pattern.

Own inside `UsersTab`:

- User loading lifecycle.
- Search, role filter, and pagination.
- Create user modal.
- Password callout.
- Row busy states.
- Confirmation dialog.
- Dealership access modal.
- User mutation handlers.

Suggested hooks:

- `useAdminUsers` for loading, search, role filter, pagination, and refresh.
- `useUserMutations` for create, update, reset password, suspend, reinstate, delete, and local patching.

Acceptance criteria:

- Users tab still loads independently from dashboard data.
- Create user still displays generated password once.
- Suspend, reinstate, reset password, delete, and access assignment preserve current behavior.
- `onUsersChanged` still refreshes the admin tab count in `AdminApp.tsx`.
- Creating a dealership from access management still adds the new dealer to selected access and refreshes dealer data.

### Phase 6: Final Thin Page

Replace remaining tab conditionals with `AdminOverviewTabRouter`.

Final `AdminOverviewPage.tsx` should contain:

- Props type.
- Top-level loading/error checks.
- A single tab router render.

Acceptance criteria:

- Page is small enough to understand in one screen.
- Each tab can be opened and modified independently.
- Seven-tab structure is represented in one router file and one folder per tab.
- No new circular imports or deep cross-tab dependencies.

---

## Testing Strategy

Minimum checks after each phase:

- Typecheck.
- Existing route tests if touched.
- Manual smoke through all seven admin tabs.

Focused manual smoke checklist:

- System Status renders health, queue, and readiness sections.
- Finances renders admin `DealerDashboard`.
- Dealerships filters, sorts, opens add modal, and links to dealer routes.
- Platforms filters, sorts, links to platform detail, and runs Validate Credentials.
- Blockers renders `DealerTriagePanel`.
- Audit Log filters and toggles newest/oldest.
- Users searches, filters by role, paginates, creates users, copies password, manages access, suspends/reinstates, resets password, and deletes users.

Add component tests only where extraction creates a meaningful seam:

- `dealerTriage` utility sorting/weight tests.
- `formatDuration` utility tests.
- Users hook tests if the app already has a stable React/Vitest hook testing pattern.

---

## Risks

- **Users tab regression**: It combines API calls, pagination, local patching, modals, generated password handling, and dealership access. Extract last.
- **Over-abstraction**: Moving every small piece into generic shared UI would create churn. Keep admin overview helpers local first.
- **Route drift**: Inline hash links and admin navigation handlers must be preserved exactly during extraction.
- **Data ownership confusion**: `AdminApp.tsx` should continue owning top-level dashboard/dealer/user count data. Tab components should own only tab-specific interaction state.
- **Large PR review burden**: A one-shot extraction would be hard to review. Split by phase.

---

## Suggested PR Sequence

1. `admin-overview-plan-and-shared-helpers`
2. `admin-overview-system-audit-insights-tabs`
3. `admin-overview-dealerships-tab`
4. `admin-overview-platforms-tab`
5. `admin-overview-users-tab`
6. `admin-overview-router-cleanup`

Each PR should preserve behavior and reduce `AdminOverviewPage.tsx` line count. Avoid styling changes unless a moved component exposes an existing bug.

---

## Definition of Done

- `AdminOverviewPage.tsx` is a thin orchestration layer.
- Each of the seven tabs has a dedicated module.
- Shared helpers are local, named, and reused.
- Users and Platforms mutation flows behave as before.
- Admin tab counts in `AdminApp.tsx` still refresh after relevant changes.
- Typecheck passes or documented pre-existing failures remain unchanged.
- The folder structure makes the next admin tab or admin workflow obvious to place.

---

## Recommendation

Proceed with the migration, but keep it boring and incremental. The value is real because the current page mixes seven product surfaces and several mutation workflows in one component. The migration pays off if we stop after the page becomes a clear router plus tab modules; it becomes less worthwhile if we turn it into a broad design-system rewrite at the same time.
