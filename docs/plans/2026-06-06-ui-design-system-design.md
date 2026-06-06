# UI Design System — Company Palette & App Emphasis

**Created:** 2026-06-06  
**Status:** Phase 0–1 implemented (tokens + core primitives)  
**Scope:** Shared design tokens for `apps/marketplace` and `apps/web` (Operator Console)

---

## Decision summary

Use **one company palette** across both apps. Each app applies the **same colors with different emphasis** — not separate brands.

| App | Role | Emphasis |
|-----|------|----------|
| **Marketplace** | Consumer showroom | Bright, spacious, photo-forward, blue CTAs |
| **Operator Console** | Staff workflow tool | Dense, technical, navy chrome, orange action accents |

**Palette family:** navy · white · black · gray · silver · orange  
**Tone:** professional, dealership-friendly, SaaS-compatible, premium without luxury-only

---

## Company palette (canonical tokens)

All hex values are the single source of truth. Apps reference semantic names only — never ad-hoc Tailwind color classes in feature code.

### Core swatches

| Token | Hex | Role |
|-------|-----|------|
| `navy-950` | `#071321` | Deepest chrome (operator header, dealer picker backdrop) |
| `navy-900` | `#0F2744` | Primary chrome, nav bars, footer bands |
| `navy-800` | `#1A3A5C` | Hover on dark surfaces, active nav tint |
| `navy-700` | `#234E78` | Secondary dark UI, gradient stops |
| `navy-600` | `#2E6294` | Links on light backgrounds |
| `navy-500` | `#3B82C4` | Focus rings, selected borders |
| `blue-cta` | `#1D4ED8` | **Marketplace primary CTA** (buttons, key links) |
| `blue-cta-hover` | `#1E40AF` | CTA hover / pressed |
| `blue-cta-light` | `#EFF6FF` | CTA tint backgrounds, selected chips (marketplace) |
| `orange-600` | `#EA580C` | **Operator primary action**, highlights, promo badges |
| `orange-500` | `#F97316` | Operator CTA hover, active workflow step |
| `orange-100` | `#FFEDD5` | Warning-adjacent tint, operator callout backgrounds |
| `black` | `#0A0F14` | Primary text on light surfaces |
| `gray-900` | `#1E293B` | Headings, strong labels |
| `gray-700` | `#334155` | Body text |
| `gray-500` | `#64748B` | Secondary text, placeholders |
| `gray-400` | `#94A3B8` | Muted labels, disabled hint text |
| `silver-300` | `#CBD5E1` | Borders, dividers |
| `silver-200` | `#E2E8F0` | Subtle borders, table stripes |
| `silver-100` | `#F1F5F9` | Inset panels, filter backgrounds |
| `gray-50` | `#F8FAFC` | Page background (marketplace) |
| `gray-page` | `#F4F6F8` | Page background (operator — existing, kept) |
| `white` | `#FFFFFF` | Cards, inputs, modals |

### Semantic aliases (use these in components)

| Semantic | Maps to | Usage |
|----------|---------|--------|
| `color-chrome` | `navy-900` | Sticky headers, dealer picker gate |
| `color-chrome-deep` | `navy-950` | Full-viewport dark shells |
| `color-text-primary` | `black` / `gray-900` | Titles |
| `color-text-secondary` | `gray-700` | Body |
| `color-text-muted` | `gray-500` | Captions, meta |
| `color-border` | `silver-300` | Card and input borders |
| `color-border-subtle` | `silver-200` | Table rows, dividers |
| `color-surface-page` | app-specific | See app profiles below |
| `color-surface-card` | `white` | All elevated panels |
| `color-surface-inset` | `silver-100` | Filter bars, code blocks |
| `color-accent-marketplace` | `blue-cta` | Marketplace buttons, active filters |
| `color-accent-operator` | `orange-600` | Operator primary buttons, active workflow |
| `color-link` | `navy-600` | Inline links on light bg |
| `color-focus` | `navy-500` | Focus rings (both apps) |

### Status colors (shared — do not invent per app)

Replace scattered emerald/amber/sky usage in operator with palette-aligned semantics:

| Status | Background | Text / icon | Border |
|--------|------------|-------------|--------|
| Success / ready | `#ECFDF5` | `#047857` | `#A7F3D0` |
| Warning | `orange-100` | `#C2410C` | `#FDBA74` |
| Error / blocked | `#FEF2F2` | `#B91C1C` | `#FECACA` |
| Info / in-progress | `blue-cta-light` | `navy-700` | `#BFDBFE` |
| Neutral | `silver-100` | `gray-700` | `silver-200` |

Success stays green (industry convention for "ready") but is **not** a brand accent — it is semantic only.

---

## Shared foundations

### Typography

One type stack; apps differ in **scale and weight**, not font family.

| Role | Font | Notes |
|------|------|-------|
| UI sans | `Inter`, `system-ui`, sans-serif | All labels, buttons, tables |
| Display | Same family, tighter tracking | Marketplace hero titles only |
| Mono | `ui-monospace`, monospace | Dealer IDs, VIN fragments, sync timestamps |

**Do not** introduce a separate serif for marketplace — keeps SaaS/dealer neutral tone. KB doc reader keeps Georgia (content exception, unchanged).

### Radius

| Token | Value | Use |
|-------|-------|-----|
| `radius-sm` | `8px` | Chips, small badges |
| `radius-md` | `12px` | Inputs, compact cards (operator) |
| `radius-lg` | `16px` | Standard cards |
| `radius-xl` | `24px` | Marketplace vehicle cards, hero panels |
| `radius-pill` | `9999px` | Primary CTAs, filter pills |

### Elevation

| Token | Shadow | Use |
|-------|--------|-----|
| `shadow-1` | `0 1px 3px rgb(7 19 33 / 6%)` | Operator cards, tables |
| `shadow-2` | `0 4px 16px rgb(7 19 33 / 8%)` | Marketplace cards, dropdowns |
| `shadow-3` | `0 12px 40px rgb(7 19 33 / 12%)` | Modals, marketplace hover lift |
| `shadow-chrome` | `0 4px 24px rgb(7 19 33 / 18%)` | Sticky navy header |

### Spacing scale

Shared 4px grid. Apps pick different **default density**:

| Context | Marketplace | Operator |
|---------|-------------|----------|
| Page padding | `24px` / `32px` sm+ | `16px` / `24px` sm+ |
| Card padding | `20px`–`24px` | `12px`–`16px` |
| Section gap | `32px` | `16px`–`24px` |
| Control height | `44px` inputs, `48px` CTAs | `36px` inputs, `32px` buttons |

---

## How each app uses the palette

### Marketplace — retail / showroom emphasis

**Goal:** Feel open, trustworthy, and photo-first. Consumer should focus on vehicles, not UI chrome.

#### Surfaces

- **Page background:** `gray-50` — bright, clean showroom floor
- **Cards:** `white`, `radius-xl`, `shadow-2`; hover → `shadow-3` + subtle `navy-500` border tint
- **Header:** `white` with `backdrop-blur`, `silver-200` bottom border — **not** full navy bar (keeps retail brightness)
- **Logo / wordmark:** `navy-900` text; no orange in header

#### Photography & grid

- Vehicle images: `aspect-[4/3]`, `radius-lg` on image container, object-cover
- Grid: `gap-5` lg, generous whitespace between cards
- Detail hero: large gallery, optional `navy-950` gradient scrim behind first image only (not full dark page)

#### CTAs & interaction

- **Primary button:** `blue-cta` fill, white text, `radius-pill`, min-height `48px`
- **Secondary:** white fill, `silver-300` border, `gray-900` text
- **Links:** `navy-600`, underline on hover
- **Active filter chip:** `blue-cta-light` bg, `blue-cta` text, `navy-500` border
- **Orange:** promo badges only (`orange-600` on `orange-100`) — sparing accent, not primary CTA

#### Typography emphasis

- Listing title: `text-lg` / `font-semibold` / `gray-900`
- Price: `text-2xl` / `font-bold` / `black` — largest numeric element on card
- Meta (mileage, location): `text-sm` / `gray-500`

#### Components to standardize first

`PageShell`, `VehicleCard`, `FilterBar`, `VehicleGallery`, `SpecGrid`, `LeadInquiryForm`, `Pagination`, `EmptyState`

---

### Operator Console — operational / technical emphasis

**Goal:** Dense, scannable, workflow-driven. Staff need status at a glance; chrome stays out of the way.

#### Surfaces

- **Page background:** `gray-page` (`#F4F6F8`) — unchanged, already correct
- **Chrome header:** `navy-950` sticky, white text — **replace** current `slate-950` + emerald gradient tile
- **Logo tile:** `navy-800` → `navy-700` gradient (remove emerald/teal)
- **Cards:** `white`, `radius-md`, `shadow-1`, `silver-200` border — tighter than marketplace
- **Dealer picker gate:** `navy-950` full viewport, centered white card (`radius-xl`)

#### Density & data UI

- Default text: `text-sm`; section labels: `text-xs uppercase tracking-wider` / `gray-500`
- Tables: compact row height (`py-2`), mono for IDs/VIN columns
- Workflow strip: numbered circles — active `orange-600`, completed `gray-400`, pending `silver-300` ring
- Tab nav on dark header: inactive `gray-400`, active white pill on `navy-800`

#### CTAs & interaction

- **Primary button:** `orange-600` fill, white text, `radius-md`, size `sm` (`px-3 py-1.5 text-xs`)
- **Secondary:** `navy-800` on dark header context; on light cards use white + border
- **Destructive:** status error red (semantic table above)
- **Links / fix CTAs:** `navy-600` on light; `orange-500` on dark header
- **Blue:** info states and in-progress sync only — not primary buttons

#### Sync hero (special case)

Keep state-driven color **within status semantics** (success green, warning orange tint, error red, in-progress `blue-cta-light`). Hero banner gradient uses navy base + status overlay — not emerald/teal.

#### Components to standardize first

`Button`, `PageShell`, `SectionCard`, `FilterChips`, `SummaryStrip`, `StatusBadge`, `SyncHero`, `DataTable`, `InlineCallout`, `BulkActionBar`

---

## Side-by-side reference

| Element | Marketplace | Operator |
|---------|-------------|----------|
| Page bg | `gray-50` | `gray-page` |
| Header | White, light border | `navy-950`, sticky |
| Primary CTA | `blue-cta` pill, lg | `orange-600`, sm/md, md radius |
| Card radius | `xl` (24px) | `md` (12px) |
| Card shadow | `shadow-2` | `shadow-1` |
| Accent color | Blue (action) | Orange (action) |
| Orange use | Promo badges | Primary buttons, active workflow |
| Price / metrics | Large, consumer | Compact, tabular-nums |
| Default density | Spacious | Compact |
| Focus ring | `navy-500` | `navy-500` |

Both apps share: navy chrome family, silver borders, gray type scale, white cards, same status colors.

---

## Implementation architecture

### Phase 0 — Token package (no screen changes yet)

Add shared preset consumed by both Tailwind configs:

```
packages/design-tokens/
  colors.ts          # canonical hex + semantic map
  tailwind.preset.ts # theme.extend for Tailwind
  index.css          # CSS custom properties (--color-*)
```

Both `apps/web/tailwind.config.ts` and `apps/marketplace/tailwind.config.ts`:

```ts
import companyPreset from '../../packages/design-tokens/tailwind.preset';
export default { presets: [companyPreset], content: [...] };
```

Replace inline hex (`#f4f6f8`, `slate-*`, `emerald-*`, `blue-600`) with semantic utilities: `bg-surface-page`, `bg-chrome`, `text-muted`, `btn-primary-marketplace`, `btn-primary-operator`.

### Phase 1 — Primitive components

| Priority | Marketplace | Operator |
|----------|-------------|----------|
| P0 | `.mp-btn-primary` → token | `Button.tsx` → orange primary |
| P0 | `PageShell` header | `PageShell` navy chrome |
| P1 | `VehicleCard` elevation | `SectionCard`, `FilterChips` |
| P1 | `FilterBar` chips | `StatusBadge`, `statusRegistry` |
| P2 | Detail page layout | `SyncHero`, tables |

### Phase 2 — Screen polish

Marketplace: list → detail → dealer → lead form  
Operator: dealer picker → sync → inventory → accounts

### Phase 3 — Cleanup

- Remove emerald/teal brand usage from operator (keep green **only** for success status)
- Remove `blue-600` drift in operator `Button.tsx`
- Align `docs/ui-status.md` with this document
- Add Storybook or static token reference page (optional)

---

## Migration rules

1. **No new raw Tailwind palette classes** (`slate-`, `emerald-`, `blue-600`) in feature components after Phase 0 merges.
2. **Semantic status colors** from `statusRegistry` — update registry once, all badges follow.
3. **Marketplace `.mp-*` utilities** in `index.css` map to tokens; do not duplicate in JSX.
4. **KB doc reader** (`DocReaderSheet`) — update link/chip accents from emerald to `navy-600` / `blue-cta-light`; keep warm paper background.
5. **Accessibility:** all CTA pairs must meet WCAG AA contrast (blue-cta and orange-600 on white verified).

---

## Out of scope (this overhaul)

- Mobile native apps or bottom-tab navigation from inspiration mockups
- Dark mode marketplace theme
- Rebrand / rename "Vehicle Marketplace"
- New marketplace features (favorites, brand carousel, budget cards) — layout tokens only unless separately scoped

---

## Success criteria

- [ ] Single `packages/design-tokens` preset; both apps import it
- [ ] Zero emerald/teal brand usage in operator chrome
- [ ] Marketplace primary buttons use `blue-cta`; operator primary buttons use `orange-600`
- [ ] Shared status colors via `statusRegistry`
- [ ] `docs/ui-status.md` reflects navy/orange/blue emphasis split
- [ ] Visual regression: marketplace feels brighter; operator feels denser — same family when viewed side-by-side

---

## Next step

Invoke implementation plan (`writing-plans` skill) for Phase 0 token package + Phase 1 primitive migration, starting with `Button`, `PageShell`, and CSS preset in both apps.
