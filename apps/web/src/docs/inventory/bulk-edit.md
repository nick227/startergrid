---
title: Bulk Edit
summary: Applying one field change to many stock numbers and the auto-sync run that follows.
keywords: bulk edit, price, mileage, multi-select, reconcile
updated: 2026-06-05
---

Bulk edit updates a single field across selected rows in one save — typical for lot-wide price adjustments, mileage corrections, or condition flags after recon.

## After save

A full [Auto-Sync](doc:processes/auto-sync) reconcile is scheduled (debounced). All ready units on the lot are re-validated and prepared, not only the selected rows.

## Field scope

| Field | Notes |
| --- | --- |
| Price | Internet or asking per dealer convention |
| Mileage | Odometer at time of edit |
| Condition | New, used, CPO per your taxonomy |
| Colors / body | Manual override when decode is wrong |

Photos and VIN are not bulk-edited here; change per row or re-import.

## Example

Select 14 units for a $500 reduction before a holiday weekend. One save, one debounced reconcile, one dispatch window — not fourteen separate runs if edits complete within the debounce window.

Blocked units in the selection remain blocked until their specific issues are cleared; bulk price does not bypass validation.
