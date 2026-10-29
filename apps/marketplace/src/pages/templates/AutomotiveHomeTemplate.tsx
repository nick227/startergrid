import { Suspense, lazy } from 'react';
import { usePageMeta } from '../../hooks/usePageMeta.ts';
import { PageShell } from '../../components/layout/PageShell.tsx';
import { HomeHeroSearch } from '../../components/home/HomeHeroSearch.tsx';
import { HomeBodyStyleGrid } from '../../components/home/HomeBodyStyleGrid.tsx';

// Below-the-fold components lazy loaded for better performance
const HomeFeaturedSpotlight = lazy(() => import('../../components/home/HomeFeaturedSpotlight.tsx').then(m => ({ default: m.HomeFeaturedSpotlight })));
const HomeEditorialCarousel = lazy(() => import('../../components/home/HomeEditorialCarousel.tsx').then(m => ({ default: m.HomeEditorialCarousel })));
const GenericTrendingBento = lazy(() => import('../../components/home/GenericTrendingBento.tsx').then(m => ({ default: m.GenericTrendingBento })));
const HomeBudgetExplorer = lazy(() => import('../../components/home/HomeBudgetExplorer.tsx').then(m => ({ default: m.HomeBudgetExplorer })));
const GenericDealsCarousel = lazy(() => import('../../components/home/GenericDealsCarousel.tsx').then(m => ({ default: m.GenericDealsCarousel })));
const HomeBuyingGuides = lazy(() => import('../../components/home/HomeBuyingGuides.tsx').then(m => ({ default: m.HomeBuyingGuides })));
const HomeInfiniteFeed = lazy(() => import('../../components/home/HomeInfiniteFeed.tsx').then(m => ({ default: m.HomeInfiniteFeed })));
const HomeFooter = lazy(() => import('../../components/home/HomeFooter.tsx').then(m => ({ default: m.HomeFooter })));

export function AutomotiveHomeTemplate() {
  usePageMeta('Automotive Marketplace', 'Find your perfect car. Search millions of listings.');

  return (
    <PageShell showCategoryNav={true}>
      {/* 1. Search fast */}
      <section className="bg-white">
        <div className="mp-rail py-6 sm:py-8">
          <HomeHeroSearch />
        </div>
      </section>

      <section className="border-b border-silver-200 bg-white">
        <div className="mp-rail py-6">
          <HomeBodyStyleGrid />
        </div>
      </section>

      <Suspense fallback={<div className="py-24 text-center text-silver-400">Loading automotive marketplace...</div>}>
        {/* 3. High-impact single feature (Spotlight) */}
        <section className="bg-white">
          <HomeFeaturedSpotlight />
        </section>

        {/* 4. Inspiring collections (Editorial) */}
        <section className="bg-navy-900 border-t border-navy-800">
          <HomeEditorialCarousel />
        </section>

        {/* 5. See real inventory (Trending Bento) */}
        <section className="bg-white">
          <GenericTrendingBento />
        </section>

        {/* 6. Practical utility (Budget Explorer) */}
        <section className="bg-surface-page border-y border-silver-200">
          <HomeBudgetExplorer />
        </section>

        {/* 7. Shop by deals */}
        <section className="bg-white">
          <GenericDealsCarousel />
        </section>

        {/* 8. Explore more (Infinite Feed) */}
        <section className="bg-white border-t border-silver-200">
          <HomeInfiniteFeed viewMode="grid" />
        </section>

        {/* 9. SEO & trust (Buying Guides) */}
        <section className="bg-surface-page">
          <HomeBuyingGuides />
        </section>

        <HomeFooter />
      </Suspense>
    </PageShell>
  );
}
