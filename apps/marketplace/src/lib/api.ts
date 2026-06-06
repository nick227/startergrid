// Marketplace API wrapper.
// Only imports from @dealer-marketplace/client — never from operator APIs.

import {
  ApiError,
  MarketplaceService,
  type MarketplaceVehicleListResponse,
  type MarketplaceVehicleDetailResponse,
  type MarketplaceDealerIndexResponse,
  type MarketplaceLeadCaptureResponse,
} from '@dealer-marketplace/client';

export type { MarketplaceVehicleCard } from '@dealer-marketplace/client';
export type {
  MarketplaceVehicleListResponse,
  MarketplaceVehicleDetailResponse,
  MarketplaceDealerIndexResponse,
  MarketplaceLeadCaptureResponse,
};

export type LeadCaptureInput = {
  contactName?:  string;
  contactEmail?: string;
  contactPhone?: string;
  message?:      string;
};

export type ListFilters = {
  make?:      string;
  model?:     string;
  condition?: 'NEW' | 'USED' | 'CPO';
  page?:      number;
  pageSize?:  number;
};

export class FetchError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
  }
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof FetchError && error.status === 404;
}

function toFetchError(e: unknown): FetchError {
  if (e instanceof ApiError) {
    const body = e.body as { error?: string } | undefined;
    return new FetchError(body?.error ?? e.message ?? 'Request failed', e.status);
  }
  if (e instanceof Error) return new FetchError(e.message);
  return new FetchError('Unknown error');
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw toFetchError(e);
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

export function submitVehicleLead(
  listingId: string,
  input: LeadCaptureInput,
): Promise<MarketplaceLeadCaptureResponse> {
  return call(() => MarketplaceService.captureMarketplaceLead({
    listingId,
    requestBody: input,
  }));
}
