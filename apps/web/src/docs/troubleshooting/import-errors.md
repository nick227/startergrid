---
visibility: public
id: troubleshooting-import-errors
feature: inventory-import
type: troubleshooting
audience: user, staff
tags: inventory import, inventory
synonyms: import errors, CSV, skipped, blocked, invalid, duplicate
aliases: troubleshooting/import-errors
related: inventory-csv-import
title: Fix import errors
summary: Correct a row or its column matches, check it again and review which rows actually saved.
keywords: import errors, CSV, skipped, blocked, invalid, duplicate
updated: 2026-10-26
---

The preview explains problems before any inventory changes are saved. Choose **Edit row** to fix a value, then **Check corrected rows**. If the wrong field was matched, go back to the column-matching step.

| Problem | What to check |
| --- | --- |
| Missing stock number | Match the stock-number column and enter a value. |
| Invalid VIN | Check the original VIN for missing characters or a typing error. Do not guess the missing characters. |
| Missing price or mileage | Check both the value and the column match. |
| Duplicate stock number | Keep one row for each vehicle in the file. |
| Required field still missing | Check whether its column was ignored or matched to another field. |

## If only some rows save

Review the import result. Skipped or failed rows did not save successfully; other rows may already have been created or updated. Correct the affected rows and preview them again before importing. Avoid repeatedly submitting the whole file without checking what already changed.

If an unexpected error continues, give support the stock number, the action you tried and the error shown. Do not include passwords or connection secrets.

Read [Import and correct a spreadsheet](doc:inventory/csv-import).
