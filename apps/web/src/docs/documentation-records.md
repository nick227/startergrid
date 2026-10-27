---
visibility: public
id: documentation-records
feature: documentation-index
type: reference
audience: developer
title: Maintain feature documentation
summary: Keep stable product records, task instructions, and implementation references aligned as the interface changes.
tags: documentation, development, metadata
synonyms: agents, ai, feature id, docs, index, schema, maintenance
keywords: agents, ai, feature id, docs, index, schema, maintenance
related: inventory-import, staff-dealership-assistance
implementation: docs/development/documentation-authoring.md, apps/web/src/lib/docs/registry.ts, apps/web/src/lib/docs/catalog.ts, scripts/export-documentation.mjs
updated: 2026-10-27
---

## Record contract

Each published Markdown record explicitly declares `visibility: public` and has a permanent `id`, a stable `feature` identifier, one `type`, an `audience` list, a title, a summary, tags, synonyms, related document IDs, and a review date. Optional `implementation` entries name repository files. IDs and feature identifiers describe capabilities, not route names or storage folders.

The four types are **feature**, **task**, **troubleshooting**, and **reference**. Audience labels describe who benefits; they are not access controls. The published corpus is public. Export rejects missing or nonpublic visibility; keep internal runbooks and sensitive implementation material outside this corpus. Do not include credentials, customer records, or internal-only information.

## When implementation changes

1. Find documentation by feature, synonyms, or implementation path.
2. Check whether the capability's inputs, outputs, permissions, side effects, or failure behavior changed.
3. Update the feature record and affected tasks together. Match visible control labels in task instructions; keep durable behavior in feature records.
4. Preserve document IDs. If replacing a record, retain its old ID as an alias on the replacement and update related links.
5. Run help integrity tests and export the machine-readable index. Check that related IDs and implementation references resolve.

## Agent use

Read the feature record for intended behavior, then consult implementation references and tests for current behavior. Documentation describes the product; it does not authorize deployments or privileged operations. Report disagreement between code and documentation instead of silently treating either as proof.

From the repository root, run `node scripts/export-documentation.mjs` for JSON records including article bodies. The export uses the same metadata contract as the application and can be indexed by development tools.
