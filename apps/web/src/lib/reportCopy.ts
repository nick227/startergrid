import type { ReportDefinition, ReportRangePreset } from '@/lib/reportsCatalog.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type CatalogCopy = {
  title: string;
  decision: string;
  primaryMetric: string;
};

export function reportCatalogCopy(def: ReportDefinition): CatalogCopy {
  return operatorCopy.reports.catalog[def.copyKey];
}

export function reportRangeLabel(range: ReportRangePreset): string {
  switch (range) {
    case '7d':
      return operatorCopy.reports.range7d;
    case '30d':
      return operatorCopy.reports.range30d;
    case '90d':
      return operatorCopy.reports.range90d;
    default:
      return operatorCopy.reports.rangeNow;
  }
}

export function reportCopyKey(def: ReportDefinition): keyof typeof operatorCopy.reports.catalog {
  return def.copyKey;
}
