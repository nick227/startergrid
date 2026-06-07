import { operatorCopy, formatAssetLead } from './operator.ts';
import { genericVertical, automotiveVertical, type VerticalCopyAdapter } from './vertical.ts';

export { operatorCopy, formatAssetLead };
export type { VerticalCopyAdapter };
export { genericVertical, automotiveVertical };

/** Active vertical adapter — swap per tenant when multi-vertical ships. Shell uses generic copy. */
export const activeVertical: VerticalCopyAdapter = genericVertical;

export function taskActionLabel(triggerKind: string): string {
  const k = triggerKind.toUpperCase();
  const override = activeVertical.taskActionOverrides[k];
  if (override) return override;

  if (k === 'SOLD') return operatorCopy.taskActions.delist;
  if (k === 'REMOVED') return operatorCopy.taskActions.remove;
  if (k === 'INITIAL_PUBLISH' || k === 'NEW') return operatorCopy.taskActions.publish;
  return operatorCopy.taskActions.update;
}
