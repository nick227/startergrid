import { useMemo } from 'react';
import { resolveCategorySchema, type CategorySchema } from '@auto-dealer/category-schemas';
import { useAsyncQuery } from './useAsyncQuery.ts';
import { fetchDealers } from '@/lib/api/sdk.ts';

// Used when no dealer is selected (DealerPicker is shown). Category doesn't
// matter here since the picker renders no category-specific UI.
const PICKER_DEFAULT: CategorySchema = resolveCategorySchema('AUTOMOTIVE');

/** Resolve org businessCategory → CategorySchema after dealer pick. */
export function useDealerCategorySchema(dealerId: string | null): CategorySchema {
  const { data } = useAsyncQuery(() => fetchDealers(), []);

  return useMemo(() => {
    if (!dealerId) return PICKER_DEFAULT;
    if (!data) {
      // Still loading — default to AUTOMOTIVE so platform filters and category-
      // aware UI work correctly during the fetch. The genericOperatorFallback
      // (id='WATCHES') would filter out all automotive platforms in any hook
      // that guards on categorySchema.id.
      return PICKER_DEFAULT;
    }
    const dealer = data.dealers.find(d => d.id === dealerId);
    return resolveCategorySchema(dealer?.businessCategory ?? 'AUTOMOTIVE');
  }, [dealerId, data]);
}

export function useDealerCategoryId(dealerId: string | null): string | null {
  const schema = useDealerCategorySchema(dealerId);
  if (!dealerId) return null;
  return schema.id;
}
