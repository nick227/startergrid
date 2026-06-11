import { CONDITION_LABEL, formatPrice, formatUsage } from '../../lib/display.ts';
import type { CompareItem } from './listingCompare.ts';
import { isListingFilterEnabled, type ListingFilterConfig } from './listingFilterConfig.ts';

export type CompareRow = {
  label: string;
  render: (item: CompareItem) => string;
};

const MIN_COMPARE_DATA_ROWS = 3;

function compareCell(value: string | number | undefined | null): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value.trim() ? value : '—';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '—';
}

export function countCompareDataRows(config: ListingFilterConfig): number {
  let count = 1;

  if (isListingFilterEnabled(config, 'brand')) count++;
  if (isListingFilterEnabled(config, 'model')) count++;
  if (isListingFilterEnabled(config, 'year')) count++;
  if (isListingFilterEnabled(config, 'usage')) count++;
  if (isListingFilterEnabled(config, 'condition')) count++;

  return count;
}

export function isCompareEnabled(config: ListingFilterConfig): boolean {
  return countCompareDataRows(config) >= MIN_COMPARE_DATA_ROWS;
}

export function buildCompareRows(config: ListingFilterConfig): CompareRow[] {
  const brandLabel = config.labels.brand ?? 'Brand';
  const modelLabel = config.labels.model ?? 'Model / Type';
  const yearLabel = config.labels.year ?? 'Year';
  const usageLabel = config.labels.usage ?? 'Usage';
  const conditionLabel = config.labels.condition ?? 'Condition';

  const rows: CompareRow[] = [];

  if (isListingFilterEnabled(config, 'brand')) {
    rows.push({ label: brandLabel, render: item => compareCell(item.brand) });
  }

  if (isListingFilterEnabled(config, 'model')) {
    rows.push({ label: modelLabel, render: item => compareCell(item.model) });
  }

  if (isListingFilterEnabled(config, 'year')) {
    rows.push({ label: yearLabel, render: item => compareCell(item.year) });
  }

  rows.push({ label: 'Price', render: item => formatPrice(item.priceCents) });

  if (isListingFilterEnabled(config, 'usage')) {
    rows.push({
      label: usageLabel,
      render: item => (
        item.mileage == null
          ? '—'
          : formatUsage(item.mileage, item.usageUnit)
      ),
    });
  }

  if (isListingFilterEnabled(config, 'condition')) {
    rows.push({
      label: conditionLabel,
      render: item => (item.condition ? CONDITION_LABEL[item.condition] : '—'),
    });
  }

  rows.push(
    { label: 'Seller', render: item => compareCell(item.sellerName) },
    { label: 'Location', render: item => compareCell(item.locationLabel) },
  );

  return rows;
}
