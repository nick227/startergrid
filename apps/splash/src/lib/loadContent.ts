/**
 * Dynamic content loader.
 * Attempts to import apps/splash/src/content/<fileKey>.ts.
 * Falls back to _placeholder if the file doesn't export a valid content object.
 */
import type { SplashContent } from '../types/content.ts';
import { SPLASH_SLUG_MAP, type SplashSlug } from './slugMap.ts';

// Eagerly import placeholder so it's always bundled
import { content as placeholderContent } from '../content/_placeholder.ts';

/**
 * Load the SplashContent for the given slug.
 * Uses Vite's dynamic import with a static import.meta.glob pattern so all
 * content files are included in the bundle without a round-trip request.
 */
const contentModules = import.meta.glob('../content/*.ts', { eager: true }) as Record<
  string,
  { content: SplashContent }
>;

export function loadContent(slug: SplashSlug): SplashContent {
  const fileKey = SPLASH_SLUG_MAP[slug];
  const modulePath = `../content/${fileKey}.ts`;
  const mod = contentModules[modulePath];
  if (mod?.content) return mod.content;
  return placeholderContent;
}
