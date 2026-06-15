import { usePageMeta } from '../../hooks/usePageMeta.ts';
import { PageShell } from '../../components/layout/PageShell.tsx';
import { useCategorySchema } from '../../contexts/CategoryContext.tsx';
import { DynamicTemplateRenderer } from '../../components/home/DynamicTemplateRenderer.tsx';

// A dynamic fallback layout that showcases the generic components
const GENERIC_TEMPLATE_LAYOUT = [
  'GenericHero',
  'GenericFeaturedSpotlight',
  'GenericTrendingBento',
  'GenericPriceExplorer',
  'GenericDealsCarousel',
  'HomeInfiniteFeed'
];

export function GenericHomeTemplate() {
  const schema = useCategorySchema();
  usePageMeta(`${schema.label} Marketplace`, `Find your next ${schema.label.toLowerCase()}`);

  return (
    <PageShell showCategoryNav={true}>
      <DynamicTemplateRenderer layout={GENERIC_TEMPLATE_LAYOUT} />
    </PageShell>
  );
}
