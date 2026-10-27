/**
 * Hash-based routing for apps/splash.
 *
 * Routes:
 *   #/                  → StarterGrid Flagship Automotive Platform (FlagshipSplashPage)
 *   #/dev-categories    → internal category index (IndexPage)
 *   #/<slug>            → legacy category splash page (SplashPage)
 */

import { isKnownSplashSlug, type SplashSlug } from './slugMap.ts';

export type SplashRoute =
  | { page: 'flagship' }
  | { page: 'index' }
  | { page: 'splash'; slug: SplashSlug }
  | { page: 'not-found'; slug: string };

export function parseRoute(): SplashRoute {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const slug = raw.trim().toLowerCase();

  // Root loads the flagship automotive platform landing page
  if (slug === '' || slug === '/' || slug === 'flagship') {
    return { page: 'flagship' };
  }

  // Developer / internal access to multi-category stubs
  if (slug === 'dev-categories' || slug === 'categories' || slug === 'index') {
    return { page: 'index' };
  }

  if (isKnownSplashSlug(slug)) {
    return { page: 'splash', slug };
  }

  return { page: 'not-found', slug };
}

export function flagshipHref(): string {
  return '#/';
}

export function categoriesHref(): string {
  return '#/dev-categories';
}

export function indexHref(): string {
  return '#/dev-categories';
}

export function splashHref(slug: SplashSlug): string {
  return `#/${slug}`;
}
