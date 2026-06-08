import { formatPrice, formatUsage } from '../../lib/display.ts';
import type { CompareItem } from './listingCompare.ts';
import { isListingFilterEnabled, type ListingFilterConfig } from './listingFilterConfig.ts';

export type CompareRow = {
  label: string;
  render: (item: CompareItem) => string;
};

export function buildCompareRows(config: ListingFilterConfig): CompareRow[] {
  const yearLabel = config.labels.year ?? 'Year';
  const usageLabel = config.labels.usage ?? 'Usage';

  const rows: CompareRow[] = [];

  if (isListingFilterEnabled(config, 'year')) {
    rows.push({ label: yearLabel, render: item => String(item.year) });
  }

  rows.push({ label: 'Price', render: item => formatPrice(item.priceCents) });

  if (isListingFilterEnabled(config, 'usage')) {
    rows.push({ label: usageLabel, render: item => formatUsage(item.mileage) });
  }

  return rows;
}
