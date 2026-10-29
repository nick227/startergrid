import { usePageMeta } from '../../hooks/usePageMeta.ts';
import { PageShell } from '../../components/layout/PageShell.tsx';
import { useCategorySchema } from '../../contexts/CategoryContext.tsx';
import { DynamicTemplateRenderer } from '../../components/home/DynamicTemplateRenderer.tsx';
import { getCategoryComposition } from '../../config/marketplaceComposition.ts';

export function GenericHomeTemplate() {
  const schema = useCategorySchema();
  const composition = getCategoryComposition(schema.id);
  usePageMeta(`${schema.label} Marketplace`, `Find your next ${schema.label.toLowerCase()}`);

  return (
    <PageShell showCategoryNav={true}>
      <DynamicTemplateRenderer layout={composition.homeLayout} />
    </PageShell>
  );
}
