import { useMemo } from 'react';
import { resolveCategorySchema, genericOperatorFallback, type CategorySchema } from '@auto-dealer/category-schemas';
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
      // Dealer selected but list not yet loaded: show neutral generic labels
      // so non-automotive orgs never see "Stock #" / "VIN" during the fetch.
      return genericOperatorFallback;
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
