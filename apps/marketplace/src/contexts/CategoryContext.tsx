import { createContext, useContext, type ReactNode } from 'react';
import {
  resolveCategorySchema,
  type BusinessCategoryId,
  type CategorySchema,
} from '@auto-dealer/category-schemas';

type CategoryContextValue = {
  categoryId: BusinessCategoryId;
  slug: string;
  schema: CategorySchema;
};

const CategoryContext = createContext<CategoryContextValue | null>(null);

type Props = {
  categoryId: BusinessCategoryId;
  slug: string;
  children: ReactNode;
};

export function CategoryProvider({ categoryId, slug, children }: Props) {
  const schema = resolveCategorySchema(categoryId);
  return (
    <CategoryContext.Provider value={{ categoryId, slug, schema }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategoryContext(): CategoryContextValue {
  const value = useContext(CategoryContext);
  if (!value) throw new Error('useCategoryContext requires CategoryProvider');
  return value;
}

export function useCategorySchema(): CategorySchema {
  return useCategoryContext().schema;
}

export function useCategorySlug(): string {
  return useCategoryContext().slug;
}

export function useCategoryId(): BusinessCategoryId {
  return useCategoryContext().categoryId;
}

export function useOptionalCategoryContext(): CategoryContextValue | null {
  return useContext(CategoryContext);
}
