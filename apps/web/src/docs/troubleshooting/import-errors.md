---
title: Fix import errors
summary: Skipped rows did not change inventory. Correct the spreadsheet and import those stock numbers again.
keywords: import error, skipped, CSV, stock number
updated: 2026-10-26
---

After an import, StarterGrid tells you how many rows were created, updated, or skipped. Skipped rows did not save.

## Common fixes

| Problem | What to do |
| --- | --- |
| Missing stock number | Add the column or value |
| VIN length is wrong | Use 17 characters; no I, O, or Q |
| Price is not a number | Remove $ and commas if the file expects digits |
| The same stock number twice in the file | Keep one row per stock number |

## What happens next

A file can update most of the lot and skip a few rows. The saved rows can be sent. Fix the skipped stock numbers and import those again. Import errors do not change whether a destination is connected.

See [Import a spreadsheet](doc:inventory/csv-import).
