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

  // Developer / internal access to multi-category stubs
  if (slug === 'dev-categories' || slug === 'categories' || slug === 'index') {
    return { page: 'index' };
  }

  // Known multi-vertical category splash stubs (e.g. #/boats, #/homes)
  if (isKnownSplashSlug(slug)) {
    return { page: 'splash', slug };
  }

  // All other hashes (empty root, #/, #flagship, or in-page anchors like #getting-started)
  // map to the flagship automotive landing page.
  return { page: 'flagship' };
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
