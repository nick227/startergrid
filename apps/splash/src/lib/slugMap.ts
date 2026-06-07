/**
 * Splash-specific URL slug map.
 *
 * The splash app uses audience-facing slugs (e.g. "vehicles", "boats")
 * that differ from the category-schema slugs ("automotive", "boats").
 * This map translates splash slugs → content file names.
 *
 * When adding a new category, add its splash slug here and create
 * the matching content file in src/content/<slug>.ts.
 */
export const SPLASH_SLUG_MAP: Record<string, string> = {
  // Splash slug        → content file key
  vehicles:              'vehicles',       // AUTOMOTIVE
  boats:                 'boats',          // BOATS
  homes:                 'homes',          // HOMES
  apartments:            'apartments',     // APARTMENTS
  songs:                 'songs',          // SONGS
  ebooks:                'ebooks',         // EBOOKS
  watches:               'watches',        // WATCHES
  sneakers:              'sneakers',       // SNEAKERS
  collectibles:          'collectibles',   // COLLECTIBLES
  apparel:               'apparel',        // APPAREL
  'vacation-rentals':    'vacation-rentals', // VACATION_RENTALS
  'commercial-property': 'commercial-property', // COMMERCIAL_PROPERTY
  trailers:              'trailers',       // TRAILERS_POWERSPORTS_RV
  'heavy-equipment':     'heavy-equipment', // HEAVY_EQUIPMENT
  furniture:             'furniture',      // FURNITURE
  video:                 'video',          // VIDEO_DISTRIBUTION
} as const;

export type SplashSlug = keyof typeof SPLASH_SLUG_MAP;

/** All known splash slugs in display order */
export const ALL_SPLASH_SLUGS = Object.keys(SPLASH_SLUG_MAP) as SplashSlug[];

/** Human-readable label + emoji per slug (for the index page) */
export const SLUG_META: Record<SplashSlug, { label: string; icon: string; live: boolean }> = {
  vehicles:              { label: 'Vehicles',            icon: '🚗', live: true },
  boats:                 { label: 'Boats',               icon: '⛵', live: true },
  homes:                 { label: 'Homes',               icon: '🏡', live: true },
  apartments:            { label: 'Apartments',          icon: '🏢', live: true },
  songs:                 { label: 'Music',               icon: '🎵', live: true },
  ebooks:                { label: 'eBooks',              icon: '📖', live: true },
  watches:               { label: 'Watches',             icon: '⌚', live: true },
  sneakers:              { label: 'Sneakers',            icon: '👟', live: true },
  collectibles:          { label: 'Collectibles',        icon: '🏆', live: true },
  apparel:               { label: 'Apparel',             icon: '👕', live: true },
  'vacation-rentals':    { label: 'Vacation Rentals',   icon: '🌴', live: true },
  'commercial-property': { label: 'Commercial Property', icon: '🏗️', live: true },
  trailers:              { label: 'Trailers & RV',       icon: '🚌', live: true },
  'heavy-equipment':     { label: 'Heavy Equipment',    icon: '🏗️', live: true },
  furniture:             { label: 'Furniture',           icon: '🛋️', live: true },
  video:                 { label: 'Video Distribution',  icon: '🎬', live: true },
};

export function isKnownSplashSlug(slug: string): slug is SplashSlug {
  return Object.prototype.hasOwnProperty.call(SPLASH_SLUG_MAP, slug);
}
