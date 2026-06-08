import type { CategoryFieldDef, CategorySchema, MarketplaceFilterRole, MarketplaceFacetDef } from '@auto-dealer/category-schemas';
import { buildListingFacetConfig } from './listingFacetConfig.ts';

export type ListingFilterKey = 'brand' | 'model' | 'condition' | 'price' | 'usage' | 'year';

export type ListingFilterLabels = {
  brand?: string;
  model?: string;
  usage?: string;
  condition?: string;
  price?: string;
  year?: string;
};

export type ListingFilterConfig = {
  categorySlug: string;
  labels: ListingFilterLabels;
  enabledFilters: ListingFilterKey[];
  facets: MarketplaceFacetDef[];
};

export type ListingCardMetaLabels = {
  brand: string;
  model: string;
  year: string;
  usage?: string;
};

const GENERIC_LABELS: Required<ListingFilterLabels> = {
  brand: 'Brand',
  model: 'Model / Type',
  usage: 'Usage',
  condition: 'Condition',
  price: 'Price',
  year: 'Year',
};

const FILTER_ROLE_FALLBACK_KEY: Partial<Record<MarketplaceFilterRole, string>> = {
  brand: 'make',
  model: 'model',
  usage: 'mileage',
  year: 'year',
  condition: 'condition',
  price: 'priceCents',
};

const LISTING_FILTER_TO_ROLE: Record<ListingFilterKey, MarketplaceFilterRole> = {
  brand: 'brand',
  model: 'model',
  usage: 'usage',
  year: 'year',
  condition: 'condition',
  price: 'price',
};

function fieldLabel(schema: CategorySchema, key: string): string | undefined {
  return schema.fields.find(field => field.key === key)?.label;
}

function hasField(schema: CategorySchema, key: string): boolean {
  return schema.fields.some(field => field.key === key);
}

/**
 * Resolves the schema field for a marketplace filter role.
 * When multiple fields declare the same role, the first declared field wins.
 */
export function resolveMarketplaceFilterField(
  schema: CategorySchema,
  role: MarketplaceFilterRole,
): CategoryFieldDef | undefined {
  return schema.fields.find(field => field.marketplaceFilter === role);
}

function fieldByRole(schema: CategorySchema, role: MarketplaceFilterRole): CategoryFieldDef | undefined {
  return resolveMarketplaceFilterField(schema, role);
}

function normalizeDisplayLabel(role: MarketplaceFilterRole, label: string): string {
  if (role === 'brand' && label === 'Make') return GENERIC_LABELS.brand;
  if (role === 'model' && label === 'Model') return GENERIC_LABELS.model;
  if (role === 'usage' && label === 'Mileage') return GENERIC_LABELS.usage;
  return label;
}

function roleEnabled(schema: CategorySchema, role: MarketplaceFilterRole): boolean {
  if (fieldByRole(schema, role)) return true;
  const fallbackKey = FILTER_ROLE_FALLBACK_KEY[role];
  return fallbackKey ? hasField(schema, fallbackKey) : false;
}

function resolveRoleLabel(schema: CategorySchema, role: MarketplaceFilterRole): string | undefined {
  const explicit = fieldByRole(schema, role);
  if (explicit) return normalizeDisplayLabel(role, explicit.label);

  const fallbackKey = FILTER_ROLE_FALLBACK_KEY[role];
  if (!fallbackKey || !hasField(schema, fallbackKey)) return undefined;

  const label = fieldLabel(schema, fallbackKey);
  if (!label) return GENERIC_LABELS[role as ListingFilterKey] ?? label;
  return normalizeDisplayLabel(role, label);
}

export function buildListingFilterConfig(
  categorySlug: string,
  schema: CategorySchema,
): ListingFilterConfig {
  const enabledFilters: ListingFilterKey[] = [];

  for (const filter of Object.keys(LISTING_FILTER_TO_ROLE) as ListingFilterKey[]) {
    const role = LISTING_FILTER_TO_ROLE[filter];
    if (filter === 'price' || roleEnabled(schema, role)) {
      enabledFilters.push(filter);
    }
  }

  return {
    categorySlug,
    labels: {
      brand: resolveRoleLabel(schema, 'brand'),
      model: resolveRoleLabel(schema, 'model'),
      usage: resolveRoleLabel(schema, 'usage'),
      condition: resolveRoleLabel(schema, 'condition'),
      price: resolveRoleLabel(schema, 'price') ?? GENERIC_LABELS.price,
      year: resolveRoleLabel(schema, 'year'),
    },
    enabledFilters,
    facets: buildListingFacetConfig(schema).facets,
  };
}

export function buildListingCardMetaLabels(
  schema: CategorySchema,
  config: ListingFilterConfig,
): ListingCardMetaLabels {
  return {
    brand: config.labels.brand ?? GENERIC_LABELS.brand,
    model: config.labels.model ?? GENERIC_LABELS.model,
    year: config.labels.year ?? fieldLabel(schema, 'year') ?? GENERIC_LABELS.year,
    usage: config.labels.usage,
  };
}

export function isListingFilterEnabled(
  config: ListingFilterConfig,
  filter: ListingFilterKey,
): boolean {
  return config.enabledFilters.includes(filter);
}

export function listingSearchAriaLabel(): string {
  return 'Search listings';
}
