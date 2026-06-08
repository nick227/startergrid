import type { CategorySchema } from '@auto-dealer/category-schemas';

export type ListingFilterKey = 'brand' | 'model' | 'condition' | 'price' | 'usage';

export type ListingFilterLabels = {
  brand?: string;
  model?: string;
  usage?: string;
  condition?: string;
  price?: string;
};

export type ListingFilterConfig = {
  categorySlug: string;
  labels: ListingFilterLabels;
  enabledFilters: ListingFilterKey[];
};

const GENERIC_LABELS: Required<ListingFilterLabels> = {
  brand: 'Brand',
  model: 'Model / Type',
  usage: 'Usage',
  condition: 'Condition',
  price: 'Price',
};

function fieldLabel(schema: CategorySchema, key: string): string | undefined {
  return schema.fields.find(field => field.key === key)?.label;
}

function hasField(schema: CategorySchema, key: string): boolean {
  return schema.fields.some(field => field.key === key);
}

function resolveBrandLabel(schema: CategorySchema): string | undefined {
  if (!hasField(schema, 'make')) return undefined;
  const label = fieldLabel(schema, 'make');
  if (!label || label === 'Make') return GENERIC_LABELS.brand;
  return label;
}

function resolveModelLabel(schema: CategorySchema): string | undefined {
  if (!hasField(schema, 'model')) return undefined;
  const label = fieldLabel(schema, 'model');
  if (!label || label === 'Model') return GENERIC_LABELS.model;
  return label;
}

function resolveUsageLabel(schema: CategorySchema): string | undefined {
  if (!hasField(schema, 'mileage')) return undefined;
  const label = fieldLabel(schema, 'mileage');
  if (!label || label === 'Mileage') return GENERIC_LABELS.usage;
  return label;
}

export function buildListingFilterConfig(
  categorySlug: string,
  schema: CategorySchema,
): ListingFilterConfig {
  const enabledFilters: ListingFilterKey[] = [];

  if (resolveBrandLabel(schema)) enabledFilters.push('brand');
  if (resolveModelLabel(schema)) enabledFilters.push('model');
  if (hasField(schema, 'condition')) enabledFilters.push('condition');
  enabledFilters.push('price');
  if (resolveUsageLabel(schema)) enabledFilters.push('usage');

  return {
    categorySlug,
    labels: {
      brand: resolveBrandLabel(schema),
      model: resolveModelLabel(schema),
      usage: resolveUsageLabel(schema),
      condition: hasField(schema, 'condition') ? (fieldLabel(schema, 'condition') ?? GENERIC_LABELS.condition) : undefined,
      price: fieldLabel(schema, 'priceCents') ?? GENERIC_LABELS.price,
    },
    enabledFilters,
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
