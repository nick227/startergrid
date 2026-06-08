// Marketplace API wrapper.
// Only imports from @dealer-marketplace/client — never from operator APIs.

import {
  ApiError,
  MarketplaceService,
  MarketplaceAuthService,
  MarketplaceBusinessCategory,
  type MarketplaceFeedResponse,
  type MarketplaceVehicleListResponse,
  type MarketplaceVehicleDetailResponse,
  type MarketplaceDealerIndexResponse,
  type MarketplaceLeadCaptureResponse,
  type MarketplaceListingReportRequest,
  type MarketplaceListingReportResponse,
  type MarketplaceUserIdentity,
  type MarketplaceFavoritesResponse,
  type MarketplaceSitesResponse,
} from '@dealer-marketplace/client';
import type { BusinessCategoryId } from '@auto-dealer/category-schemas';
import type { SortBy } from './routes.ts';

export type {
  MarketplaceVehicleCard,
  MarketplaceCardMediaItem,
  MarketplaceFeedResponse,
  MarketplaceFeedItem,
  MarketplaceVehicleListResponse,
  MarketplaceVehicleDetailResponse,
  MarketplaceDealerIndexResponse,
  MarketplaceLeadCaptureResponse,
  MarketplaceListingReportRequest,
  MarketplaceListingReportResponse,
  MarketplaceUserIdentity,
  MarketplaceFavoritesResponse,
  MarketplaceSitesResponse,
  MarketplaceSiteSummary,
  MarketplaceBusinessCategory,
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

export type CategoryScope = {
  category?: BusinessCategoryId;
};

function toApiCategory(category?: BusinessCategoryId): MarketplaceBusinessCategory | undefined {
  return category as MarketplaceBusinessCategory | undefined;
}

export type ListFilters = CategoryScope & {
  make?:      string;
  model?:     string;
  condition?: 'NEW' | 'USED' | 'CPO';
  minPrice?:   number;
  maxPrice?:   number;
  maxMileage?: number;
  minYear?:    number;
  maxYear?:    number;
  sortBy?:     SortBy;
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

export function fetchSites(): Promise<MarketplaceSitesResponse> {
  return call(() => MarketplaceService.listMarketplaceSites());
}

export function fetchFeed(filters: FeedFilters = {}): Promise<MarketplaceFeedResponse> {
  return call(() => MarketplaceService.getMarketplaceFeed({
    category:   toApiCategory(filters.category),
    cursor:     filters.cursor,
    limit:      filters.limit,
    make:       filters.make,
    model:      filters.model,
    condition:  filters.condition,
    minPrice:   filters.minPrice,
    maxPrice:   filters.maxPrice,
    maxMileage: filters.maxMileage,
    minYear:    filters.minYear,
    maxYear:    filters.maxYear,
    sortBy:     filters.sortBy,
    dealer:     filters.dealer,
  }));
}

export function fetchVehicles(filters: ListFilters = {}): Promise<MarketplaceVehicleListResponse> {
  return call(() => MarketplaceService.listMarketplaceVehicles({
    category:   toApiCategory(filters.category),
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

export function fetchVehicle(
  listingId: string,
  category?: BusinessCategoryId,
): Promise<MarketplaceVehicleDetailResponse> {
  return call(() => MarketplaceService.getMarketplaceVehicle({ listingId, category: toApiCategory(category) }));
}

export function fetchSeller(
  sellerId: string,
  category?: BusinessCategoryId,
): Promise<MarketplaceDealerIndexResponse> {
  return call(() => MarketplaceService.getMarketplaceSellerIndex({ sellerId, category: toApiCategory(category) }));
}

/** @deprecated Use fetchSeller */
export function fetchDealer(
  dealerId: string,
  category?: BusinessCategoryId,
): Promise<MarketplaceDealerIndexResponse> {
  return fetchSeller(dealerId, category);
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

export function fetchFavorites(
  category?: BusinessCategoryId,
): Promise<MarketplaceFavoritesResponse> {
  return call(() => MarketplaceAuthService.getMarketplaceFavorites({ category: toApiCategory(category) }));
}

export function addFavorite(
  listingId: string,
  category?: BusinessCategoryId,
): Promise<void> {
  return call(() => MarketplaceAuthService.addMarketplaceFavorite({ listingId, category: toApiCategory(category) }).then(() => undefined));
}

export function removeFavorite(listingId: string): Promise<void> {
  return call(() => MarketplaceAuthService.removeMarketplaceFavorite({ listingId }).then(() => undefined));
}

export function submitListingReport(
  listingId: string,
  body: MarketplaceListingReportRequest,
): Promise<MarketplaceListingReportResponse> {
  return call(() => MarketplaceService.reportMarketplaceListing({ listingId, requestBody: body }));
}
