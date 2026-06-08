import type { CategorySchema, FulfillmentPolicy } from '../types.js';

export type FulfillmentSummary = {
  method?: string;
  timing?: string;
  cost?: string;
  message?: string;
};

export function getFulfillmentPolicy(schema: CategorySchema): FulfillmentPolicy | undefined {
  return schema.fulfillmentPolicy;
}

export function getFulfillmentSummary(schema: CategorySchema): FulfillmentSummary | undefined {
  const policy = schema.fulfillmentPolicy;
  if (!policy) return undefined;
  return {
    method: policy.methodLabel,
    timing: policy.timingLabel,
    cost: policy.costLabel,
    message: policy.buyerMessage,
  };
}
