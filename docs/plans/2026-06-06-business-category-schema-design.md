# Business Category & Operator Schema — Design Lock

**Created:** 2026-06-06  
**Status:** Approved direction — **stop implementation until this is wired**  
**Goal:** One declarative, config-driven category system. Cars-first (`automotive`). Placeholders for all future verticals.  
**Related:** [channel console architecture](./2026-06-06-operator-channel-console-architecture.md) · [operator experience design](./2026-06-06-operator-web-experience-design.md) · [UI roadmap](./2026-06-06-operator-web-ui-roadmap.md)

---

## Decision summary

| Term | Meaning |
|------|---------|
| **Business category** | Stable registry ID for an industry/asset class (`automotive`, `apparel`, …) |
| **Category schema** | Declarative bundle for one category: copy, asset fields, formatters, lifecycle, readiness hooks |
| **Operator schema type** | Runtime-resolved category schema for the **active organization** — what the operator console loads |
| **Shell copy** | Category-neutral console language (`operatorCopy`) — never mentions vehicle/product/release |
| **Category copy** | Category-specific labels layered on shell copy (`automotiveCopy`, `apparelCopy`, …) |

**Philosophy (recommit):**

```txt
Registry → Factory → Context → UI
```

No `if (category === 'automotive')` in page components. No scattered string literals. Categories are **data**, not branches.

---

## What is wrong today (schema validation)

| Layer | Today | Problem |
|-------|-------|---------|
| **DB** | `DealershipProfile` has no category field | Cannot know which schema to load per org |
| **DB** | `Vehicle`, `VehicleMedia`, car-specific enums | Correct for v1; must not leak into shell naming |
| **API** | Endpoints named `/vehicles`, `/inventory` returning car shape | OK for automotive v1; responses should expose `businessCategory` on org |
| **UI copy** | `activeVertical = genericVertical` | Automotive labels exist but are **not active** |
| **UI copy** | `VerticalCopyAdapter` is inventory-only | Incomplete vs architecture doc’s full adapter |
| **Platform registry** | `requiredVehicleFields` per platform | Becomes `requiredAssetFields` keyed by category when multi-category channels ship |

**Immediate fix (no asset-model refactor):** add `businessCategory` to org, resolve category schema on org pick, activate `automotive` copy + formatters for automotive orgs. Keep `Vehicle` table as automotive storage.

**Long-term (not blocking v1):** generic `Asset` store or typed extensions per category. Out of scope until second category goes active.

---

## Where business category lives

**Source of truth: organization (`DealershipProfile.businessCategory`).**

| Actor | How they get category |
|-------|------------------------|
| Operator user | Inherits from **selected organization** after dealer/org pick |
| SUPER_ADMIN | Same — category changes when switching orgs |
| API request | `dealershipId` → load org → `businessCategory` → resolve schema |
| Marketplace (future) | Org-scoped storefront uses same category for consumer copy |

**Not on `OperatorAccount`.** One operator may access orgs in different categories; category is a property of the org’s inventory domain, not the login.

```prisma
enum BusinessCategory {
  AUTOMOTIVE
  MUSIC
  EBOOKS
  VIDEO
  WATCHES
  SNEAKERS
  COLLECTIBLES
  APPAREL
  VACATION_RENTALS
  APARTMENTS
  HOMES
  COMMERCIAL_PROPERTY
  BOATS
  POWERSPORTS        // trailers, RV, powersports
  HEAVY_EQUIPMENT
  FURNITURE
}

model DealershipProfile {
  // ...
  businessCategory BusinessCategory @default(AUTOMOTIVE)
}
```

Enum values map 1:1 to registry slugs via `toSlug()` (`AUTOMOTIVE` → `automotive`).

---

## Category registry (canonical list)

All categories exist in the registry from day one. Most are **placeholder** until activated.

| Slug | Display name | Status | Asset noun (singular) | Primary identifier |
|------|--------------|--------|----------------------|-------------------|
| `automotive` | Automotive | **active** | Vehicle | VIN + Stock # |
| `music` | Music | placeholder | Release | ISRC / catalog # |
| `ebooks` | eBooks | placeholder | Title | ISBN / SKU |
| `video` | Video | placeholder | Title | Asset ID / UPC |
| `watches` | Watches | placeholder | Watch | Reference # |
| `sneakers` | Sneakers | placeholder | Pair | Style code |
| `collectibles` | Collectibles | placeholder | Item | Cert # / SKU |
| `apparel` | Apparel | placeholder | Product | SKU |
| `vacation_rentals` | Vacation rentals | placeholder | Listing | Property ID |
| `apartments` | Apartments | placeholder | Unit | Unit ID |
| `homes` | Homes | placeholder | Property | MLS # |
| `commercial_property` | Commercial property | placeholder | Property | Listing ID |
| `boats` | Boats | placeholder | Vessel | Hull ID |
| `powersports` | Powersports & RV | placeholder | Unit | VIN / stock # |
| `heavy_equipment` | Heavy equipment | placeholder | Machine | Serial # |
| `furniture` | Furniture | placeholder | Product | SKU |

**Placeholder behavior:** resolve to schema with generic shell copy + category display name + stub asset labels (`Asset`, `Ref #`). UI works; no category-specific validation or channels until promoted to `active`.

---

## Category schema bundle (declarative contract)

One TypeScript module per category (or JSON + loader). Factory assembles at build time.

```ts
type CategoryStatus = 'active' | 'placeholder';

type CategorySchema = {
  id: BusinessCategorySlug;
  status: CategoryStatus;
  displayName: string;

  /** Layered on operatorCopy — never duplicate shell strings */
  copy: CategoryCopyBundle;

  asset: {
    singular: string;
    plural: string;
    refLabel: string;       // "Stock #", "SKU", "Hull ID"
    idLabel: string;        // "VIN", "ISBN", "Serial #"
    titleLabel: string;     // "Vehicle", "Release", "Property"
  };

  /** Inventory table / drawer — declarative field defs */
  inventoryFields: FieldDef[];

  /** Row presentation for shell pages */
  formatters: {
    assetLead: (record: unknown) => string;
    assetMeta: (record: unknown) => string;
  };

  lifecycle: {
    activeLabel: string;    // "On the lot" | "In stock" | "Listed"
    soldLabel: string;
    removedLabel: string;
  };

  taskActions: Partial<Record<'SOLD' | 'REMOVED' | 'INITIAL_PUBLISH' | 'NEW', string>>;

  /** Optional — readiness + channel mapping when category is active */
  readiness?: ReadinessProfileRef;
  channels?: ChannelCompatibilityRef;
};
```

**Factory:**

```ts
const REGISTRY: Record<BusinessCategorySlug, CategorySchema> = { ... };

export function resolveCategorySchema(slug: BusinessCategorySlug): CategorySchema;
export function listCategories(): CategorySchemaMeta[];
export function isActive(slug: BusinessCategorySlug): boolean;
```

Unknown slug → throw in dev; fallback to `generic` placeholder in prod with logged warning.

---

## Copy & language files

Two layers, one resolution path:

```txt
operatorCopy (shell, category-neutral)
    +
category.copy (category bundle)
    =
resolvedCopy (what UI reads)
```

**File layout (target):**

```txt
packages/category-schemas/          # or apps/web/src/category-schemas/
  registry.ts                       # slug → schema factory
  types.ts                          # CategorySchema, CategoryCopyBundle
  generic/
    copy.en.ts                      # fallback asset nouns
  automotive/
    copy.en.ts                      # full automotive labels
    fields.ts                       # inventory column defs
    formatters.ts
  apparel/
    copy.en.ts                      # placeholder stubs
  ... (one folder per registry slug)
```

**Locale:** `copy.en.ts` first. Future: `copy.es.ts` keyed by same structure; `resolveCategorySchema(slug, locale)`.

**Migration from today:**

| Current | Becomes |
|---------|---------|
| `lib/copy/operator.ts` | Shell layer — unchanged |
| `lib/copy/vertical.ts` | Deprecated → `automotive/copy.en.ts` + schema |
| `activeVertical` constant | `CategoryContext.activeSchema` from org |

---

## Runtime load path

```txt
1. Operator logs in
2. Operator picks organization (dealershipId)
3. GET /api/dealers/:id includes businessCategory
4. resolveCategorySchema(businessCategory)
5. CategoryProvider sets context for subtree
6. All shell pages read context.copy / context.formatters
```

**React:**

```tsx
<CategoryProvider schema={resolvedSchema}>
  <PageShell>...</PageShell>
</CategoryProvider>
```

Provider mounts **after** org pick (same boundary as dealer scope today). Remount on org change.

**Hooks:**

```ts
useCategorySchema()   // full bundle
useCategoryCopy()     // merged shell + category copy
useInventoryLabels()  // asset.refLabel, etc.
```

---

## What stays generic (shell)

These never vary by category — only copy tone if needed later:

- Nav: Platforms · Queue · History · Reports · Inventory · Help
- Page layout: situation → controls → row cards → drawer
- Connection states: Inactive · Connected · Blocked · Updating
- Queue task kinds: Publish · Update · Remove · Delist/Sold (verb from category)
- Channel registry structure (which channels appear is category + platform config)

---

## What varies by category (adapter)

| Concern | Automotive v1 | Placeholder |
|---------|---------------|-------------|
| Asset row lead | `{year} {make} {model}` | Title or ref |
| Asset row meta | Mileage · price · readiness | Price · status |
| Inventory columns | Stock #, VIN, YMM, miles | From `inventoryFields` |
| Lifecycle chips | On the lot · Sold · Removed | From `lifecycle` |
| Readiness rules | VIN, photos, price | Generic pass-through |
| Intake mapping | CSV/JSON vehicle shape | Stub |
| Help/KB | Automotive articles | Generic or empty |

---

## API additions (minimal)

**Org profile response** — add field:

```json
{
  "id": "…",
  "legalName": "…",
  "businessCategory": "automotive"
}
```

**Optional metadata endpoint** (cache-friendly):

```txt
GET /api/category-schemas/:slug
```

Returns public schema meta (display name, asset nouns, field labels) — no secrets. UI can prefetch registry at boot; slug from org is authoritative.

---

## Platform registry interaction

Platforms declare **supported categories** (future):

```ts
supportedCategories: ['automotive']  // default today
requiredAssetFields: { automotive: ['vin', 'stockNumber', ...] }
```

Automotive platforms keep current vehicle field paths. Non-automotive platforms hidden for non-matching orgs. **Not implemented until second active category.**

---

## Implementation phases

### Phase 0 — Lock (this doc) ✅

- Terminology, registry list, schema contract, load path
- Stop adding car-specific strings outside category bundles

### Phase 1 — Wire category to org (cars only)

- [ ] Prisma: `BusinessCategory` enum + `DealershipProfile.businessCategory` default `AUTOMOTIVE`
- [ ] Seed/migration: all existing orgs → `AUTOMOTIVE`
- [ ] API: expose `businessCategory` on dealer/org responses
- [ ] `packages/category-schemas` with `registry`, `automotive`, `generic` placeholder
- [ ] `CategoryProvider` + replace `activeVertical` with context
- [ ] Activate automotive copy (Stock #, VIN, Sold) for automotive orgs
- [ ] Placeholder stubs for all other registry slugs

### Phase 2 — Complete automotive adapter

- [ ] Move `inventoryConfig` column defs → `automotive/fields.ts`
- [ ] Row formatters for Queue, History, Inventory from schema
- [ ] Tests: org with `automotive` resolves correct labels

### Phase 3 — Second category pilot

- [ ] Promote one placeholder (e.g. `furniture`) to `active`
- [ ] Asset storage strategy decision (generic vs extension table)
- [ ] Platform `supportedCategories` filtering

**Explicitly deferred:** renaming `Vehicle` model, generic asset API, marketplace multi-category.

---

## Rules for contributors

1. **Shell components** import `useCategoryCopy()` — never `automotive` or `vehicle` literals.
2. **New categories** = new folder under `category-schemas/` + registry entry — no new pages.
3. **Platform field requirements** reference category slug, not hard-coded vehicle.
4. **Placeholder categories** must render a working console with generic labels — no crashes.
5. **Enum + slug** stay in sync; single `BUSINESS_CATEGORY_SLUGS` const is source of truth for both.

---

## Success criteria

- [ ] Every org has `businessCategory`; API returns it
- [ ] Operator UI loads correct labels immediately after org pick
- [ ] Automotive orgs see Stock # / VIN / Vehicle; generic org would see Ref # / Asset
- [ ] All 16 registry slugs exist as placeholder configs
- [ ] Zero new car-specific strings in `pages/` or `shell/` outside `category-schemas/automotive/`
- [ ] Roadmap sprint work (Queue, History, Inventory) continues on shell — category is parallel, not blocking

---

## Decisions confirmed (2026-06-07)

### One category per organization — locked

**Rule:** `DealershipProfile` carries exactly one `businessCategory`. An operator who manages multiple inventory types creates multiple orgs.

**Rationale:**
- `OperatorAccount` is already separate from `DealershipProfile`. One operator can access any number of orgs, each with its own category. Category changes automatically when switching orgs — no blending logic needed.
- A dealer group with boats _and_ RVs creates two orgs (`BOATS`, `POWERSPORTS`) under one operator account. The factory resolves a single schema per org; set operations over schemas add complexity with no immediate payoff.
- Clean for the registry → factory → context chain: `resolveCategorySchema(org.businessCategory)` is a single lookup. Multi-category per org would require schema merging, union field defs, and ambiguous formatters.
- **Revisit only if:** a real customer needs a single storefront selling fundamentally different asset classes (e.g. a marketplace that mixes real estate + vehicles). That would be a `GENERAL` category with a custom schema, not a multi-category org.

### Consumer marketplace

Same `businessCategory` from org. No separate `marketplaceCategory`. One org → one marketplace storefront category. Confirmed: one category per org is the right rule at this stage.
