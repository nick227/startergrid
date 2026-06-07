import { useMemo } from 'react';
import { resolveCategorySchema, type CategorySchema } from '@auto-dealer/category-schemas';
import { useAsyncQuery } from './useAsyncQuery.ts';
import { fetchDealers } from '@/lib/api/sdk.ts';

const PICKER_DEFAULT: CategorySchema = resolveCategorySchema('AUTOMOTIVE');

/** Resolve org businessCategory → CategorySchema after dealer pick. */
export function useDealerCategorySchema(dealerId: string | null): CategorySchema {
  const { data, loading } = useAsyncQuery(() => fetchDealers(), []);

  return useMemo(() => {
    if (!dealerId) return PICKER_DEFAULT;
    if (loading || !data) return PICKER_DEFAULT;
    const dealer = data.dealers.find(d => d.id === dealerId);
    return resolveCategorySchema(dealer?.businessCategory ?? 'AUTOMOTIVE');
  }, [dealerId, data, loading]);
}

export function useDealerCategoryId(dealerId: string | null): string | null {
  const schema = useDealerCategorySchema(dealerId);
  if (!dealerId) return null;
  return schema.id;
}
