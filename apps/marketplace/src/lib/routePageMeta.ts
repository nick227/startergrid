import { categorySlugToId, resolveCategorySchema } from '@auto-dealer/category-schemas';
import type { MarketplaceRoute, ListQuery } from './routes.ts';

export type RoutePageMeta = {
  title: string;
  description?: string;
};

export function routePageMeta(route: MarketplaceRoute): RoutePageMeta {
  if (route.page === 'sites') {
    return {
      title: 'Marketplaces',
      description: 'Choose a category marketplace to browse listings.',
    };
  }

  if (route.page === 'redirect') {
    return {
      title: 'Marketplace',
      description: 'Browse listings from participating sellers.',
    };
  }

  const schema = schemaForSlug(route.slug);
  if (!schema) {
    return {
      title: 'Marketplace not found',
      description: 'That category site does not exist.',
    };
  }

  if (route.page === 'list') {
    return listRoutePageMeta(route.slug, route.query);
  }

  if (route.page === 'listing') {
    return {
      title: `${schema.asset.singular} details`,
      description: `View this ${schema.asset.singular.toLowerCase()} on the ${schema.label.toLowerCase()} marketplace.`,
    };
  }

  if (route.page === 'seller') {
    return {
      title: `${schema.label} seller`,
      description: `Browse this seller's ${schema.asset.plural.toLowerCase()} on the marketplace.`,
    };
  }

  if (route.page === 'favorites') {
    return {
      title: `Saved ${schema.asset.plural}`,
      description: `Your saved ${schema.asset.plural.toLowerCase()} on the ${schema.label.toLowerCase()} marketplace.`,
    };
  }

  return {
    title: 'Your profile',
    description: `Manage your ${schema.label.toLowerCase()} marketplace account and saved activity.`,
  };
}

export function listRoutePageMeta(slug: string, query: ListQuery = {}): RoutePageMeta {
  const schema = schemaForSlug(slug);
  if (!schema) {
    return {
      title: 'Marketplace',
      description: 'Browse listings from participating sellers.',
    };
  }

  const filters = listTitleParts(query);
  const noun = schema.asset.plural;
  const title = filters.length > 0
    ? `${filters.join(' ')} ${noun}`
    : `Browse ${noun}`;

  const description = filters.length > 0
    ? `Browse ${filters.join(' ').toLowerCase()} ${noun.toLowerCase()} on the ${schema.label.toLowerCase()} marketplace.`
    : schema.marketplace.tagline;

  return { title, description };
}

function schemaForSlug(slug: string) {
  const categoryId = categorySlugToId(slug);
  return categoryId ? resolveCategorySchema(categoryId) : null;
}

function listTitleParts(query: ListQuery): string[] {
  const parts: string[] = [];

  if (query.q) parts.push(`"${query.q}"`);
  if (query.condition) parts.push(conditionLabel(query.condition));
  if (query.make) parts.push(query.make);
  if (query.model) parts.push(query.model);
  if (query.sellerName) parts.push(query.sellerName);

  if (query.minYear && query.maxYear) parts.push(`${query.minYear}-${query.maxYear}`);
  else if (query.minYear) parts.push(`${query.minYear}+`);
  else if (query.maxYear) parts.push(`Through ${query.maxYear}`);

  if (query.maxPrice != null) parts.push(`under ${formatDollars(query.maxPrice)}`);
  else if (query.minPrice != null) parts.push(`from ${formatDollars(query.minPrice)}`);

  if (query.facets) {
    for (const value of Object.values(query.facets)) {
      if (value) parts.push(value);
    }
  }

  return parts;
}

function conditionLabel(condition: NonNullable<ListQuery['condition']>): string {
  if (condition === 'CPO') return 'Certified';
  return condition.charAt(0) + condition.slice(1).toLowerCase();
}

function formatDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}
