import { useAuth } from '@/contexts/AuthContext.tsx';
import { useMemo } from 'react';
import { resolveCategorySchema, type CategorySchema } from '@auto-dealer/category-schemas';
import { useAsyncQuery } from './useAsyncQuery.ts';
import { fetchDealers } from '@/lib/api/sdk.ts';

export type DealerCategoryState = {
  schema: CategorySchema | null;
  pending: boolean;
};

/**
 * Resolve the selected business category.
 * A selected dealer stays unresolved until its record loads — never an automotive stand-in.
 */
export function useDealerCategorySchema(dealerId: string | null): DealerCategoryState {
  const { user, authReady } = useAuth();
  const { data } = useAsyncQuery(() => authReady && user && !user.mustChangePassword
    ? fetchDealers() : Promise.resolve({ dealers: [] }), [authReady, user?.id, user?.mustChangePassword]);

  return useMemo(() => {
    if (!dealerId) return { schema: null, pending: false };
    if (!data) return { schema: null, pending: true };
    const dealer = data.dealers.find(d => d.id === dealerId);
    if (!dealer?.businessCategory) return { schema: null, pending: false };
    return { schema: resolveCategorySchema(dealer.businessCategory), pending: false };
  }, [dealerId, data]);
}

export function useDealerCategoryId(dealerId: string | null): string | null {
  const { schema, pending } = useDealerCategorySchema(dealerId);
  if (!dealerId || pending || !schema) return null;
  return schema.id;
}
