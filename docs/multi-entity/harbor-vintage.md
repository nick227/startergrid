# Harbor Vintage backend handoff

Current backend focus: native apparel contract and Harbor Vintage acceptance. Concurrent Marketplace and Operator UI changes are owned by their respective agents and are not edited here. Shared inventory create/update readiness changes landed concurrently and are reused. Physical-music changes belong to the other agent and are outside this acceptance claim.

APPAREL remains `lifecycleMode: physical_inventory` and now declares `inventorySource: category_item`. Use shared `categoryInventorySource(categoryId)` for API/storage routing; do not infer storage from physical versus digital lifecycle. There are still only two inventory stores.

Apparel schema: `packages/category-schemas/src/apparel/inventorySchema.ts`. Each SKU represents one garment. Required: SKU, title, size, condition (NEW/USED/VINTAGE), positive price. Optional: brand, color, material, era, measurements, conditionNotes, barcode. No VIN, mileage, model year, digital format or rights metadata is needed.

Existing APIs:

- Public list: `GET /api/marketplace/category-items?categoryId=APPAREL&dealer=dealer_me_vintage`
- Public detail: `GET /api/marketplace/category-items/me_vintage_1`
- Seller: `GET /api/marketplace/sellers/dealer_me_vintage?category=apparel` (`categoryItems`)
- Inquiry: `POST /api/marketplace/category-items/me_vintage_1/leads` with contactName/contactEmail/message. Seller comes from inventory ownership, never request input.
- Operator create: `POST /api/dealers/dealer_me_vintage/inventory/items`
- Operator detail/update: `GET/PATCH /api/dealers/dealer_me_vintage/inventory/items/:itemId`
- Publish: `POST /api/dealers/dealer_me_vintage/platforms/consumer-marketplace/category-listings` with `{ "categoryItemId": "me_vintage_1" }`
- Withdraw: `DELETE /api/dealers/dealer_me_vintage/platforms/consumer-marketplace/category-listings/:itemId`
- Leads and assignment: existing `/api/dealers/dealer_me_vintage/leads` and `PATCH .../leads/:leadId`, with `categoryItemId` and `inventoryIdentity.source=category_item`.

Create example:

```json
{
  "categoryId": "APPAREL",
  "stockNumber": "HV-JACKET-003",
  "primaryIdentifier": "HV-JACKET-003",
  "condition": "VINTAGE",
  "priceCents": 6800,
  "data": {
    "title": "Vintage denim jacket",
    "brand": "Demo Vintage",
    "size": "M",
    "color": "Indigo",
    "material": "Cotton denim",
    "era": "1990s",
    "measurements": "Chest 104 cm; length 62 cm",
    "conditionNotes": "Light cuff wear"
  }
}
```

The shared create/update backend computes READY/DRAFT from readiness; publication is a separate explicit action. Data updates replace `data`, so send the complete garment attributes. ADF/XML remains unavailable for category items; the inquiry still appears in the shared Lead workflow.

Browser presentation remains with UI owners. In particular, use the source selector rather than `isDigital` to choose category-item APIs, and render the garment's size/condition/material rather than book metadata. No browser acceptance claim is made here.


Public category-item cards and detail responses now include nullable `condition`, `brand`, `size`, `color`, `material`, and `era`. Detail `data` includes measurements and conditionNotes. The Marketplace SDK is regenerated from the additive OpenAPI changes; existing book fields remain compatible.

The local fixture currently contains `me_vintage_1` (published denim jacket, size M, VINTAGE) and `me_vintage_2` (draft wool coat, missing size). The draft is deliberately excluded from public browse and inquiry capture. Its owner can PATCH a complete data object including size, then publish through the standard category-listings endpoint. No global fixture reset is required for acceptance.

Run the scoped checks:

```bash
npm run build
node --test dist/src/tests/apparelPublication.test.js
NODE_ENV=development DEALERGRID_MULTI_ENTITY_SEED=1 DEALERGRID_VINTAGE_INTEGRATION=1 node --test dist/src/tests/harborVintageIntegration.test.js
```

The integration test creates one temporary garment through the Operator API, verifies blocked readiness then edits/publishes it, checks browse/storefront/detail, submits a real test inquiry, reads/assigns it through the existing Lead API, checks another seller is denied, checks sold/removed/unpriced visibility and withdrawal, and cleans up only its own records. It snapshots Harborline to confirm no changes. It does not reset or modify the existing demo garments, other sellers, or other agents' sessions.

## Verified result

- TypeScript build and Marketplace OpenAPI validation passed; generated Marketplace client refreshed.
- Both apparel contract tests passed; the scoped database/API integration passed, including Operator create/edit → publication → browse/detail/storefront → real inquiry → Lead retrieval/assignment → withdrawal.
- Harborline snapshot unchanged. Temporary garments, inquiries, attribution events and their test notifications were cleaned up; no global reset was run.
- Full backend run: 2,771 passing, two failures, two explicitly skipped integration tests, five existing TODOs. All apparel tests passed. The two remaining failures belong to concurrent SONGS work: seller lookup now returns `Seller not found` instead of the old disabled-category message, and the legacy SONGS pristine fixtures lack condition for the newly allowed consumer-marketplace profile. Those semantics and fixtures were left with their owner.

Backend acceptance: Harbor Vintage can publish native apparel and receive correctly owned category-item inquiries. Checkout, shipping execution, apparel sales reporting and UI/browser presentation are not claimed by this backend acceptance test.
