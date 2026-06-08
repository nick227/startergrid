import {
  getFulfillmentPolicy,
  getFulfillmentSummary as getSchemaFulfillmentSummary,
  type CategorySchema,
  type FulfillmentSummary,
} from '@auto-dealer/category-schemas';

export type { FulfillmentSummary };

export function getFulfillmentSummary(schema: CategorySchema): FulfillmentSummary | undefined {
  return getSchemaFulfillmentSummary(schema);
}

export function shouldShowFulfillment(schema: CategorySchema): boolean {
  return getFulfillmentPolicy(schema) != null;
}

export function getFulfillmentBadgeLabel(schema: CategorySchema): string | undefined {
  const label = getFulfillmentPolicy(schema)?.methodLabel?.trim();
  return label || undefined;
}

export function hasFulfillmentDetailContent(schema: CategorySchema): boolean {
  const summary = getFulfillmentSummary(schema);
  if (!summary) return false;
  return Boolean(summary.method || summary.timing || summary.cost || summary.message);
}
