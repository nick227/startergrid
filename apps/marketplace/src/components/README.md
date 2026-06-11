# Marketplace Component Boundaries

This component tree is being migrated toward a layered marketplace UI system. New components should use these folders instead of adding to the legacy `ui`, `listings`, or `vdp` folders.

## Folders

- `core`: low-level reusable UI primitives. No marketplace API, route, auth, category, listing, or feature-store imports.
- `layout`: page and application layout shells.
- `media`: reusable listing media presentation such as images, carousels, galleries, lightboxes, and tours.
- `listing`: listing presentation patterns, split into `badges`, `cards`, `results`, and `detail`.
- `seller`: seller/dealer presentation components.
- `feedback`: generic UI feedback such as toasts, alerts, and confirmations.

Stateful marketplace workflows belong under `features/*`, not `components/*`. Examples include auth, favorites, compare, lead capture, reporting, saved searches, and sharing.

## Migration Rule

During migration, old paths may remain as compatibility shims:

```ts
export { Badge } from '../core/Badge';
```

Prefer new imports from barrels for new work:

```ts
import { Badge, EmptyState } from '../components/core';
```

