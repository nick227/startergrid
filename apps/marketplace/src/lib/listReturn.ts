import { listHref, type ListQuery } from './routes.ts';

const KEY = 'marketplace:listReturn';

export function saveListReturn(slug: string, query: ListQuery = {}): void {
  sessionStorage.setItem(KEY, listHref(slug, query));
}

export function getListReturn(slug: string): string {
  return sessionStorage.getItem(KEY) ?? listHref(slug);
}
