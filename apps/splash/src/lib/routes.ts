/**
 * Hash-based routing for apps/splash.
 *
 * Routes:
 *   #/              → internal category index (IndexPage)
 *   #/<slug>        → category splash page (SplashPage)
 */

import { isKnownSplashSlug, type SplashSlug } from './slugMap.ts';

export type SplashRoute =
  | { page: 'index' }
  | { page: 'splash'; slug: SplashSlug }
  | { page: 'not-found'; slug: string };

export function parseRoute(): SplashRoute {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const slug = raw.trim().toLowerCase();

  if (slug === '' || slug === '/') return { page: 'index' };

  if (isKnownSplashSlug(slug)) return { page: 'splash', slug };

  return { page: 'not-found', slug };
}

export function splashHref(slug: SplashSlug): string {
  return `#/${slug}`;
}

export function indexHref(): string {
  return '#/';
}
