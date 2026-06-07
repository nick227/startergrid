import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { CategorySchema } from '@auto-dealer/category-schemas';
import { resetActiveCategoryCopy, setActiveCategorySchema } from '@/lib/copy/activeCategoryCopy.ts';
import { verticalAdapterFromCategorySchema } from '@/lib/copy/verticalFromSchema.ts';

const CategoryContext = createContext<CategorySchema | null>(null);

export function CategoryProvider({
  schema,
  children,
}: {
  schema: CategorySchema;
  children: ReactNode;
}) {
  setActiveCategorySchema(schema);

  useEffect(() => {
    return () => resetActiveCategoryCopy();
  }, []);

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

export function useVerticalCopy() {
  return verticalAdapterFromCategorySchema(useCategorySchema());
}

export function useInventoryLabels() {
  return useVerticalCopy().inventory;
}
