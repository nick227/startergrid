import { createContext, useContext, type ReactNode } from 'react';
import {
  resolveCategorySchema,
  type BusinessCategoryId,
  type CategorySchema,
} from '@auto-dealer/category-schemas';

export type CategoryTheme = {
  primaryColor: string;
};

type CategoryContextValue = {
  categoryId: BusinessCategoryId;
  slug: string;
  schema: CategorySchema;
  theme: CategoryTheme;
};

const CategoryContext = createContext<CategoryContextValue | null>(null);

type Props = {
  categoryId: BusinessCategoryId;
  slug: string;
  children: ReactNode;
};

export function CategoryProvider({ categoryId, slug, children }: Props) {
  const schema = resolveCategorySchema(categoryId);
  
  // Dummy theme generation based on schema id
  const theme: CategoryTheme = {
    primaryColor: categoryId === 'HEAVY_EQUIPMENT' ? '#16a34a' : '#1d4ed8' // green or blue
  };

  return (
    <CategoryContext.Provider value={{ categoryId, slug, schema, theme }}>
      {children}
    </CategoryContext.Provider>
  );
}

function useCategoryContext(): CategoryContextValue {
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

export function useCategoryTheme(): CategoryTheme {
  return useCategoryContext().theme;
}
