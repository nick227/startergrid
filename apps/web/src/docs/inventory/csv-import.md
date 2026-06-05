---
title: CSV Import
summary: Column expectations, commit behavior, and overwrite rules for spreadsheet import.
keywords: CSV, import, stock number, DMS export, upsert
updated: 2026-06-05
---

CSV import loads or refreshes vehicle rows from a spreadsheet export. It is the primary path for initial lot setup and for replacing a full DMS extract during testing.

## Expected columns

| Column | Role |
| --- | --- |
| stock number | Rooftop key; must stay stable across imports |
| VIN | 17-character when present; ties decode and history |
| year, make, model | Identity when decode is not run |
| price | Asking or internet price per your template |

Additional headers map to mileage, exterior/interior color, condition, trim, and status when the import template defines them.

## Commit behavior

Rows are parsed row by row. Valid rows upsert by stock number — new stock is created, existing stock is updated field by field per the file. Invalid rows are skipped and counted in the summary.

A committed import triggers a full [Auto-Sync](doc:processes/auto-sync) reconcile.

## Overwrite rule

After commit, inventory in this system is what syndication uses. A DMS price of $24,995 and a CSV price of $23,995 becomes $23,995 here on the next import of that stock number. Website or DMS values are not merged automatically.

## Example row

`U24156,1FTFW1E85MFA12345,2021,Ford,F-150,45995,45000,Oxford White,Black,Used`

Stock **U24156** updates or creates one row; validation runs on commit; ready units enter the next dispatch window.

## Errors

Re-import only corrected stock after fixing the source file. Repeated full-file imports are safe when stock numbers are stable.
