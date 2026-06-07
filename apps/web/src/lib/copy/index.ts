export { operatorCopy, formatAssetLead } from './operator.ts';
export type { VerticalCopyAdapter } from './vertical.ts';
export { genericVertical, automotiveVertical } from './vertical.ts';
export { verticalAdapterFromCategorySchema } from './verticalFromSchema.ts';
export {
  getActiveVerticalAdapter,
  inventoryLabels,
  resetActiveCategoryCopy,
  setActiveCategorySchema,
  taskActionLabel,
} from './activeCategoryCopy.ts';
