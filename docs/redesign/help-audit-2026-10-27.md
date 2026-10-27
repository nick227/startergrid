# Help content and access audit — 2026-10-27

## Assessment

Reviewed all 39 published operator help articles (30 regular, 9 advanced), the editorial guide, catalog/search/reader implementation, and related UI controls. The daily-workflow help is concise and broadly usable. All articles have search metadata, all internal article links resolve, and main dealer screens have contextual Help access. This review covers the operator application at `/app/`, not a consumer marketplace help system.

The main weaknesses were factual consistency with the current interface and a keyboard-focus issue, rather than missing help infrastructure. Corrections below are implemented locally; nothing was deployed.

## Corrections made

- Bulk edit: replaced “change one field and save” with the actual multi-field **Apply** workflow. Explained that a price sets the same absolute price on selected vehicles, not a discount, and that blank fields remain unchanged. Added article access beside bulk-edit controls.
- Stock numbers: removed the implication that marking an old unit sold frees its stock number. Import code matches existing records by dealership and stock number, including old inventory; users should not reuse a number for a different vehicle.
- Notifications: documented the nested **Settings → How you hear about new inquiries → Optional delivery methods** path. Removed the obsolete Leads settings path and replaced “Communications” with **Delivery log**. Distinguished SMS summaries from richer alerts and delivery attempts from guaranteed receipt.
- Leads: added CRM handoff guidance and distinguished mail-server acceptance from CRM import or buyer follow-up.
- Connections/readiness: removed contradictory claims that Connected guarantees sending, password changes always invalidate integrations, or an inventory change proves external listings are hidden.
- Send status: corrected the contradictory Idle/Working wording and aligned the failure label with the status component.
- Readability: replaced “rooftop” with “dealership” in dealership-context and connection-state guidance and explained DMS/CRM on first use in the affected articles.
- Accessibility: information buttons now announce that they open a dialog. Closing Help restores focus to a replacement header button if a lazy route replaced the original button while help was open. This was reproduced on Reports and verified after the fix.

## UI-to-help coverage

| UI/workflow | Help entry point | Related article | Evidence |
| --- | --- | --- | --- |
| Home | Header Help | Getting started | Browser verified, including page-data failures |
| Vehicles | Header Help; readiness information button | Inventory readiness; warnings vs blocked | Header browser verified; control references checked |
| Spreadsheet import | Article link inside import dialog | CSV import | Browser verified above the modal; pasted rows and focus preserved |
| Bulk edit | Information button in selection bar | Bulk edit | Added; reference integrity and typecheck verified |
| Channels | Header Help | Connect a destination | Browser verified, including page-data failures |
| Autopilot preview | Article link inside preview | Automatic updates and pausing | Source/stacking review; reference integrity verified |
| Leads | Header Help; status information button | Lead statuses and CRM handoff | Header browser verified; status control reference checked |
| Settings | Header Help | Invitations and sign-in | Browser verified |
| Notification methods | Information buttons on panel and methods | Notifications, email, Discord, Telegram, SMS, webhook, auto-response | All references resolve; instructions compared with panel source |
| Reports | Header Help | Reports | Browser verified; focus-restoration fix verified |
| Staff dealership workspace | Header Help | Setup and handoff | Browser verified |
| Sign-in | Help below form | Team access | Browser verified: input, article links, search, Escape, focus containment/restoration |
| Signup | Help | Getting started | Mobile browser verified: empty-search recovery and return to signup |
| Account setup / dealership picker | Help | Team access | Source and article-reference review |
| Standalone help | Catalog/search and Back | All articles, including Advanced | Staff browser navigation verified |

## Verification

- Help integrity: 5 tests passed, covering static UI article references, main-screen mappings, metadata/nonempty content, common questions, and internal Markdown links.
- Chromium: all 10 help-access tests passed. API responses are mocked; several checks intentionally return failed page-data requests to verify help remains accessible.
- Operator TypeScript check passed.
- Full operator unit suite: 290 passed, 3 skipped. Existing React `act` warnings and response-mock errors were logged by unrelated component tests, which still passed.
- `git diff --check` passed.
- A staff test timed out on the first run but passed on both subsequent runs without a staff-specific code change; not classified as a confirmed product defect.

## Remaining editorial work and limits

1. **Provider and legal references need a separate source-verification pass.** Telegram bot/chat-ID setup, Discord menu paths, external-site refresh estimates, and advertising/disclosure guidance were read for clarity but not verified against current provider documentation or jurisdiction-specific requirements. They should not be treated as certified instructions or timing guarantees.
2. **Non-automotive terminology is incomplete.** The UI supports other inventory categories, but much of help still assumes vehicles, VINs, mileage, and dealerships. Create category-specific guidance or make relevant articles explicitly automotive.
3. **Staff help is broad.** The staff header always suggests dealership setup, including staff Problems and Settings. More specific articles would improve those screens.
4. **Specialized workflows could use closer article links.** Older-inventory pricing, sold/removal actions, and some report details remain primarily discoverable through header search or related articles. The catalog makes them accessible, but not every control has direct help.
5. **Browser coverage is representative, not exhaustive.** Chromium checks cover the primary routes and import overlay; they do not certify every role, screen reader, provider setup, or underlying business operation. Account setup/picker and several complex controls were inspected in source rather than exercised end to end.

Existing unrelated UI/backend edits were retained. The only addition to the already-modified InventoryPage is its bulk-edit help article prop.

## Agreed next milestone

A new internal employee can find a dealership, understand its current problems, identify who is responsible, and complete the next action without training.

- P1: Tailor staff Help to dealership records, integration setup, Problems, and staff Settings.
- P1: Add direct guidance at repricing, sold-listing removal, and CRM delivery decisions.
- P2: Verify external-provider setup instructions against current official documentation.
- Later: Defer non-automotive content until StarterGrid actively supports additional categories.

Keep primary actions clear and explain unfamiliar decisions briefly beside the action. Use contextual Help for task detail and Advanced articles for technical configuration; do not add an icon beside every control. Retain stock-number guidance and keyboard-focus restoration as regression requirements.
