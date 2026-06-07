import type { PlatformProfileSeed } from '../lib/types.js';
import type { BusinessCategoryId } from '../../packages/category-schemas/src/types.js';

/** Non-automotive categories with rich placeholder schemas and platform stubs. */
export const NON_VEHICLE_PLATFORM_CATEGORIES = [
  'SONGS',
  'EBOOKS',
  'APPAREL',
  'DIGITAL_ART',
  'VIDEO_DISTRIBUTION',
  'PAWN',
] as const satisfies readonly BusinessCategoryId[];

export type NonVehiclePlatformCategory = (typeof NON_VEHICLE_PLATFORM_CATEGORIES)[number];

type StubInput = {
  slug: string;
  name: string;
  category: NonVehiclePlatformCategory;
  outputFormat: string;
  partnerPortalUrl: string;
  developerDocsUrl: string;
  notes: string;
  requiredVehicleFields: string[];
  sourceUrls?: string[];
};

function buildStub(input: StubInput): PlatformProfileSeed {
  return {
    slug: input.slug,
    name: input.name,
    kind: 'MARKETPLACE',
    integrationClass: 'ASSISTED',
    schemaVersion: `stub-2026.06-${input.category.toLowerCase()}-${input.slug}`,
    lastVerifiedAt: '2026-06-07T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: `Stub profile for ${input.name}. Category-specific identifiers stored in stockNumber/vin columns for validation.`,
    mockEndpoint: `mock://platform/${input.slug}`,
    integrationUrls: {
      partnerPortalUrl: input.partnerPortalUrl,
      developerDocsUrl: input.developerDocsUrl,
      notes: input.notes,
    },
    outputFormat: input.outputFormat,
    submissionMethods: ['MANUAL_REP', 'MOCK_API'],
    sourceUrls: input.sourceUrls ?? [input.developerDocsUrl],
    requiredDealershipFields: [
      'legalName', 'rooftopAddress.city', 'rooftopAddress.state', 'primaryContact.email',
    ],
    supportedCategories: [input.category],
    requiredVehicleFields: input.requiredVehicleFields,
    requiredMediaRules: { minImages: 1 },
    testFixtures: { validatesNonVehicleChannelStub: true, requiresDealerAccount: true },
  };
}

const STUB_DEFINITIONS: StubInput[] = [
  // ── Music / SONGS ─────────────────────────────────────────────────────────
  {
    slug: 'distrokid',
    name: 'DistroKid',
    category: 'SONGS',
    outputFormat: 'DISTROKID_RELEASE_PACKET',
    partnerPortalUrl: 'https://distrokid.com/',
    developerDocsUrl: 'https://distrokid.com/help/',
    notes: 'Assisted channel — UPC in stockNumber, ISRC in vin column.',
    requiredVehicleFields: ['stockNumber', 'vin', 'year', 'make', 'model', 'trim', 'priceCents', 'media[0].url'],
    sourceUrls: ['https://distrokid.com/'],
  },
  {
    slug: 'spotify-for-artists',
    name: 'Spotify for Artists',
    category: 'SONGS',
    outputFormat: 'SPOTIFY_ARTIST_CATALOG_PACKET',
    partnerPortalUrl: 'https://artists.spotify.com/',
    developerDocsUrl: 'https://artists.spotify.com/help/',
    notes: 'Assisted channel — release metadata validated before distributor handoff.',
    requiredVehicleFields: ['stockNumber', 'make', 'model', 'year', 'media[0].url'],
  },
  // ── E-books / EBOOKS ──────────────────────────────────────────────────────
  {
    slug: 'amazon-kdp',
    name: 'Amazon Kindle Direct Publishing',
    category: 'EBOOKS',
    outputFormat: 'KDP_TITLE_PACKET',
    partnerPortalUrl: 'https://kdp.amazon.com/',
    developerDocsUrl: 'https://kdp.amazon.com/en_US/help/topic/G200635650',
    notes: 'Assisted channel — ASIN in stockNumber, ISBN in vin column.',
    requiredVehicleFields: ['stockNumber', 'vin', 'make', 'model', 'trim', 'priceCents', 'media[0].url'],
    sourceUrls: ['https://kdp.amazon.com/'],
  },
  {
    slug: 'apple-books',
    name: 'Apple Books for Authors',
    category: 'EBOOKS',
    outputFormat: 'APPLE_BOOKS_TITLE_PACKET',
    partnerPortalUrl: 'https://authors.apple.com/',
    developerDocsUrl: 'https://authors.apple.com/support/',
    notes: 'Assisted channel — publisher onboarding required.',
    requiredVehicleFields: ['stockNumber', 'make', 'model', 'year', 'priceCents', 'media[0].url'],
  },
  // ── Apparel / APPAREL ───────────────────────────────────────────────────────
  {
    slug: 'shopify-catalog',
    name: 'Shopify Product Catalog',
    category: 'APPAREL',
    outputFormat: 'SHOPIFY_PRODUCT_FEED_JSON',
    partnerPortalUrl: 'https://www.shopify.com/',
    developerDocsUrl: 'https://shopify.dev/docs/api/admin-rest/latest/resources/product',
    notes: 'Feedable stub — SKU in stockNumber, barcode in vin column.',
    requiredVehicleFields: ['stockNumber', 'make', 'model', 'trim', 'priceCents', 'condition', 'exteriorColor', 'media[0].url'],
    sourceUrls: ['https://shopify.dev/docs/api/admin-rest/latest/resources/product'],
  },
  {
    slug: 'etsy',
    name: 'Etsy Seller Catalog',
    category: 'APPAREL',
    outputFormat: 'ETSY_LISTING_PACKET',
    partnerPortalUrl: 'https://www.etsy.com/sell',
    developerDocsUrl: 'https://developers.etsy.com/documentation/',
    notes: 'Assisted channel — shop setup required before listing activation.',
    requiredVehicleFields: ['stockNumber', 'make', 'model', 'trim', 'priceCents', 'condition', 'media[0].url'],
  },
  // ── Digital Art / DIGITAL_ART ───────────────────────────────────────────────
  {
    slug: 'opensea',
    name: 'OpenSea',
    category: 'DIGITAL_ART',
    outputFormat: 'OPENSEA_COLLECTION_PACKET',
    partnerPortalUrl: 'https://opensea.io/',
    developerDocsUrl: 'https://docs.opensea.io/',
    notes: 'Assisted channel — asset ID in stockNumber, edition in vin column.',
    requiredVehicleFields: ['stockNumber', 'vin', 'make', 'model', 'year', 'priceCents', 'media[0].url'],
    sourceUrls: ['https://docs.opensea.io/'],
  },
  {
    slug: 'artstation-marketplace',
    name: 'ArtStation Marketplace',
    category: 'DIGITAL_ART',
    outputFormat: 'ARTSTATION_ARTWORK_PACKET',
    partnerPortalUrl: 'https://www.artstation.com/marketplace',
    developerDocsUrl: 'https://www.artstation.com/about/FAQ',
    notes: 'Assisted channel — artist account required.',
    requiredVehicleFields: ['stockNumber', 'make', 'model', 'year', 'media[0].url'],
  },
  // ── Video / VIDEO_DISTRIBUTION ──────────────────────────────────────────────
  {
    slug: 'youtube-creator',
    name: 'YouTube Creator Studio',
    category: 'VIDEO_DISTRIBUTION',
    outputFormat: 'YOUTUBE_VIDEO_PACKET',
    partnerPortalUrl: 'https://studio.youtube.com/',
    developerDocsUrl: 'https://support.google.com/youtube/topic/9257498',
    notes: 'Assisted channel — video ID in stockNumber; no secondary identifier required.',
    requiredVehicleFields: ['stockNumber', 'make', 'model', 'year', 'media[0].url'],
    sourceUrls: ['https://support.google.com/youtube/topic/9257498'],
  },
  {
    slug: 'vimeo-ott',
    name: 'Vimeo OTT',
    category: 'VIDEO_DISTRIBUTION',
    outputFormat: 'VIMEO_OTT_TITLE_PACKET',
    partnerPortalUrl: 'https://vimeo.com/ott',
    developerDocsUrl: 'https://help.vimeo.com/hc/en-us/categories/200950527-Vimeo-OTT',
    notes: 'Assisted channel — creator onboarding required.',
    requiredVehicleFields: ['stockNumber', 'make', 'model', 'year', 'priceCents', 'media[0].url'],
  },
  // ── Pawn & Resale / PAWN ────────────────────────────────────────────────────
  {
    slug: 'ebay-resale',
    name: 'eBay Seller Hub',
    category: 'PAWN',
    outputFormat: 'EBAY_RESALE_LISTING_PACKET',
    partnerPortalUrl: 'https://www.ebay.com/sl/sell',
    developerDocsUrl: 'https://developer.ebay.com/api-docs/sell/inventory/overview.html',
    notes: 'Assisted channel — ticket # in stockNumber, serial in vin column.',
    requiredVehicleFields: ['stockNumber', 'make', 'model', 'priceCents', 'condition', 'media[0].url'],
    sourceUrls: ['https://developer.ebay.com/api-docs/sell/inventory/overview.html'],
  },
  {
    slug: 'mercari',
    name: 'Mercari Seller',
    category: 'PAWN',
    outputFormat: 'MERCARI_LISTING_PACKET',
    partnerPortalUrl: 'https://www.mercari.com/sell/',
    developerDocsUrl: 'https://www.mercari.com/us/help_center/',
    notes: 'Assisted channel — pre-owned item listings.',
    requiredVehicleFields: ['stockNumber', 'make', 'model', 'priceCents', 'condition', 'media[0].url'],
  },
];

export const nonVehiclePlatformStubs: PlatformProfileSeed[] = STUB_DEFINITIONS.map(buildStub);

export function nonVehiclePlatformsForCategory(
  category: NonVehiclePlatformCategory,
): PlatformProfileSeed[] {
  return nonVehiclePlatformStubs.filter(p => p.supportedCategories.includes(category));
}

export function nonVehiclePlatformSlugsForCategory(category: NonVehiclePlatformCategory): string[] {
  return nonVehiclePlatformsForCategory(category).map(p => p.slug);
}
