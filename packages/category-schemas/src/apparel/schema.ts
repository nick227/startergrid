import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { apparelCopy } from './copy.en.js';
import { apparelFormatters } from './formatters.js';

export const apparelSchema: CategorySchema = {
  id: 'APPAREL',
  status: 'placeholder',
  lifecycleMode: 'physical_inventory',
  label: 'Apparel',
  copy: apparelCopy,
  asset: {
    singular: 'item',
    plural: 'items',
    refLabel: 'SKU',
    idLabel: 'Barcode',
    titleLabel: 'Item',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'SKU', kind: 'identifier' },
    { key: 'vin', label: 'Barcode', kind: 'identifier' },
    { key: 'make', label: 'Brand', kind: 'text', marketplaceFilter: 'brand' },
    { key: 'model', label: 'Style', kind: 'text', marketplaceFilter: 'model' },
    { key: 'trim', label: 'Size', kind: 'text' },
    { key: 'priceCents', label: 'Price', kind: 'currency', marketplaceFilter: 'price' },
    { key: 'condition', label: 'Condition', kind: 'text', marketplaceFilter: 'condition' },
    { key: 'exteriorColor', label: 'Color', kind: 'text' },
  ],
  lifecycle: { active: 'Active', sold: 'Sold', removed: 'Removed' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Sales pace', benchmarksLabel: 'Sales comparison' },
  formatters: apparelFormatters,
  marketplace: buildMarketplaceMeta('APPAREL', 'Apparel', {
    consumerEnabled: false,
    tagline: 'Browse apparel from participating sellers',
  }),
};

/** @deprecated use apparelSchema */
export const schema = apparelSchema;
