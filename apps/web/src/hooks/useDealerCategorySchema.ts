import { useMemo } from 'react';
import { resolveCategorySchema, type CategorySchema } from '@auto-dealer/category-schemas';
import { useAsyncQuery } from './useAsyncQuery.ts';
import { fetchDealers } from '@/lib/api/sdk.ts';

export function useDealerCategorySchema(dealerId: string | null): CategorySchema {
  const { data } = useAsyncQuery(() => fetchDealers(), []);

  return useMemo(() => {
    if (!dealerId || !data) return resolveCategorySchema('AUTOMOTIVE');
    const dealer = data.dealers.find(d => d.id === dealerId);
    return resolveCategorySchema(dealer?.businessCategory ?? 'AUTOMOTIVE');
  }, [dealerId, data]);
}
