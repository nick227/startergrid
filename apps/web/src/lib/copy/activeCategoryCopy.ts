import type { CategorySchema } from '@auto-dealer/category-schemas';
import { operatorCopy } from './operator.ts';
import { genericVertical, type VerticalCopyAdapter } from './vertical.ts';
import { verticalAdapterFromCategorySchema } from './verticalFromSchema.ts';

let activeAdapter: VerticalCopyAdapter = genericVertical;

export function setActiveCategorySchema(schema: CategorySchema): void {
  activeAdapter = verticalAdapterFromCategorySchema(schema);
}

export function resetActiveCategoryCopy(): void {
  activeAdapter = genericVertical;
}

export function getActiveVerticalAdapter(): VerticalCopyAdapter {
  return activeAdapter;
}

export function inventoryLabels() {
  return activeAdapter.inventory;
}

export function taskActionLabel(triggerKind: string): string {
  const k = triggerKind.toUpperCase();
  const override = activeAdapter.taskActionOverrides[k];
  if (override) return override;

  if (k === 'SOLD') return operatorCopy.taskActions.delist;
  if (k === 'REMOVED') return operatorCopy.taskActions.remove;
  if (k === 'INITIAL_PUBLISH' || k === 'NEW') return operatorCopy.taskActions.publish;
  return operatorCopy.taskActions.update;
}
