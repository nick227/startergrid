import { listHref, type ListQuery } from './routes.ts';

const KEY = 'marketplace:listReturn';

export function saveListReturn(query: ListQuery = {}): void {
  sessionStorage.setItem(KEY, listHref(query));
}

export function getListReturn(): string {
  return sessionStorage.getItem(KEY) ?? listHref();
}
