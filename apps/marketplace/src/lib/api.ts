// Marketplace API wrapper.
// Only imports from @dealer-marketplace/client — never from operator APIs.

import {
  ApiError,
  MarketplaceService,
  type MarketplaceVehicleListResponse,
  type MarketplaceVehicleDetailResponse,
  type MarketplaceDealerIndexResponse,
} from '@dealer-marketplace/client';

export type { MarketplaceVehicleCard }    from '@dealer-marketplace/client';
export type { MarketplaceVehicleListResponse, MarketplaceVehicleDetailResponse, MarketplaceDealerIndexResponse };

export type ListFilters = {
  make?:      string;
  model?:     string;
  condition?: 'NEW' | 'USED' | 'CPO';
  page?:      number;
  pageSize?:  number;
};

function toMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const body = e.body as { error?: string } | undefined;
    return body?.error ?? e.message ?? 'Request failed';
  }
  if (e instanceof Error) return e.message;
  return 'Unknown error';
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw new Error(toMessage(e));
  }
}

export function fetchVehicles(filters: ListFilters = {}): Promise<MarketplaceVehicleListResponse> {
  return call(() => MarketplaceService.listMarketplaceVehicles({
    make:      filters.make,
    model:     filters.model,
    condition: filters.condition,
    page:      filters.page,
    pageSize:  filters.pageSize,
  }));
}

export function fetchVehicle(listingId: string): Promise<MarketplaceVehicleDetailResponse> {
  return call(() => MarketplaceService.getMarketplaceVehicle({ listingId }));
}

export function fetchDealer(dealerId: string): Promise<MarketplaceDealerIndexResponse> {
  return call(() => MarketplaceService.getMarketplaceDealerIndex({ dealerId }));
}

export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(priceCents / 100);
}

export function formatMileage(mileage: number): string {
  return new Intl.NumberFormat('en-US').format(mileage) + ' mi';
}

export function formatListedDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
