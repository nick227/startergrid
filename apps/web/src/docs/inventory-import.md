---
visibility: public
id: inventory-import
feature: inventory-import
type: feature
audience: user, staff, developer
title: Spreadsheet inventory import
summary: Preview spreadsheet rows and update inventory matched by dealership and stock number.
tags: inventory, import, stock numbers
synonyms: csv, spreadsheet, upload, duplicate, overwrite, mapping
keywords: csv, spreadsheet, upload, duplicate, overwrite, mapping
related: inventory-csv-import, inventory-stock-number-rules, troubleshooting-import-errors
implementation: apps/web/src/components/inventory/ImportModal.tsx, src/services/inventory/importService.ts
updated: 2026-10-27
---

## What this feature does

Spreadsheet import maps file columns to inventory fields, validates rows, and creates or updates records. Preview is separate from committing changes.

## Inputs and identity

The first row contains column names. Existing vehicles are matched by dealership and stock number. A stock number is not freed when an old vehicle is sold or removed. Reusing it for another vehicle can target the wrong record.

## Outcomes and limits

Rows can create, update, skip, or fail. An import can change some rows while others do not save. Supplied values can overwrite existing data. Import completion does not establish publication on any destination.

For the step-by-step workflow, read [Import and correct a spreadsheet](doc:inventory-csv-import). For a failed row, read [Fix import errors](doc:troubleshooting-import-errors).
