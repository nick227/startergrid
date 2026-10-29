import type {
  MarketplaceVehicleCard,
  MarketplaceVehicleDetailResponse,
  MarketplaceCategoryItemCard,
  MarketplaceCategoryItemDetail,
} from './api.ts';
import type { CategorySchema, BusinessCategoryId } from '@auto-dealer/category-schemas';
import { categoryIdToSlug } from '@auto-dealer/category-schemas';
import { formatUsage, vehicleHeading } from './display.ts';
import { listingHref } from './routes.ts';

export type ListingSource = 'vehicle' | 'category_item';

export type ConsumerListingIdentity = {
  source: ListingSource;
  inventoryId: string;
  dealershipId: string;
  categoryId: string;
  publicationId: string | null;
};

export type ConsumerListingSpec = {
  label: string;
  value: string;
  highlight?: boolean;
};

export type ConsumerListingCard = {
  identity: ConsumerListingIdentity;
  listingId: string;
  categoryId: string;
  categorySlug: string;
  title: string;
  subtitle?: string | null;
  priceCents: number;
  originalPriceCents?: number | null;
  condition: string;
  mediaUrls: string[];
  sellerId: string;
  sellerName: string;
  sellerCity?: string | null;
  sellerState?: string | null;
  listingUrl: string;
  listedAt: string;
  availabilityStatus?: 'PENDING' | 'SOLD' | null;
  distanceMiles?: number | null;
  stockNumber?: string | null;
  primarySpec?: ConsumerListingSpec | null;
  specPills: ConsumerListingSpec[];
  // Preservation references
  rawVehicle?: MarketplaceVehicleCard;
  rawCategoryItem?: MarketplaceCategoryItemCard;
};

export type ConsumerListingDetail = {
  identity: ConsumerListingIdentity;
  listingId: string;
  categoryId: string;
  categorySlug: string;
  title: string;
  subtitle?: string | null;
  priceCents: number;
  originalPriceCents?: number | null;
  condition: string;
  mediaUrls: string[];
  sellerId: string;
  sellerName: string;
  sellerCity?: string | null;
  sellerState?: string | null;
  listingUrl: string;
  listedAt: string;
  stockNumber?: string | null;
  primaryIdentifier?: { label: string; value: string } | null;
  specs: ConsumerListingSpec[];
  specPills: ConsumerListingSpec[];
  description?: string | null;
  publisher?: string | null;
  author?: string | null;
  format?: string | null;
  isbn?: string | null;
  pageCount?: number | null;
  language?: string | null;
  data?: Record<string, any>;
  rawVehicleDetail?: MarketplaceVehicleDetailResponse;
  rawCategoryItemDetail?: MarketplaceCategoryItemDetail;
};

export function fromVehicleCard(
  card: MarketplaceVehicleCard,
  schema: CategorySchema,
  slug?: string,
): ConsumerListingCard {
  const isMarine = schema.id === 'BOATS';
  const usageUnit = card.usageUnit === 'hours' ? 'hours' : card.usageUnit === 'miles' ? 'miles' : isMarine ? 'hours' : 'miles';
  const title = vehicleHeading(card);
  const targetSlug = slug || categoryIdToSlug(schema.id as BusinessCategoryId);
  const specPills: ConsumerListingSpec[] = [];

  if (card.mileage > 0 || isMarine || schema.id === 'AUTOMOTIVE') {
    const usageLabel = schema.fields.find(f => f.key === 'mileage')?.label || (isMarine ? 'Hours' : 'Mileage');
    specPills.push({
      label: usageLabel,
      value: formatUsage(card.mileage, usageUnit),
    });
  }

  if (card.condition) {
    specPills.push({ label: 'Condition', value: card.condition });
  }

  return {
    identity: {
      source: 'vehicle',
      inventoryId: card.listingId,
      dealershipId: card.dealerId,
      categoryId: schema.id,
      publicationId: null,
    },
    listingId: card.listingId,
    categoryId: schema.id,
    categorySlug: targetSlug,
    title,
    subtitle: card.trim || null,
    priceCents: card.priceCents,
    originalPriceCents: card.originalPriceCents ?? null,
    condition: card.condition,
    mediaUrls: card.mediaUrls || [],
    sellerId: card.dealerId,
    sellerName: card.dealerName,
    sellerCity: card.dealerCity ?? null,
    sellerState: card.dealerState ?? null,
    listingUrl: listingHref(targetSlug, card.listingId, title),
    listedAt: card.listedAt,
    availabilityStatus: card.availabilityStatus ?? null,
    distanceMiles: card.distanceMiles ?? null,
    stockNumber: card.stockNumber,
    primarySpec: specPills[0] || null,
    specPills,
    rawVehicle: card,
  };
}

export function fromCategoryItemCard(
  card: MarketplaceCategoryItemCard,
  schema: CategorySchema,
  slug?: string,
): ConsumerListingCard {
  const targetSlug = slug || categoryIdToSlug((card.categoryId || schema.id) as BusinessCategoryId);
  const rawData = (card as any).data && typeof (card as any).data === 'object' ? (card as any).data : {};
  const isApparel = schema.id === 'APPAREL' || card.categoryId === 'APPAREL';
  const isMusic = schema.id === 'SONGS' || card.categoryId === 'SONGS';

  const brand = (card as any).brand || rawData.brand || null;
  const size = (card as any).size || rawData.size || null;
  const artist = (card as any).artist || rawData.artist || null;
  const material = (card as any).material || rawData.material || null;

  const title = card.title || rawData.title || (isApparel ? 'Apparel Item' : isMusic ? 'Music Release' : 'Untitled Item');
  const subtitle = card.author
    ? `By ${card.author}`
    : artist
    ? `By ${artist}`
    : brand
    ? `${brand}`
    : null;

  const specPills: ConsumerListingSpec[] = [];

  if (card.format) {
    specPills.push({ label: 'Format', value: card.format.toUpperCase() });
  }
  if (card.author) {
    specPills.push({ label: 'Author', value: card.author });
  }
  if (artist) {
    specPills.push({ label: 'Artist', value: String(artist) });
  }
  if (size) {
    specPills.push({ label: 'Size', value: String(size) });
  }
  if (brand) {
    specPills.push({ label: 'Brand', value: String(brand) });
  }
  if (material) {
    specPills.push({ label: 'Material', value: String(material) });
  }

  const defaultMedia = isApparel
    ? '/demo-assets/multi-entity-vintage.svg'
    : isMusic
    ? '/demo-assets/multi-entity-records.svg'
    : '/demo-assets/multi-entity-books.svg';

  const identity: ConsumerListingIdentity = {
    source: 'category_item',
    inventoryId: card.identity?.inventoryId || card.listingId,
    dealershipId: card.identity?.dealershipId || card.dealerId,
    categoryId: card.identity?.categoryId || card.categoryId || schema.id,
    publicationId: card.identity?.publicationId || null,
  };

  return {
    identity,
    listingId: card.listingId,
    categoryId: identity.categoryId,
    categorySlug: targetSlug,
    title,
    subtitle,
    priceCents: card.priceCents,
    originalPriceCents: null,
    condition: (card as any).condition || (isApparel ? 'VINTAGE' : 'NEW'),
    mediaUrls: card.mediaUrls?.length ? card.mediaUrls : [defaultMedia],
    sellerId: card.dealerId,
    sellerName: card.dealerName,
    sellerCity: card.dealerCity ?? null,
    sellerState: card.dealerState ?? null,
    listingUrl: listingHref(targetSlug, card.listingId, title),
    listedAt: card.listedAt,
    availabilityStatus: null,
    distanceMiles: null,
    stockNumber: card.stockNumber,
    primarySpec: specPills[0] || null,
    specPills,
    rawCategoryItem: card,
  };
}

export function fromCategoryItemDetail(
  detail: MarketplaceCategoryItemDetail,
  schema: CategorySchema,
  slug?: string,
): ConsumerListingDetail {
  const card = fromCategoryItemCard(detail, schema, slug);
  const rawData = detail.data && typeof detail.data === 'object' ? detail.data : {};
  const isApparel = schema.id === 'APPAREL' || detail.categoryId === 'APPAREL';
  const isMusic = schema.id === 'SONGS' || detail.categoryId === 'SONGS';

  const specs: ConsumerListingSpec[] = [];

  // Book specs
  if (detail.author) specs.push({ label: 'Author', value: detail.author });
  if (detail.publisher) specs.push({ label: 'Publisher', value: detail.publisher });
  if (detail.format) specs.push({ label: 'Format', value: detail.format.toUpperCase() });
  if (detail.isbn) specs.push({ label: 'ISBN', value: detail.isbn });
  if (detail.pageCount) specs.push({ label: 'Pages', value: String(detail.pageCount) });
  if (detail.language) specs.push({ label: 'Language', value: detail.language });

  // Apparel specs
  if (rawData.brand || (detail as any).brand) specs.push({ label: 'Brand', value: String(rawData.brand || (detail as any).brand) });
  if (rawData.size || (detail as any).size) specs.push({ label: 'Size', value: String(rawData.size || (detail as any).size) });
  if (rawData.material) specs.push({ label: 'Material', value: String(rawData.material) });
  if (rawData.color) specs.push({ label: 'Color', value: String(rawData.color) });
  if (rawData.era) specs.push({ label: 'Era', value: String(rawData.era) });
  if (rawData.conditionNotes) specs.push({ label: 'Condition Notes', value: String(rawData.conditionNotes) });

  // Music specs
  if (rawData.artist || (detail as any).artist) specs.push({ label: 'Artist', value: String(rawData.artist || (detail as any).artist) });
  if (rawData.isrc) specs.push({ label: 'ISRC', value: String(rawData.isrc) });
  if (rawData.duration) specs.push({ label: 'Duration', value: String(rawData.duration) });

  let primaryIdentifier = null;
  if (detail.isbn) {
    primaryIdentifier = { label: 'ISBN', value: detail.isbn };
  } else if (rawData.barcode || (detail as any).barcode) {
    primaryIdentifier = { label: 'Barcode', value: String(rawData.barcode || (detail as any).barcode) };
  } else if (rawData.isrc) {
    primaryIdentifier = { label: 'ISRC', value: String(rawData.isrc) };
  } else if (detail.stockNumber) {
    primaryIdentifier = { label: schema.asset.refLabel || 'SKU', value: detail.stockNumber };
  }

  const defaultDesc = isApparel
    ? `Retail garment available from ${detail.dealerName}.`
    : isMusic
    ? `Master recording release available from ${detail.dealerName}.`
    : `Digital publication available from ${detail.dealerName}.`;

  return {
    ...card,
    primaryIdentifier,
    specs,
    description: detail.data?.description || defaultDesc,
    publisher: detail.publisher ?? null,
    author: detail.author ?? null,
    format: detail.format ?? null,
    isbn: detail.isbn ?? null,
    pageCount: detail.pageCount ?? null,
    language: detail.language ?? null,
    data: detail.data,
    rawCategoryItemDetail: detail,
  };
}
