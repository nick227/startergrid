import { listHref } from './routes.ts';
import { toListQuery, type ListingQuery } from '../features/listings/listingQuery.ts';

const KEY = 'marketplace:listReturn';

export function saveListReturn(slug: string, query: ListingQuery = {}): void {
  sessionStorage.setItem(KEY, listHref(slug, toListQuery(query)));
}

export function getListReturn(slug: string): string {
  return sessionStorage.getItem(KEY) ?? listHref(slug);
}
