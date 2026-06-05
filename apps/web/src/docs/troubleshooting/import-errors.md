---
title: Import Errors
summary: Skipped rows, error counts, and how to recover from a failed CSV commit.
keywords: import error, skipped, CSV, parse, rejected row
updated: 2026-06-05
---

CSV commit reports created, updated, skipped, and error counts. Skipped and error rows did not change inventory.

## Frequent row failures

| Error | Typical fix |
| --- | --- |
| Missing stock number | Add column or value |
| Invalid VIN length | Correct character count; no I, O, Q |
| Non-numeric price | Remove currency symbols if template expects digits only |
| Duplicate stock in file | Deduplicate source export |

## Partial success

A file can update 140 units and skip 6. The 140 are in inventory and trigger [Auto-Sync](doc:processes/auto-sync). Fix the 6 in the source file and re-import only those stock numbers — stable stock keys upsert safely.

## Not an account fix

Import errors do not change [Account states](doc:platforms/account-states). Zero rows imported means no inventory change and no sync movement.

## Example

Export includes header row twice mid-file after a bad merge — parser skips malformed lines; summary shows **4 errors**; correct the spreadsheet section and re-commit.

See [CSV import](doc:inventory/csv-import) and [Stock number rules](doc:inventory/stock-number-rules).
