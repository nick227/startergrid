# Content and help pass — 2026-10-26

## Delivered

- Added a consistent Help button to dealer and staff headers, sign-in, account setup, and dealership selection. Help opens over the current page without navigation or clearing form input.
- Added a suggested article for each main dealer workflow and staff setup work. Common questions now link to articles and remain searchable.
- Mounted the reader outside authenticated page branches, so staff and account setup screens can actually open it. Standalone help now works for staff and its Back button leaves help.
- Repaired internal Markdown article links. Added Escape dismissal, keyboard focus containment, focus restoration, and scroll reset between articles.
- Added help on getting started, destinations, invitations/sign-in, reports, dealership setup/handoff, and older inventory.
- Reworked import correction, automatic updates/pausing, listing readiness, sold/removal troubleshooting, and lead-status guidance. Corrected claims that a connected account guarantees automatic updates, a submitted update guarantees publication, or every sold listing is immediately removed.
- Reworded the Autopilot preview around planned listing updates, rather than guaranteed publication or unique vehicle counts. Removed the hardcoded safeguard percentage and universal immediate-removal promise.
- Added direct article links in spreadsheet imports and the Autopilot preview.

## Content placement

Keep the next action, validation feedback, and important action consequences inline. Use help for longer procedures, status definitions, exceptions, and troubleshooting. Keep technical provider references in Advanced. The editorial guide now records this distinction and asks writers to explain necessary terminology for new staff.

This pass covers the main daily workflows and help access. It does not claim a line-by-line review of every advanced, provider-specific, or legal reference article.

## Verification

- UI unit tests: 264 passed; 3 existing skipped tests. Includes published help-link integrity checks.
- Production UI build and TypeScript check passed. Vite still reports its bundle-size advisory.
- Chromium: 6 tests passed. Checks cover sign-in help preserving entered email, article-to-article navigation, keyboard dismissal/focus restoration, staff contextual help, standalone help navigation, and dealer Settings help. Existing invitation and staff-directory checks are included in the same suite.

Other agents were editing concurrently. No unrelated changes were reset, staged, or committed by this pass.

## Follow-up: remaining help gaps

- Returning from an article to All help now preserves the search query and results for the open help session.
- Searches with no results offer shorter search examples and a Clear search and browse help action. Advanced-only results no longer show a contradictory empty regular-article message.
- Dealership signup now has Help access, including on mobile screens.
- Search has an explicit accessible label; separate help catalogs use unique heading IDs.
- Verification: 269 UI tests passed (3 existing skips); all 7 Chromium checks passed, including mobile signup and preserved search.
- The follow-up full build stopped on TS6133 unused declarations in concurrently edited files: `hideWhenClean` in SyndicationSentryCard and `InventoryVelocityBanner`, `velocityLoading`, `setSelectedMilestone` in InventoryPage. Those unrelated in-progress edits were left intact. The earlier build result above predates these concurrent edits.
