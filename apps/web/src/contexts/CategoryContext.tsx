import { createContext, useContext, type ReactNode } from 'react';
import type { CategorySchema } from '@auto-dealer/category-schemas';

const CategoryContext = createContext<CategorySchema | null>(null);

export function CategoryProvider({
  schema,
  children,
}: {
  schema: CategorySchema;
  children: ReactNode;
}) {
  return <CategoryContext.Provider value={schema}>{children}</CategoryContext.Provider>;
}

export function useCategorySchema(): CategorySchema {
  const schema = useContext(CategoryContext);
  if (!schema) throw new Error('useCategorySchema called outside CategoryProvider');
  return schema;
}

export function useCategoryCopy() {
  return useCategorySchema().copy;
}

export function useInventoryLabels() {
  const { copy, asset } = useCategorySchema();
  return {
    refColumn: copy.refColumn,
    titleColumn: copy.titleColumn,
    searchPlaceholder: copy.searchPlaceholder,
    invalidIdentifierLabel: copy.invalidIdentifierLabel,
    canonicalRef: asset.refLabel,
    canonicalId: asset.idLabel,
  };
}
