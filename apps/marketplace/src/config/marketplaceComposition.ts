import type { BusinessCategoryId } from '@auto-dealer/category-schemas';
import { resolveCategorySchema, categorySlugToId } from '@auto-dealer/category-schemas';

export type MarketplaceDetailSectionId =
  | 'header'
  | 'media'
  | 'fulfillment'
  | 'classification'
  | 'publicationSpecs'
  | 'colors'
  | 'engine'
  | 'efficiency'
  | 'conditionHistory'
  | 'features'
  | 'warranty'
  | 'content'
  | 'inquiry'
  | 'similarListings';

export type CategoryMarketplaceComposition = {
  categoryId: BusinessCategoryId;
  slug: string;
  label: string;
  homeLayout: string[];
  detailSections: MarketplaceDetailSectionId[];
  isDigital: boolean;
  isVehicle: boolean;
  assetSingular: string;
  assetPlural: string;
  refLabel: string;
  idLabel: string;
  sellerLabel: string;
  inquiryTitle: string;
  inquiryPlaceholder: string;
};

// Specialized layouts per category archetype
const HOME_LAYOUTS: Partial<Record<string, string[]>> = {
  automotive: [
    'HomeHeroSearch',
    'GenericTrendingBento',
    'GenericFeaturedSpotlight',
    'GenericDealsCarousel',
    'GenericPriceExplorer',
    'HomeInfiniteFeed',
  ],
  boats: [
    'GenericHero',
    'GenericFeaturedSpotlight',
    'GenericTrendingBento',
    'GenericDealsCarousel',
    'HomeInfiniteFeed',
  ],
  ebooks: [
    'GenericHero',
    'GenericFeaturedSpotlight',
    'GenericTrendingBento',
    'GenericDealsCarousel',
    'HomeInfiniteFeed',
  ],
};

const DEFAULT_HOME_LAYOUT = [
  'GenericHero',
  'GenericFeaturedSpotlight',
  'GenericTrendingBento',
  'GenericPriceExplorer',
  'GenericDealsCarousel',
  'HomeInfiniteFeed',
];

export function getCategoryComposition(
  categoryOrSlug: string,
): CategoryMarketplaceComposition {
  const categoryId = (categorySlugToId(categoryOrSlug) || categoryOrSlug) as BusinessCategoryId;
  const schema = resolveCategorySchema(categoryId);
  const slug = schema.marketplace.slug;
  const isAuto = schema.id === 'AUTOMOTIVE';
  const isMarine = schema.id === 'BOATS';
  const isDigital = schema.lifecycleMode === 'digital_distribution';
  const isVehicle = schema.lifecycleMode === 'physical_inventory' && (isAuto || isMarine || schema.id === 'TRAILERS_POWERSPORTS_RV');

  let detailSections: MarketplaceDetailSectionId[];

  if (isDigital) {
    detailSections = [
      'header',
      'media',
      'fulfillment',
      'publicationSpecs',
      'content',
      'inquiry',
      'similarListings',
    ];
  } else if (isAuto) {
    detailSections = [
      'header',
      'media',
      'fulfillment',
      'classification',
      'colors',
      'engine',
      'efficiency',
      'conditionHistory',
      'features',
      'warranty',
      'content',
      'inquiry',
      'similarListings',
    ];
  } else if (schema.id === 'APPAREL') {
    // Physical retail category item (apparel)
    detailSections = [
      'header',
      'media',
      'fulfillment',
      'publicationSpecs',
      'conditionHistory',
      'features',
      'content',
      'inquiry',
      'similarListings',
    ];
  } else {
    // Other physical categories (e.g. boats, trailers, heavy equipment)
    detailSections = [
      'header',
      'media',
      'fulfillment',
      'classification',
      'colors',
      'conditionHistory',
      'features',
      'warranty',
      'content',
      'inquiry',
      'similarListings',
    ];
  }

  const homeLayout = HOME_LAYOUTS[slug] || DEFAULT_HOME_LAYOUT;

  const sellerLabel = isAuto
    ? 'Dealer'
    : schema.id === 'BOATS'
    ? 'Marine Dealer'
    : schema.id === 'EBOOKS'
    ? 'Publisher'
    : schema.id === 'APPAREL'
    ? 'Merchant'
    : schema.id === 'SONGS'
    ? 'Artist'
    : 'Seller';

  return {
    categoryId: schema.id as BusinessCategoryId,
    slug,
    label: schema.label,
    homeLayout,
    detailSections,
    isDigital,
    isVehicle,
    assetSingular: schema.asset.singular,
    assetPlural: schema.asset.plural,
    refLabel: schema.asset.refLabel || 'Ref #',
    idLabel: schema.asset.idLabel || 'Identifier',
    sellerLabel,
    inquiryTitle: `Contact ${sellerLabel.toLowerCase()}`,
    inquiryPlaceholder: `Send a basic inquiry about this ${schema.asset.singular} to the ${sellerLabel.toLowerCase()}. No account required.`,
  };
}
