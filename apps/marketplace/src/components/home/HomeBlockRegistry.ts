import { lazy } from 'react';

export const HomeBlockRegistry: Record<string, React.ComponentType<any>> = {
  GenericHero: lazy(() => import('./GenericHero.tsx').then(m => ({ default: m.GenericHero }))),
  GenericTrendingBento: lazy(() => import('./GenericTrendingBento.tsx').then(m => ({ default: m.GenericTrendingBento }))),
  GenericDealsCarousel: lazy(() => import('./GenericDealsCarousel.tsx').then(m => ({ default: m.GenericDealsCarousel }))),
  GenericFeaturedSpotlight: lazy(() => import('./GenericFeaturedSpotlight.tsx').then(m => ({ default: m.GenericFeaturedSpotlight }))),
  GenericPriceExplorer: lazy(() => import('./GenericPriceExplorer.tsx').then(m => ({ default: m.GenericPriceExplorer }))),
  HomeInfiniteFeed: lazy(() => import('./HomeInfiniteFeed.tsx').then(m => ({ default: m.HomeInfiniteFeed }))),
  HomeHeroSearch: lazy(() => import('./HomeHeroSearch.tsx').then(m => ({ default: m.HomeHeroSearch })))
};
