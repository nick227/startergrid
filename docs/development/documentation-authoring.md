---
title: Documentation record contract (developers)
---

Documentation is a maintained description of product capabilities. Normal UI copy explains the immediate action and consequence; documentation supplies deeper detail. Do not add categories, onboarding overlays, or an information icon beside every control.

## Record metadata

Every published Markdown record needs flat, single-line frontmatter values. Lists use commas; multiline YAML and YAML array syntax are not supported.

```yaml
---
visibility: public
id: inventory-import
feature: inventory-import
type: feature
audience: user, staff, developer
title: Spreadsheet inventory import
summary: Preview spreadsheet rows and update inventory matched by dealership and stock number.
tags: inventory, import
synonyms: csv, spreadsheet, upload, overwrite
keywords: csv, spreadsheet
aliases: previous/path
related: inventory-csv-import, inventory-stock-number-rules
implementation: apps/web/src/components/inventory/ImportModal.tsx, src/services/inventory/importService.ts
updated: 2026-10-27
---
```

- `id` is permanent and unique. Use a lowercase hyphenated identifier. Do not change it when changing a title, route, or file location.
- `feature` identifies a durable software capability and connects records about it. Multiple tasks and troubleshooting records may share a feature.
- `type` is exactly one of `feature`, `task`, `troubleshooting`, or `reference`.
- `visibility` must be `public` for this published corpus. Nonpublic or missing visibility fails export. Keep internal operational runbooks and sensitive developer material outside `apps/web/src/docs`; the POC does not publish or authorize access to private documents. Audience and document type do not change visibility.
- `audience` describes relevance: `user`, `staff`, `developer`, or a combination. It is not authorization. All published records are publicly accessible; never include secrets, private incident details, or customer records.
- `tags` are a small set of meaningful attributes. Do not copy every search keyword into tags or create a folder hierarchy through tags.
- `synonyms` contains likely user language, abbreviations, and questions. Keep concepts specific enough to rank usefully.
- `aliases` preserves former document identifiers. Existing folder-path identifiers remain supported automatically; explicitly preserve that path if moving the file.
- `related` contains canonical document IDs. Use relationships for prerequisites, follow-up tasks, and troubleshooting. Reciprocal links and shared feature IDs also contribute to related results.
- `implementation` lists repository-relative paths, not credentials or deployment commands. Show these separately from user instructions.
- `updated` is the date content was actually reviewed, not proof that a provider's current instructions were verified.

Existing files may stay in their current folders. New records can be flat. File locations do not define the visible index or canonical URL. `advanced` is legacy metadata; use document type and audience for new records.

## Four content shapes

**Feature:** What it does → inputs and identity → outputs and side effects → limits → related tasks. Describe product behavior independently from changing screen layout.

**Task:** Goal and prerequisites → starting location and actions → expected result → failure or recovery path. Match visible control labels exactly.

**Troubleshooting:** Symptom → checks in a useful order → diagnosis/action branches → evidence of resolution → escalation information. Do not substitute “follow the next action” for an explanation.

**Reference:** Scope → definitions or contract → constraints and examples → implementation or official sources. Keep provider-specific configuration and API details here.

Use these as editorial shapes, not required identical headings on every short page. An article should answer one main question. Link to canonical explanations rather than repeating paragraphs.

## Voice and scope

Use plain language and short sections. Explain necessary abbreviations on first use. Distinguish saved settings, submitted operations, and externally confirmed outcomes. Preserve stock-number identity warnings and other material consequences close to the relevant task. Omit generic reassurance and unverified timing guarantees.

Keep normal daily instructions separate from technical implementation details. Defer non-automotive content until the product actively supports those workflows. Use current official sources when updating external-provider instructions; record verification scope separately from an ordinary wording edit.

## Entry and navigation

Page-level Help and selected high-consequence task links open an article in another tab so the current form and focus remain intact. Documentation links within the reader navigate normally and support browser Back, refresh, and sharing. The searchable index is secondary access, not primary application navigation. No mandatory side panel or walkthrough.

Canonical links use `/app/#/docs/<id>` to work with the current hash router and hosting setup. Search and filters also live in the hash query. A later path-router migration must preserve these links.

## Maintenance and agent use

1. Update the feature record and affected task records when behavior changes.
2. Run `node scripts/export-documentation.mjs --write` from the repository root. It validates IDs, aliases, relationships, and implementation paths and regenerates metadata and search text. Dev/build/test scripts do this automatically.
3. Run `npm run test -w auto-dealer-operator-ui -- --run src/lib/docs`.
4. For agent ingestion, `node scripts/export-documentation.mjs` writes JSON with schema version, feature IDs, metadata, and complete article bodies to stdout. Consumers can redirect this to their chosen artifact.
5. Check behavior against code and tests. A documentation record does not authorize modifying production.

The metadata index is shipped separately from lazy article bodies; the full-text corpus loads only on search. This is a static index, not a semantic search service. Measure payload and search time as the corpus grows before claiming thousand-record performance.
