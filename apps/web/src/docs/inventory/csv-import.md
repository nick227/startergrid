---
title: Import a spreadsheet
summary: Upload a CSV to add or update vehicles by stock number. Valid rows save; problem rows are skipped.
keywords: CSV, import, stock number, spreadsheet, VIN
updated: 2026-10-26
---

Use Vehicles → import when you are loading the lot or refreshing a full export.

## What the file needs

| Column | Why it matters |
| --- | --- |
| stock number | Finds the existing vehicle or creates a new one |
| VIN | 17 characters when present |
| year, make, model | Identity if VIN decode is not used |
| price | Asking price |

Mileage, colors, condition, trim, and status map when those headers are in the file.

## What happens after you commit

Valid rows create or update by stock number. Skipped rows do not change inventory. Ready vehicles can be sent after the import. The price in this file becomes the price StarterGrid sends — it does not merge with your website automatically.

Fix skipped rows in the spreadsheet and import those stock numbers again. Re-importing the full file is safe when stock numbers stay stable.

See [Keep stock numbers stable](doc:inventory/stock-number-rules) and [Fix import errors](doc:troubleshooting/import-errors).
