---
visibility: public
id: industry-dms-source-of-truth
feature: inventory-import
type: reference
audience: user, staff
tags: inventory import, inventory
synonyms: DMS, import, price, sold, overwrite
aliases: industry/dms-source-of-truth
related: inventory-csv-import, troubleshooting-price-mismatch
title: How the DMS relates to DealerGrid
summary: DealerGrid sends the copy stored here. Your DMS still owns deals, accounting, and the floor.
keywords: DMS, import, price, sold, overwrite
updated: 2026-10-26
advanced: true
---

Most rooftops keep inventory in a DMS, on the website, and in DealerGrid. Destinations receive the copy stored here.

## What to do

- Import or edit here when the price or status you want advertised changes.
- Mark sold here the same day the DMS shows sold, or the unit stays advertised.
- Use regular DMS exports so new units are not missing.

After an import, the file’s price is what we send until the next change. The DMS remains authoritative for floorplanning, deal jackets, and in-store process.

See [Import a spreadsheet](doc:inventory/csv-import) and [The price on a site does not match Vehicles](doc:troubleshooting/price-mismatch).
