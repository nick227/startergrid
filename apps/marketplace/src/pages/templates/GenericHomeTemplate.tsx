import { usePageMeta } from '../../hooks/usePageMeta.ts';
import { PageShell } from '../../components/layout/PageShell.tsx';
import { useCategorySchema } from '../../contexts/CategoryContext.tsx';
import { listHref } from '../../lib/routes.ts';
import { HomeInfiniteFeed } from '../../components/home/HomeInfiniteFeed.tsx';

export function GenericHomeTemplate() {
  const schema = useCategorySchema();
  usePageMeta(`${schema.label} Marketplace`, `Find your next ${schema.label.toLowerCase()}`);

  return (
    <PageShell showCategoryNav={true}>
      <div className="bg-surface-page min-h-screen py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-ink-heading tracking-tight mb-4">
            Welcome to the {schema.label} Marketplace
          </h1>
          <p className="text-xl text-ink-muted mb-12">
            Discover thousands of listings and find exactly what you're looking for.
          </p>
          
          <a
            href={listHref(schema.slug)}
            className="inline-flex items-center justify-center bg-cta hover:bg-cta-hover text-white font-bold py-4 px-10 rounded-full transition shadow-elevation-1"
          >
            Start Browsing
          </a>
        </div>
      </div>

      <section className="bg-white border-t border-silver-200">
        <HomeInfiniteFeed viewMode="grid" />
      </section>
    </PageShell>
  );
}
