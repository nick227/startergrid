// Marketplace API wrapper.
// Only imports from @dealer-marketplace/client — never from operator APIs.

import {
  ApiError,
  MarketplaceService,
  MarketplaceAuthService,
  type MarketplaceFeedResponse,
  type MarketplaceVehicleListResponse,
  type MarketplaceVehicleDetailResponse,
  type MarketplaceDealerIndexResponse,
  type MarketplaceLeadCaptureResponse,
  type MarketplaceUserIdentity,
  type MarketplaceFavoritesResponse,
} from '@dealer-marketplace/client';

export type {
  MarketplaceVehicleCard,
  MarketplaceCardMediaItem,
  MarketplaceFeedResponse,
  MarketplaceFeedItem,
  MarketplaceVehicleListResponse,
  MarketplaceVehicleDetailResponse,
  MarketplaceDealerIndexResponse,
  MarketplaceLeadCaptureResponse,
  MarketplaceUserIdentity,
  MarketplaceFavoritesResponse,
  VehicleCore,
  VehicleCommerce,
  VehicleLocation,
  VehicleClassification,
  VehicleColors,
  VehicleEngine,
  VehicleEfficiency,
  VehicleConditionHistory,
  VehicleFeatures,
  VehicleWarranty,
  VehicleMedia,
  VehicleContent,
  MarketplaceListingPromotion,
  MarketplaceVehicleCtas,
} from '@dealer-marketplace/client';

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
  minPrice?:   number;
  maxPrice?:   number;
  maxMileage?: number;
  dealer?:     string;
  page?:      number;
  pageSize?:  number;
};

export type FeedFilters = Omit<ListFilters, 'page' | 'pageSize'> & {
  cursor?: string;
  limit?:  number;
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

export function fetchFeed(filters: FeedFilters = {}): Promise<MarketplaceFeedResponse> {
  return call(() => MarketplaceService.getMarketplaceFeed({
    cursor:     filters.cursor,
    limit:      filters.limit,
    make:       filters.make,
    model:      filters.model,
    condition:  filters.condition,
    minPrice:   filters.minPrice,
    maxPrice:   filters.maxPrice,
    maxMileage: filters.maxMileage,
    dealer:     filters.dealer,
  }));
}

export function fetchVehicles(filters: ListFilters = {}): Promise<MarketplaceVehicleListResponse> {
  return call(() => MarketplaceService.listMarketplaceVehicles({
    make:      filters.make,
    model:     filters.model,
    condition: filters.condition,
    minPrice:   filters.minPrice,
    maxPrice:   filters.maxPrice,
    maxMileage: filters.maxMileage,
    dealer:     filters.dealer,
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

export function fetchMe(): Promise<MarketplaceUserIdentity> {
  return call(() => MarketplaceAuthService.getMarketplaceMe());
}

export function login(email: string, password: string): Promise<MarketplaceUserIdentity> {
  return call(() => MarketplaceAuthService.marketplaceLogin({ requestBody: { email, password } }));
}

export function logout(): Promise<void> {
  return call(() => MarketplaceAuthService.marketplaceLogout().then(() => undefined));
}

export function fetchFavorites(): Promise<MarketplaceFavoritesResponse> {
  return call(() => MarketplaceAuthService.getMarketplaceFavorites());
}

export function addFavorite(listingId: string): Promise<void> {
  return call(() => MarketplaceAuthService.addMarketplaceFavorite({ listingId }).then(() => undefined));
}

export function removeFavorite(listingId: string): Promise<void> {
  return call(() => MarketplaceAuthService.removeMarketplaceFavorite({ listingId }).then(() => undefined));
}
