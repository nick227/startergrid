---
title: Import and correct a spreadsheet
summary: Drop a CSV file, match its columns, fix problem rows and check the results before importing.
keywords: CSV, spreadsheet, import, drag drop, correction, invalid, skipped, stock number
updated: 2026-10-26
---

Open **Vehicles → Import spreadsheet**. Drop one CSV, TSV or text file into the upload area, choose a file, or paste rows copied from a spreadsheet. The first row must contain column names.

## Match the columns

Match your file’s headers to the inventory fields. Review suggested matches rather than assuming every column was recognized.

Include stock number, VIN, year, make, model, mileage, price, condition and exterior color. Add photo URLs if they are available. Use a full, accurate VIN; the preview explains any format problem. Keep stock numbers stable because they identify vehicles to update.

## Review and correct rows

1. Choose **Preview** to check the file without saving inventory changes.
2. Choose **Edit row** to correct a value in place. You can also go back to change column matches.
3. After editing, choose **Check corrected rows**. Import stays unavailable until the server checks the changes again.
4. Review which rows will create, update or skip a vehicle. You can skip a valid row you do not want to import.
5. Choose **Import** when the results match your intent.

A blocked row is skipped rather than saved. Corrected rows must pass the checks; editing a value alone does not make them valid.

## After importing

Review the result and inventory list. Imported values can replace existing vehicle details, including price and supplied photos. Review the preview before re-importing a file; stable stock numbers prevent accidental new records but do not protect existing values from updates.

Importing does not confirm publication. Review the vehicle’s listing status and its destinations next.

Read [Fix import errors](doc:troubleshooting/import-errors) and [Prepare vehicles for listing](doc:inventory/inventory-readiness).
