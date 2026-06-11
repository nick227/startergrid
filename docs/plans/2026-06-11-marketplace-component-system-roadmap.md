# Marketplace Component System Roadmap
_Date: 2026-06-11 | Scope: `apps/marketplace/src/components` | Goal: standardize, systemize, categorize, and maximize reuse_

---

## Why This Exists

The marketplace component tree has grown by feature accretion instead of by system design. Three folders carry most of the confusion:

- `components/ui` mixes primitives, marketplace-specific widgets, auth, media, lead capture, and layout-adjacent pieces.
- `components/listings` mixes filters, badges, rails, drawers, saved searches, compare, sharing, reports, and detail engagement workflows.
- `components/vdp` is mostly detail-page sections, but also owns nested gallery infrastructure and automotive-specific naming.

This makes it hard to answer simple questions:

- Is this component reusable or feature-specific?
- Is this a primitive, a pattern, a section, or a workflow?
- Should a listing badge live in `ui`, `listings`, `availability`, or `vdp`?
- Which card should a new marketplace surface reuse?
- Is `Vehicle`, `Listing`, `VDP`, or category-neutral language the right name?

The cleanup should reduce cognitive load for engineers in the same way the UI cleanup reduces cognitive load for buyers.

---

## Progress Log

- **2026-06-11**: Began Phase 0/1. Added component boundary README, created destination folders and barrels, moved the first low-risk core primitives behind compatibility shims.
- **2026-06-11**: Began Phase 2. Moved listing badge implementations into `components/listing/badges` and left compatibility shims at the legacy `ui` and `listings` paths.
- **2026-06-11**: Began Phase 3. Moved listing result implementations into `components/listing/results`, moved the geo no-results state to `features/location`, and left compatibility shims at legacy paths.
- **2026-06-11**: Began Phase 5 ahead of card consolidation because it is lower risk. Moved stateful workflow UI for auth, favorites, compare, saved searches, lead capture, sharing, and reporting into feature folders with legacy shims.

---

## Principles

- **Primitives are boring and reusable**: base UI components know nothing about listings, vehicles, dealers, leads, or marketplace APIs.
- **Patterns are reusable marketplace compositions**: cards, rails, media viewers, empty states, and forms can know marketplace conventions but should not own page-specific workflows.
- **Features own behavior**: compare, saved searches, favorites, reports, lead capture, location filtering, and availability should sit in explicit feature folders.
- **Pages compose, they do not invent systems**: page files should arrange sections and workflows, not define reusable UI patterns inline.
- **Category-neutral by default**: use `Listing`, `Seller`, `Media`, and `Detail` unless the component truly only supports automotive.
- **One component, one level of abstraction**: avoid components that are half primitive and half business workflow.
- **Shallow imports over deep spelunking**: each component category should expose an `index.ts` barrel and hide internal structure.
- **Tests follow components**: component tests live next to the component or in the owning feature folder, not scattered by accident.

---

## Target Folder Architecture

Replace the current hodge-podge with this structure:

```text
apps/marketplace/src/components/
  core/
    Badge.tsx
    Button.tsx
    Card.tsx
    EmptyState.tsx
    ErrorState.tsx
    ExternalLink.tsx
    IconButton.tsx
    Modal.tsx
    PageHeader.tsx
    SectionCard.tsx
    SkeletonBlock.tsx
    SkeletonGrid.tsx
    SpecGrid.tsx
    index.ts

  layout/
    PageShell.tsx
    DetailLayout.tsx
    ResultsLayout.tsx
    StickyActionRegion.tsx
    index.ts

  media/
    ListingImage.tsx
    MediaCarousel.tsx
    MediaGallery.tsx
    MediaLightbox.tsx
    MediaMosaic.tsx
    MediaTour.tsx
    index.ts

  listing/
    cards/
      ListingCard.tsx
      ListingCardCompact.tsx
      ListingFeedCard.tsx
      SponsoredSellerCard.tsx
      MarketplaceNoticeCard.tsx
      index.ts
    badges/
      AvailabilityBadge.tsx
      ConditionBadge.tsx
      FulfillmentBadge.tsx
      NewArrivalBadge.tsx
      PriceDropBadge.tsx
      index.ts
    results/
      ActiveFilterChips.tsx
      FilterPanel.tsx
      NoResultsRelaxation.tsx
      ResultsToolbar.tsx
      ListingGrid.tsx
      index.ts
    detail/
      DetailHeader.tsx
      DetailSection.tsx
      DetailSpecSections.tsx
      SimilarListingsRail.tsx
      index.ts
    index.ts

  seller/
    SellerBlock.tsx
    SellerSummary.tsx
    index.ts

  feedback/
    Toast.tsx
    Alert.tsx
    ConfirmationDialog.tsx
    index.ts
```

Move stateful buyer workflows to feature-owned UI folders:

```text
apps/marketplace/src/features/
  compare/
    CompareBar.tsx
    compareStore.ts
    compareRows.ts
    index.ts

  favorites/
    FavoriteButton.tsx
    favoritesSync.tsx
    index.ts

  leadCapture/
    LeadInquiryForm.tsx
    leadForm.ts
    leadForm.test.ts
    index.ts

  savedSearches/
    SavedSearchesPanel.tsx
    savedSearches.ts
    savedSearches.test.ts
    index.ts

  sharing/
    ShareListingButton.tsx
    shareListing.ts
    index.ts

  location/
    BuyerLocationPanel.tsx
    GeoNoResultsRelaxation.tsx
    buyerLocation.ts
    index.ts

  auth/
    LoginModal.tsx
    index.ts

  reporting/
    ReportListingModal.tsx
    index.ts
```

The exact folder names can evolve, but the boundary must stay clear: `components` is presentational; `features` owns marketplace behavior.

---

## Component Categories

### Core Components

Core components are low-level building blocks:

- They do not import `lib/api`, category contexts, auth contexts, route helpers, feature stores, or marketplace domain types.
- They can import design tokens, CSS utility classes, and React.
- They should be named by UI role: `Card`, `Badge`, `Skeleton`, `Modal`, `PageHeader`.

Current candidates:

- `Badge.tsx`
- `EmptyState.tsx`
- `ErrorState.tsx`
- `ExternalLink.tsx`
- `PageHeader.tsx`
- `SectionCard.tsx` moved first as-is; later decide whether it becomes `Card.tsx`, `Panel.tsx`, or a detail-specific wrapper.
- `SkeletonBlock.tsx` and `SkeletonGrid.tsx` moved first as-is; consolidate only after visual risk is low.
- `SpecGrid.tsx`

### Layout Components

Layout components define page scaffolding and repeated arrangement patterns:

- They can know marketplace navigation and route layout.
- They should not know listing-specific data shape.
- They should expose slots for actions, filters, sidebars, and sticky regions.

Current candidates:

- `layout/PageShell.tsx`
- new `ResultsLayout.tsx`
- new `DetailLayout.tsx`
- new `StickyActionRegion.tsx`

### Media Components

Media components should be category-neutral:

- Replace `VdpMedia*` names with `Media*`.
- Replace `Vehicle gallery` aria text with category-neutral `Listing media`.
- Keep media slot mapping in `lib` if it is data transformation; keep viewers in `components/media`.

Current candidates:

- `ListingImage.tsx`
- `FeedMediaCarousel.tsx` renamed to `MediaCarousel.tsx`
- `vdp/gallery/VdpMediaGallery.tsx` renamed to `MediaGallery.tsx`
- `VdpGalleryMosaic.tsx` renamed to `MediaMosaic.tsx`
- `VdpMediaLightbox.tsx` and `VdpMediaLightboxContent.tsx` consolidated or renamed under `media`
- `VdpTourMode.tsx` renamed to `MediaTour.tsx`
- `ListingGallery.tsx` audited for overlap and removed if redundant

### Listing Components

Listing components present listing data but should avoid owning global behavior.

Subcategories:

- `cards`: listing cards and feed cards.
- `badges`: status indicators derived from listing data.
- `results`: browse/search/filter/result-list patterns.
- `detail`: listing detail sections and related listings.

Current candidates:

- `ListingCard.tsx` moves from `components/` to `components/listing/cards`.
- `FeedCards.tsx` splits into `ListingFeedCard`, `SponsoredSellerCard`, and `MarketplaceNoticeCard`.
- `ListingGrid.tsx` moves into `components/listing/results`.
- `ListingFilterBar.tsx` becomes `FilterPanel.tsx`.
- `BuyerLocationControls.tsx` becomes feature-owned `BuyerLocationPanel.tsx` or `LocationPanel.tsx`.
- `ActiveListingFilterChips.tsx` becomes `ActiveFilterChips.tsx`.
- `NoResultsRelaxation.tsx` stays with results.
- `SimilarListingsRail.tsx`, `NewArrivalsRail.tsx`, `RecentlyViewedRail.tsx` should share one `ListingRail` pattern.

### Feature Components

Feature components are allowed to import stores, contexts, API wrappers, routes, and hooks.

Move these out of generic component folders:

- `FavoriteButton.tsx` to `features/favorites`
- `CompareBar.tsx` to `features/compare`
- `SavedSearchesPanel.tsx` to `features/savedSearches`
- `LeadInquiryForm.tsx` to `features/leadCapture`
- `ShareListingButton.tsx` to `features/sharing`
- `ReportListingModal.tsx` to `features/reporting`
- `LoginModal.tsx` to `features/auth`
- `ListingDetailEngagement.tsx` split across `features/sharing`, `features/reporting`, and `listing/detail`

---

## Naming Conventions

### Domain Language

Use category-neutral names unless the component is strictly automotive:

- Prefer `Listing` over `Vehicle`
- Prefer `Seller` over `Dealer`
- Prefer `Detail` over `VDP`
- Avoid `Asset` in component names unless there is no clearer domain term. It can mean uploaded file, inventory item, financial asset, or listing payload.
- Use `Vehicle` only when props require automotive-only fields such as VIN, mileage, engine, drivetrain, or fuel economy

Examples:

- `VehicleFeedCard` -> `ListingFeedCard`
- `CoreHeaderSection` -> `DetailHeader`
- `CommerceSection` -> `PricingSection`
- `LocationSection` -> `SellerLocationSection`
- `VdpMediaGallery` -> `MediaGallery`
- `DealerBlock` -> `SellerBlock`

### Component Suffixes

Use suffixes consistently:

- `*Button`: a single action button
- `*Badge`: compact status indicator
- `*Card`: one bounded repeated object
- `*Panel`: a configurable control or information area
- `*Section`: a detail-page content block
- `*Rail`: horizontal list of related items
- `*Drawer`: temporary side panel
- `*Modal`: blocking overlay dialog
- `*Toolbar`: controls that act on a list or result set
- `*Layout`: structural arrangement with slots

Avoid vague names:

- `ContentSection` needs a more specific name, such as `DescriptionSection`.
- `CommerceSection` should become `PricingSection` or `PurchaseSection`.
- `CoreHeaderSection` should become `DetailHeader`.
- `ListingDetailEngagement` should be split; the name hides too much.

### File Names and Exports

- One public component per file.
- File name matches exported component name.
- Internal helpers stay in the same file only if they are not reused.
- Reused helpers move to `*.parts.tsx`, `*.utils.ts`, or the relevant `lib` module.
- Each folder gets an `index.ts` barrel for stable imports.
- Page imports should come from category barrels, not deep internal paths.

Example:

```typescript
import { ListingFeedCard, ResultsToolbar } from '../components/listing';
import { FavoriteButton } from '../features/favorites';
```

---

## Proposed Migration Map

### From `components/ui`

| Current | Destination | Notes |
| --- | --- | --- |
| `Badge.tsx` | `components/core/Badge.tsx` | Keep primitive. |
| `ConditionBadge.tsx` | `components/listing/badges/ConditionBadge.tsx` | Listing-specific. |
| `DealerBlock.tsx` | `components/seller/SellerBlock.tsx` | Rename dealer -> seller. |
| `EmptyState.tsx` | `components/core/EmptyState.tsx` | Keep primitive. |
| `ErrorState.tsx` | `components/core/ErrorState.tsx` | Keep primitive. |
| `ExternalLink.tsx` | `components/core/ExternalLink.tsx` | Keep primitive. |
| `FavoriteButton.tsx` | `features/favorites/FavoriteButton.tsx` | Stateful feature. |
| `FeedMediaCarousel.tsx` | `components/media/MediaCarousel.tsx` | Rename and generalize. |
| `LeadInquiryForm.tsx` | `features/leadCapture/LeadInquiryForm.tsx` | Stateful workflow. |
| `ListingGallery.tsx` | Audit, then merge into `components/media` or delete | Likely overlap. |
| `ListingGrid.tsx` | `components/listing/results/ListingGrid.tsx` | Results pattern. |
| `ListingImage.tsx` | `components/media/ListingImage.tsx` | Reusable media primitive. |
| `LoginModal.tsx` | `features/auth/LoginModal.tsx` | Auth workflow. |
| `NotFoundState.tsx` | `components/core/NotFoundState.tsx` | Keep with states. |
| `PageHeader.tsx` | `components/core/PageHeader.tsx` | Primitive page pattern. |
| `Pagination.tsx` | `components/core/Pagination.tsx` | Primitive control. |
| `SectionCard.tsx` | `components/core/SectionCard.tsx` | Move first; defer any `Panel` or `Card` rename. |
| `SkeletonBlock.tsx` | `components/core/SkeletonBlock.tsx` | Move first; defer consolidation. |
| `SkeletonGrid.tsx` | `components/core/SkeletonGrid.tsx` | Move first; later decide whether listing-specific skeletons belong in results. |
| `SpecGrid.tsx` | `components/core/SpecGrid.tsx` | Primitive display. |

### From `components/listings`

| Current | Destination | Notes |
| --- | --- | --- |
| `ActiveListingFilterChips.tsx` | `components/listing/results/ActiveFilterChips.tsx` | Shorter name inside listing folder. |
| `AvailabilityBadge.tsx` | `components/listing/badges/AvailabilityBadge.tsx` | Badge. |
| `BuyerLocationControls.tsx` | `features/location/BuyerLocationPanel.tsx` | Stateful user preference. |
| `CompareBar.tsx` | `features/compare/CompareBar.tsx` | Stateful feature. |
| `FulfillmentBadge.tsx` | `components/listing/badges/FulfillmentBadge.tsx` | Badge. |
| `GeoNoResultsRelaxation.tsx` | `features/location/GeoNoResultsRelaxation.tsx` | Location feature. |
| `ListingDetailEngagement.tsx` | Split | Share/report/action panels should not live together. |
| `ListingFilterBar.tsx` | `components/listing/results/FilterPanel.tsx` | Rename around role. |
| `NewArrivalBadge.tsx` | `components/listing/badges/NewArrivalBadge.tsx` | Badge. |
| `NewArrivalsRail.tsx` | `components/listing/results/ListingRail.tsx` + config | Reduce rail duplication. |
| `NoResultsRelaxation.tsx` | `components/listing/results/NoResultsRelaxation.tsx` | Results pattern. |
| `PriceDropBadge.tsx` | `components/listing/badges/PriceDropBadge.tsx` | Badge. |
| `QuickDetailDrawer.tsx` | `components/listing/detail/QuickDetailDrawer.tsx` | Detail preview pattern. |
| `RecentlyViewedRail.tsx` | `components/listing/results/ListingRail.tsx` + feature adapter | Reduce duplication. |
| `ReportListingModal.tsx` | `features/reporting/ReportListingModal.tsx` | Moderation/reporting workflow, not generic feedback. |
| `SavedSearchesPanel.tsx` | `features/savedSearches/SavedSearchesPanel.tsx` | Stateful feature. |
| `ShareListingButton.tsx` | `features/sharing/ShareListingButton.tsx` | Stateful feature. |
| `SimilarListingsRail.tsx` | `components/listing/detail/SimilarListingsRail.tsx` | Detail related content. |
| `StickyListingActionPanel.tsx` | `components/listing/detail/StickyActionPanel.tsx` | Detail action pattern. |

### From `components/vdp`

| Current | Destination | Notes |
| --- | --- | --- |
| `AvailabilitySection.tsx` | `components/listing/detail/AvailabilitySection.tsx` | Listing detail section. |
| `ClassificationSection.tsx` | `components/listing/detail/ClassificationSection.tsx` | Keep until category-neutral spec renderer exists. |
| `ColorsSection.tsx` | `components/listing/detail/ColorsSection.tsx` | Auto-specific if color schema remains vehicle-only. |
| `CommerceSection.tsx` | `components/listing/detail/PricingSection.tsx` | Rename. |
| `ConditionHistorySection.tsx` | `components/listing/detail/ConditionHistorySection.tsx` | Auto-specific if history fields remain vehicle-only. |
| `ContentSection.tsx` | `components/listing/detail/DescriptionSection.tsx` | Rename. |
| `CoreHeaderSection.tsx` | `components/listing/detail/DetailHeader.tsx` | Rename. |
| `EfficiencySection.tsx` | `components/listing/detail/EfficiencySection.tsx` | Auto-specific. |
| `EngineSection.tsx` | `components/listing/detail/EngineSection.tsx` | Auto-specific. |
| `FeaturesSection.tsx` | `components/listing/detail/FeaturesSection.tsx` | Could become generic feature/spec list. |
| `FulfillmentSection.tsx` | `components/listing/detail/FulfillmentSection.tsx` | Detail section, not badge. |
| `LocationSection.tsx` | `components/listing/detail/SellerLocationSection.tsx` | Rename dealer/location semantics. |
| `MediaSection.tsx` | `components/listing/detail/MediaSection.tsx` | Thin wrapper over `components/media`. |
| `WarrantySection.tsx` | `components/listing/detail/WarrantySection.tsx` | Detail section. |
| `gallery/*` | `components/media/*` | Remove `Vdp` prefix. |
| `specRows.ts` | `components/listing/detail/specRows.ts` or `features/listingSpecs` | Keep data mapping near detail sections. |

---

## Migration Phases

### Phase 0 — Freeze the Pattern

Deliverables:

- Add this roadmap.
- Add a short `apps/marketplace/src/components/README.md` explaining folder boundaries.
- Decide final destination folder names before large moves.
- Stop adding new files to `components/ui`, `components/listings`, and `components/vdp` except urgent fixes.

Acceptance criteria:

- New component PRs can point to the README and know where a file belongs.
- Any new feature component has an owning `features/*` folder.

### Phase 1 — Create Barrels and Compatibility Exports

Deliverables:

- Create destination folders and `index.ts` barrels.
- Add compatibility shims aggressively so imports can move gradually:

```typescript
export { Badge } from '../core/Badge';
```

- Move a small low-risk set first without renaming: `Badge`, `EmptyState`, `ErrorState`, `PageHeader`, `SpecGrid`, `SkeletonBlock`, `SkeletonGrid`, `SectionCard`.
- Keep old paths as temporary re-export files.

Acceptance criteria:

- Pages can import from `components/core` without behavior changes.
- Typecheck passes after each batch.
- Existing deep imports continue to work until a later cleanup phase removes shims.

### Phase 2 — Extract Listing Badges

Deliverables:

- Move all listing badges into `components/listing/badges`.
- Use compatibility shims from old paths.
- Do not touch card, gallery, or detail behavior yet.

Acceptance criteria:

- All badge imports come from `components/listing/badges` or `components/listing`.
- No badge remains in `ui` or root `listings`.

### Phase 3 — Move Listing Result Components

Deliverables:

- Move `ListingGrid`, filter chips, no-results, result toolbar/panel pieces, and location result states into `components/listing/results` or the owning feature folder.
- Keep names stable unless a rename is required to avoid ambiguity.
- Keep compatibility shims in old paths.

Acceptance criteria:

- The browse page imports results primitives from one barrel.
- Location-specific behavior is owned by `features/location`.
- Result layout changes are minimal or nonexistent.

### Phase 4 — Consolidate Cards and Rails

Deliverables:

- Move `ListingCard` and `FeedCards` into `components/listing/cards`.
- Split `FeedCards.tsx` into smaller files:
  - `ListingFeedCard.tsx`
  - `SponsoredSellerCard.tsx`
  - `MarketplaceNoticeCard.tsx`
- Create one `ListingRail` primitive used by new arrivals, recently viewed, and similar listings where possible.

Acceptance criteria:

- One canonical card API exists for grid/list/favorites.
- Rail implementations share layout and item rendering.
- Favorites, browse, and detail-related listings no longer drift visually.

### Phase 5 — Move Stateful Workflows Into Features

Deliverables:

- Move favorites, compare, saved searches, lead capture, report listing, share listing, and auth modal into feature folders.
- Put feature tests beside feature UI and logic.
- Export feature UI through feature barrels.

Acceptance criteria:

- `components/core`, `components/media`, and most `components/listing` files do not import global stores or API clients.
- Feature folders contain both behavior and UI for the workflow they own.

### Phase 6 — De-VDP the Detail System

Deliverables:

- Rename `vdp` concepts to `listing/detail`.
- Move media gallery internals into `components/media`.
- Rename `Vdp*` components to `Media*` or `Detail*`.
- Replace vehicle-only aria/copy in shared components.

Acceptance criteria:

- No shared component name starts with `Vdp`.
- Automotive-only components are explicitly marked by name or folder.
- Generic marketplaces can reuse detail media and section layout without vehicle vocabulary.

### Phase 7 — Enforce Boundaries

Deliverables:

- Add a boundary check similar to existing marketplace boundary checks.
- Add lint or script rules that prevent imports from deprecated folders.
- Add `DEPRECATED.md` or comments to old shims with removal dates.

Acceptance criteria:

- CI fails if new code imports from retired folders after migration.
- No old folder contains implementation files, only temporary shims or nothing.

---

## Best First Commit Sequence

Keep the first commits intentionally boring:

1. `marketplace: introduce component system folders and core barrels`
2. `marketplace: move core primitives behind compatibility shims`
3. `marketplace: move listing badges into listing component layer`
4. `marketplace: move listing result components into results layer`

This sequence creates visible progress without touching the risky detail, gallery, card, or workflow behavior first.

---

## Import Boundary Rules

Allowed dependencies:

```text
pages -> features, components, hooks, lib
features -> components, hooks, lib, contexts
components/listing -> components/core, components/media, lib display helpers
components/media -> components/core
components/layout -> components/core, contexts/routes only when shell-level
components/core -> design tokens/CSS/React only
```

Disallowed dependencies:

```text
components/core -> features
components/core -> contexts
components/core -> lib/api
components/media -> listing feature stores
components/listing/badges -> pages
components/listing/cards -> saved search / compare stores directly
features -> pages
```

When a reusable component needs behavior, pass it as props. When behavior is central to the feature, keep the component in `features/*`.

---

## Reuse Opportunities

### One Badge System

Create a shared badge primitive with variants:

- neutral
- success
- warning
- danger
- info
- promotional

Then implement listing badges as tiny adapters.

### One Card System

Define a canonical listing card contract:

```typescript
type ListingCardAction = {
  key: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  href?: string;
};
```

Cards should accept badges, media, facts, seller summary, and actions as slots. Feature buttons can be composed outside the card where possible.

### One Rail System

`NewArrivalsRail`, `RecentlyViewedRail`, and `SimilarListingsRail` should share:

- title/action header
- horizontal scroll behavior
- card sizing
- empty behavior
- tracking hook opt-in

### One Detail Section System

Replace many ad hoc section wrappers with:

- `DetailSection`
- `DetailHeader`
- `DetailSpecGrid`
- `DetailActionPanel`

The automotive sections can remain as data adapters that feed these primitives.

### One Media System

Unify feed carousel, detail mosaic, lightbox, and tour naming under `components/media`. Keep media transforms in `lib`.

---

## Review Checklist for Future Component PRs

- Does the file live in the correct layer: core, layout, media, listing, seller, feedback, or feature?
- Does the name describe role, not implementation history?
- Is the component category-neutral unless it truly cannot be?
- Could this reuse an existing badge, card, rail, panel, section, or media component?
- Does it import only from allowed layers?
- Is behavior passed as props when the component should be reusable?
- Is stateful feature logic kept with the feature?
- Does the test live next to the component or owning feature?
- Does the page import from a barrel instead of deep internal paths?

---

## Definition of Done

This roadmap is complete when:

- `components/ui` is gone or contains only temporary re-export shims.
- `components/vdp` is gone or renamed to `components/listing/detail`.
- `components/listings` is gone or replaced by `components/listing` with clear subfolders.
- Feature-owned UI lives with its feature logic.
- Browse, favorites, and detail pages reuse the same card, badge, rail, and media systems.
- New engineers can place a component correctly without reading five existing examples.
- Boundary checks prevent the old structure from growing back.
