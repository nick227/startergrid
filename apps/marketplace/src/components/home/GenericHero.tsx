import { useCategorySchema, useCategorySlug } from '../../contexts/CategoryContext.tsx';
import { listHref } from '../../lib/routes.ts';

export function GenericHero() {
  const schema = useCategorySchema();
  const slug = useCategorySlug();

  return (
    <div className="bg-surface-page min-h-[50vh] py-16 flex items-center justify-center border-b border-silver-200">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-ink-heading tracking-tight mb-4">
          Welcome to the {schema.label} Marketplace
        </h1>
        <p className="text-xl text-ink-muted mb-12">
          Discover thousands of listings and find exactly what you're looking for.
        </p>
        
        <a
          href={listHref(slug)}
          className="inline-flex items-center justify-center bg-cta hover:bg-cta-hover text-white font-bold py-4 px-10 rounded-full transition shadow-elevation-1"
        >
          Start Browsing
        </a>
      </div>
    </div>
  );
}
