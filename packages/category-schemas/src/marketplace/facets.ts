import type { CategoryFieldDef, CategorySchema } from '../types.js';

export type MarketplaceFacetKind = 'enum' | 'boolean';

export type MarketplaceFacetDef = {
  key: string;
  label: string;
  kind: MarketplaceFacetKind;
  options: readonly { value: string; label: string }[];
  filterStorage:
    | { storage: 'column'; column: string }
    | { storage: 'categoryPayload'; payloadKey: string };
};

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
] as const;

function resolveFilterStorage(field: CategoryFieldDef): MarketplaceFacetDef['filterStorage'] {
  if (field.filterStorage?.storage === 'categoryPayload') {
    return {
      storage: 'categoryPayload',
      payloadKey: field.filterStorage.payloadKey,
    };
  }
  return { storage: 'column', column: field.key };
}

function isFacetField(field: CategoryFieldDef): boolean {
  if (field.marketplaceFilter) return false;
  if (field.kind === 'enum') {
    return Boolean(field.options && field.options.length >= 2);
  }
  return field.kind === 'boolean';
}

/**
 * Derives safe marketplace facet definitions from category schema fields.
 * Fails closed when no enum/boolean fields have known options.
 */
export function buildMarketplaceFacets(schema: CategorySchema): MarketplaceFacetDef[] {
  const facets: MarketplaceFacetDef[] = [];

  for (const field of schema.fields) {
    if (!isFacetField(field)) continue;

    facets.push({
      key: field.key,
      label: field.label,
      kind: field.kind === 'boolean' ? 'boolean' : 'enum',
      options: field.kind === 'boolean' ? BOOLEAN_OPTIONS : field.options!,
      filterStorage: resolveFilterStorage(field),
    });
  }

  return facets;
}

export function isValidMarketplaceFacetValue(
  facet: MarketplaceFacetDef,
  value: string,
): boolean {
  return facet.options.some(option => option.value === value);
}

export function sanitizeMarketplaceFacets(
  schema: CategorySchema,
  facets: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!facets) return undefined;

  const allowed = new Map(buildMarketplaceFacets(schema).map(facet => [facet.key, facet]));
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(facets)) {
    const facet = allowed.get(key);
    if (facet && isValidMarketplaceFacetValue(facet, value)) {
      out[key] = value;
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export function parseMarketplaceFacetsParam(
  raw: string | undefined,
): Record<string, string> | undefined {
  if (!raw?.trim()) return undefined;

  const out: Record<string, string> = {};
  for (const part of raw.split(',')) {
    const sep = part.indexOf(':');
    if (sep <= 0) continue;
    const key = decodeURIComponent(part.slice(0, sep).trim());
    const value = decodeURIComponent(part.slice(sep + 1).trim());
    if (key && value) out[key] = value;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export function serializeMarketplaceFacetsParam(
  facets: Record<string, string> | undefined,
): string | undefined {
  if (!facets) return undefined;

  const entries = Object.entries(facets).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return undefined;

  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}:${encodeURIComponent(value)}`)
    .join(',');
}
