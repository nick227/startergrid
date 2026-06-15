import { usePageMeta } from '../hooks/usePageMeta.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { listMarketplaceCategories } from '@auto-dealer/category-schemas';
import { categorySiteHref } from '../lib/routes.ts';

export default function SitesIndexPage() {
  usePageMeta('All Marketplaces', 'Discover products across all our specialized marketplaces.');
  
  const categories = listMarketplaceCategories();

  return (
    <PageShell showCategoryNav={false}>
      <div className="bg-surface-page min-h-screen py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-ink-heading tracking-tight mb-4">
              Explore Our Marketplaces
            </h1>
            <p className="text-xl text-ink-muted">
              Choose a category to start shopping.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <a
                key={category.marketplace.slug}
                href={categorySiteHref(category.marketplace.slug)}
                className="group bg-surface-card rounded-2xl p-6 shadow-elevation-1 border border-silver-200 hover:shadow-elevation-2 transition flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-silver-100 rounded-full flex items-center justify-center mb-4 text-2xl group-hover:bg-orange-100 transition-colors">
                  {/* We could add generic icons based on category type later */}
                  🏷️
                </div>
                <h2 className="text-2xl font-bold text-ink-heading mb-2 group-hover:text-cta transition-colors">
                  {category.label}
                </h2>
                <p className="text-ink-body font-medium">
                  {category.marketplace.tagline || `Browse our selection of ${category.label.toLowerCase()}`}
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
