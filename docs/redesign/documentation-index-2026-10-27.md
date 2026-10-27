# Contextual documentation index — 2026-10-27

## Product decision

Documentation is a deeper description of StarterGrid's capabilities. Normal UI copy remains the first explanation of an action. Page-level Help and selected consequential-workflow links open relevant documentation in a separate tab, preserving the original form. No modal reader, category sidebar, walkthrough, chatbot, or primary-navigation Help destination is introduced.

## Implemented

- One standalone searchable index at `/app/#/docs`, with article URLs at `/app/#/docs/<stable-id>`. Hash URLs intentionally preserve the current hosting/router contract. Search and type/audience/tag filters are shareable URL state.
- Migrated all 39 existing articles to permanent IDs, feature IDs, document types, audience labels, tags, synonyms, aliases, and relationships. Original folder-path identifiers still resolve. File locations no longer determine visible grouping or canonical identity.
- Added seven records: dealership assistance, staff problem diagnosis, shared integration setup, site settings, CRM delivery troubleshooting, the inventory-import capability, and the documentation contract for developers/agents. The index now has 46 records associated with 19 feature IDs.
- Four document types: feature, task, troubleshooting, reference. User/staff/developer audiences describe relevance, not authorization; published records are public and must not contain private operational information.
- Ranked search favors titles and metadata, then article-body matches. Natural-language question stopwords are ignored. Full-text content loads on first search; individual article bodies load separately on demand. Results are initially limited to 20 with Show more. No semantic-search or thousand-record performance claim is made.
- Lightweight related links use explicit document relationships, reverse relationships, and shared feature IDs. Tags link back into filtered search. Implementation references link to repository paths separately from the user procedure.
- Different staff contexts now link to dealership assistance, Problems, integration setup, and site settings. Repricing, marking sold, and CRM delivery have selected direct documentation links.
- Retired the old category table, expanded FAQ landing content, and bottom-sheet reader. Existing standalone Help routes remain compatible.

## Authoring and machine access

The source of truth is Markdown plus flat frontmatter. See `docs/development/documentation-authoring.md` for the record contract and the four content shapes. Existing files need not move. IDs stay stable when titles, layouts, routes, or file locations change; aliases retain old links.

`node scripts/export-documentation.mjs --write` validates the corpus and generates the browser metadata manifest and full-text corpus. The operator dev/build/test lifecycle runs it automatically. Validation checks required metadata, ID and alias collisions, document types, audiences, related links, and implementation file existence.

`node scripts/export-documentation.mjs` exports schema-versioned JSON with feature IDs, metadata, and complete bodies to stdout for developers and AI tooling. This is an export contract, not a connected agent service. Documentation does not authorize privileged operations.

## Validation

- Operator unit suite: 302 passed, 3 skipped. Existing unrelated component tests log React act/response-mock warnings.
- Operator production build passed, including TypeScript. Vite retains its application bundle-size advisory. Article chunks are separate; the full-text corpus is approximately 49 KB uncompressed / 16 KB gzip at the current corpus size.
- All 15 Chromium browser checks passed. Checks cover direct context links, primary navigation exclusion, sign-in and spreadsheet input preservation, source-tab keyboard focus, staff contexts, ranked CRM search, reload/Back, mobile filters, related links, unknown-link recovery, and old URL compatibility.
- Mobile index inspected at 390 px; summaries remain visible and no horizontal overflow was detected.

## Limits and follow-up

- Existing article content is preserved apart from the navigation explanation and targeted pricing/removal improvements. This is not a complete rewrite of every legacy article into the new editorial shapes.
- External-provider instructions still need verification against current official documentation. Migrating metadata is not provider certification.
- Non-automotive expansion remains deferred.
- Before scaling to thousands of records, measure metadata payload, full-text download, ranking quality, and browser search time; the stable export provides a migration path to a dedicated search backend.
- Deployment and push are outside this change. Railway artifacts remain outside this scope.


## Publication boundary closeout

- Moved the repository authoring guide to `docs/development/documentation-authoring.md`, outside the published source directory.
- Replaced broad Markdown browser globs with generated imports containing only validated public records. Unindexed files cannot become browser article chunks merely by being placed in the source tree.
- All 46 records were reviewed for public suitability. Staff records describe product workflows and permission limits; implementation references contain repository paths, not credentials, customer data, incident details, or private runbooks.
- Five exporter regression tests verify public staff/developer audience records, rejection of internal/developer/missing visibility, and exclusion of authoring/private fixture content from JSON and browser loaders.
- Feature references currently validate file existence and document relationships. This does not prove behavioral consistency or establish API-operation/test coverage for all capabilities; that remains follow-up work.
