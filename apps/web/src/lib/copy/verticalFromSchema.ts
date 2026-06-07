import type { CategorySchema } from '@auto-dealer/category-schemas';
import type { VerticalCopyAdapter } from './vertical.ts';

/** Map resolved org category schema → shell vertical copy adapter. */
export function verticalAdapterFromCategorySchema(schema: CategorySchema): VerticalCopyAdapter {
  return {
    id: schema.id.toLowerCase(),
    taskActionOverrides: {
      SOLD: schema.lifecycle.sold,
    },
    inventory: {
      refColumn: schema.copy.refColumn,
      titleColumn: schema.copy.titleColumn,
      searchPlaceholder: schema.copy.searchPlaceholder,
      invalidIdentifierLabel: schema.copy.invalidIdentifierLabel,
      canonicalRef: schema.asset.refLabel,
      canonicalId: schema.asset.idLabel,
      idFieldKey: schema.asset.idFieldKey,
    },
  };
}
