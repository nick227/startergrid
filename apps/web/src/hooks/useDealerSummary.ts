import { useMemo } from 'react';
import { fetchDealers } from '@/lib/api/sdk.ts';
import type { DealerSummary } from '@/lib/types.ts';
import { useDealersListInvalidation } from '@/lib/dealersListInvalidation.ts';
import { useAsyncQuery } from './useAsyncQuery.ts';

export function useDealerSummary(dealerId: string | null): DealerSummary | null {
  const { data, reload } = useAsyncQuery(() => fetchDealers(), []);
  useDealersListInvalidation(reload);

  return useMemo(() => {
    if (!dealerId || !data) return null;
    return data.dealers.find(dealer => dealer.id === dealerId) ?? null;
  }, [data, dealerId]);
}
