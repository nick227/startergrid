---
title: Stock Number Rules
summary: Why stock numbers must stay stable across imports and edits.
keywords: stock number, key, import, duplicate, mapping
updated: 2026-06-05
---

Stock number is the rooftop’s primary key for a vehicle row in this system. Imports, bulk edit, and dispatch all reference it.

## Stability

| Practice | Reason |
| --- | --- |
| Keep the same stock # for the life of the unit on the lot | Upsert on import updates the correct row |
| Do not reuse a # on a different VIN in the same year | History and dispatch trace attach to stock # |
| Match DMS stock when possible | Reduces mismatch between systems |

## Reuse after wholesale

If a DMS reissues a stock number on a new acquisition, treat it as a new row here after the prior unit is marked sold or removed. Importing a new VIN under an active sold stock # overwrites the old record.

## Example

**U24156** is wholesaled and marked removed. Next month the DMS assigns **U24156** to a new trade. Import creates or updates one row — confirm the prior unit was closed out first or the file will replace the old VIN on that key.

See [CSV import](doc:inventory/csv-import).
