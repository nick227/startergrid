import { useCategorySchema } from '../../contexts/CategoryContext.tsx';
import {
  getFulfillmentSummary,
  hasFulfillmentDetailContent,
  shouldShowFulfillment,
} from '../../features/fulfillment/fulfillmentPolicy.ts';
import { SectionCard } from '../ui/SectionCard.tsx';
import { SpecGrid } from '../ui/SpecGrid.tsx';
import { hasSpecRows, specRows } from './specRows.ts';

export function FulfillmentSection() {
  const schema = useCategorySchema();

  if (!shouldShowFulfillment(schema) || !hasFulfillmentDetailContent(schema)) {
    return null;
  }

  const summary = getFulfillmentSummary(schema);
  if (!summary) return null;

  const rows = specRows([
    ['Method', summary.method],
    ['Timing', summary.timing],
    ['Cost', summary.cost],
  ]);

  return (
    <SectionCard title="Fulfillment">
      {hasSpecRows(rows) && <SpecGrid specs={rows} columns={1} />}
      {summary.message && (
        <p className={`text-sm leading-relaxed text-ink-muted${hasSpecRows(rows) ? ' mt-3' : ''}`}>
          {summary.message}
        </p>
      )}
    </SectionCard>
  );
}
