import { SectionCard } from '../ui/SectionCard.tsx';
import { SpecGrid } from '../ui/SpecGrid.tsx';
import { hasSpecRows, specRows } from './specRows.ts';
import type { ConsumerListingDetail } from '../../lib/listingReadModel.ts';
import { useCategorySchema } from '../../contexts/CategoryContext.tsx';

type Props = {
  detail: ConsumerListingDetail;
};

export function PublicationSpecsSection({ detail }: Props) {
  const schema = useCategorySchema();
  const isApparel = schema.id === 'APPAREL' || detail.categoryId === 'APPAREL';
  const isMusic = schema.id === 'SONGS' || detail.categoryId === 'SONGS';

  const title = isApparel
    ? 'Garment Specifications'
    : isMusic
    ? 'Audio Release Details'
    : 'Publication Details';

  const rows = isApparel
    ? specRows([
        ...detail.specs.map(s => [s.label, s.value] as [string, string]),
        ['Ref / SKU', detail.stockNumber],
      ])
    : isMusic
    ? specRows([
        ...detail.specs.map(s => [s.label, s.value] as [string, string]),
        ['Ref / SKU', detail.stockNumber],
      ])
    : specRows([
        ['Author', detail.author],
        ['Publisher', detail.publisher],
        ['Format', detail.format ? detail.format.toUpperCase() : null],
        ['ISBN', detail.isbn],
        ['Length', detail.pageCount ? `${detail.pageCount} pages` : null],
        ['Language', detail.language || 'English'],
        ['Delivery', 'Instant digital access'],
        ['Ref / SKU', detail.stockNumber],
      ]);

  if (!hasSpecRows(rows)) return null;

  return (
    <SectionCard title={title}>
      <SpecGrid specs={rows} />
    </SectionCard>
  );
}
