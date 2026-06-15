import { usePageMeta } from '../../hooks/usePageMeta.ts';
import { PageShell } from '../../components/layout/PageShell.tsx';
import { HomeHeroSearch } from '../../components/home/HomeHeroSearch.tsx';
import { HomeBodyStyleGrid } from '../../components/home/HomeBodyStyleGrid.tsx';
import { HomeFeaturedSpotlight } from '../../components/home/HomeFeaturedSpotlight.tsx';
import { HomeEditorialCarousel } from '../../components/home/HomeEditorialCarousel.tsx';
import { HomeTrendingBento } from '../../components/home/HomeTrendingBento.tsx';
import { HomeBudgetExplorer } from '../../components/home/HomeBudgetExplorer.tsx';
import { HomeDealsCarousel } from '../../components/home/HomeDealsCarousel.tsx';
import { HomeBuyingGuides } from '../../components/home/HomeBuyingGuides.tsx';
import { HomeSellTrade } from '../../components/home/HomeSellTrade.tsx';
import { HomeInfiniteFeed } from '../../components/home/HomeInfiniteFeed.tsx';
import { HomeFooter } from '../../components/home/HomeFooter.tsx';

export function AutomotiveHomeTemplate() {
  usePageMeta('Automotive Marketplace', 'Find your perfect car. Search millions of listings.');

  return (
    <PageShell showCategoryNav={true}>

      {/* 4. Get inspired (Editorial) */}
      <section className="bg-white">
        <HomeEditorialCarousel />
      </section>

      {/* 1. Search fast */}
      <section className="bg-white px-4 sm:px-6 lg:px-8 py-8 mx-auto max-w-7xl">
        <HomeHeroSearch />
      </section>

      {/* 8. Learn */}
      <section>
        <HomeBuyingGuides />
      </section>

      {/* 6. Shop by budget */}
      <section>
        <HomeBudgetExplorer />
      </section>

      {/* 3. See real inventory (Spotlight) */}
      <section className="bg-white">
        <HomeFeaturedSpotlight />
      </section>

      {/* 2. Browse visually */}
      <section className="bg-white">
        <HomeBodyStyleGrid />
      </section>

      {/* 5. See real inventory (Trending Bento) */}
      <section className="bg-white">
        <HomeTrendingBento />
      </section>

      {/* 7. Shop by deals */}
      <section className="bg-white">
        <HomeDealsCarousel />
      </section>

      {/* 8. Explore more (Infinite Feed) */}
      <section className="bg-white">
        <HomeInfiniteFeed viewMode="grid" />
      </section>

      {/* Footer / Popular Brands */}
      <HomeFooter />
    </PageShell>
  );
}
